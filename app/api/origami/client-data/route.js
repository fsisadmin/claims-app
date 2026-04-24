import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function fetchAll(supabase, table, select, filters = {}, orderBy = null) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy, { ascending: false })
    for (const [key, val] of Object.entries(filters)) {
      if (key.endsWith('_in')) {
        const col = key.replace('_in', '')
        query = query.in(col, val)
      } else {
        query = query.eq(key, val)
      }
    }
    const { data, error } = await query
    if (error) throw error
    allRows = allRows.concat(data || [])
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return allRows
}

// Fast note count per claim (no body text)
async function fetchNoteCounts(supabase, claimIds) {
  if (claimIds.length === 0) return {}
  const PAGE_SIZE = 1000
  const counts = {}
  let from = 0
  while (true) {
    let query = supabase
      .from('origami_notes')
      .select('parent_id')
      .eq('parent_domain_id', 1)
      .in('parent_id', claimIds)
      .range(from, from + PAGE_SIZE - 1)
    const { data, error } = await query
    if (error) throw error
    for (const n of (data || [])) {
      counts[n.parent_id] = (counts[n.parent_id] || 0) + 1
    }
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return counts
}

export async function POST(request) {
  try {
    const { appClientId, origamiClientId, organizationId } = await request.json()
    if ((!appClientId && !origamiClientId) || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let origamiClientIds = []
    let origamiClient = null

    if (origamiClientId) {
      // Direct origami client ID provided (for unmapped clients)
      origamiClientIds = [origamiClientId]
      const { data } = await supabaseAdmin
        .from('origami_clients')
        .select('client_id, name, street1, city, state, postal_code, reference_number, primary_contact_name, primary_contact_email')
        .eq('client_id', origamiClientId)
        .single()
      origamiClient = data
    } else {
      // Look up via app client mapping
      const { data: clientMaps, error: mapError } = await supabaseAdmin
        .from('origami_client_map')
        .select('origami_client_id')
        .eq('app_client_id', appClientId)
        .eq('organization_id', organizationId)
        .eq('entity_type', 'client')

      if (mapError) throw mapError
      origamiClientIds = (clientMaps || []).map(m => m.origami_client_id)
    }

    if (origamiClientIds.length === 0) {
      return NextResponse.json({ claims: [], policies: [], incidents: [], hasOrigamiData: false })
    }

    // Step 1b: Get reference numbers from origami_clients to bridge to AMS
    const { data: origamiClientRows } = await supabaseAdmin
      .from('origami_clients')
      .select('client_id, reference_number, name')
      .in('client_id', origamiClientIds)
    const referenceNumbers = (origamiClientRows || [])
      .map(c => (c.reference_number || '').trim())
      .filter(Boolean)

    // Step 1c: Look up AMS customers by custno (reference_number)
    let amsCustomerIds = []
    let amsCustomers = []
    if (referenceNumbers.length > 0) {
      const custnoNumbers = referenceNumbers.map(r => parseInt(r, 10)).filter(n => !isNaN(n))
      if (custnoNumbers.length > 0) {
        const { data: custs } = await supabaseAdmin
          .from('ams_customer')
          .select('custid, custno, firmnamecust, lastname, firstname, addr1, city, state, zipcode, active')
          .in('custno', custnoNumbers)
        amsCustomers = custs || []
        amsCustomerIds = amsCustomers.map(c => c.custid)
      }
    }

    // Step 2: Fetch everything in parallel
    const [claims, rawPolicies, incidents, origamiLocations, amsPolicies] = await Promise.all([
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, report_date, status, loss_description, location_id, policy_id, tpa_claim_number, carrier_policy_number, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7, client_id, coverage_id',
        { client_id_in: origamiClientIds },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date, premium, status, client_id, major_coverage_id',
        { client_id_in: origamiClientIds },
        'expiration_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_incidents',
        'incident_id, incident_number, status, claimant, loss_date, report_date, loss_description, event_description, location_id, incident_type_id, accident_city, client_id',
        { client_id_in: origamiClientIds },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_locations',
        'location_id, description, display_code, street1, city, state_id, postal_code, client_id',
        { client_id_in: origamiClientIds }
      ),
      // AMS policies for the matching customers
      amsCustomerIds.length > 0 ? fetchAll(
        supabaseAdmin, 'ams_basicpolinfo',
        'polid, custid, polno, poltypelob, poltype, cocode, writingcocode, poleffdate, polexpdate, status, fulltermpremium, descriptionbpol, changeddate',
        { custid_in: amsCustomerIds }
      ) : Promise.resolve([]),
    ])

    // Build location lookup
    const origamiLocationLookup = {}
    origamiLocations.forEach(loc => { origamiLocationLookup[loc.location_id] = loc })

    // Step 3: Fetch SOV data, note counts, and AMS-related data in parallel
    const policyIds = rawPolicies.map(p => p.policy_id).filter(Boolean)
    const claimIds = claims.map(c => c.claim_id).filter(Boolean)

    // Dedupe AMS policies by polno (keep latest changeddate, exclude deleted)
    const amsByPolno = new Map()
    for (const p of (amsPolicies || [])) {
      if (p.status === 'D') continue
      const key = (p.polno || '').trim().toUpperCase()
      if (!key) continue
      const existing = amsByPolno.get(key)
      if (!existing || new Date(p.changeddate || 0) > new Date(existing.changeddate || 0)) {
        amsByPolno.set(key, p)
      }
    }
    const dedupedAmsPolicies = Array.from(amsByPolno.values())
    const amsPolIds = dedupedAmsPolicies.map(p => p.polid)

    // Collect all unique carrier codes (writingcocode primary, cocode fallback)
    const carrierCodes = [...new Set(
      dedupedAmsPolicies
        .flatMap(p => [p.writingcocode, p.cocode])
        .filter(Boolean)
        .map(c => c.trim())
    )]

    const [locationValues, noteCounts, amsLobs, amsCarriers] = await Promise.all([
      policyIds.length > 0
        ? fetchAll(
            supabaseAdmin, 'origami_location_values',
            'location_value_id, location_id, policy_id, description, building_value, contents_value, bi_value, other_value, total_insured_value, premium, occupancy, year_built, number_of_stories, number_of_units, square_footage',
            { policy_id_in: policyIds }
          )
        : Promise.resolve([]),
      fetchNoteCounts(supabaseAdmin, claimIds),
      // AMS LOBs for the policies
      amsPolIds.length > 0 ? fetchAll(
        supabaseAdmin, 'ams_lineofbusiness',
        'polid, lobid, lineofbus, plantype, effdate, expdate, description',
        { polid_in: amsPolIds }
      ) : Promise.resolve([]),
      // AMS carriers
      carrierCodes.length > 0 ? fetchAll(
        supabaseAdmin, 'ams_company',
        'cocode, name, type, naic',
        { cocode_in: carrierCodes }
      ) : Promise.resolve([]),
    ])

    // Build carrier lookup
    const carrierLookup = {}
    for (const c of amsCarriers) {
      carrierLookup[(c.cocode || '').trim()] = c
    }

    // Build LOB lookup per policy
    const lobsByPolid = {}
    for (const lob of amsLobs) {
      if (!lobsByPolid[lob.polid]) lobsByPolid[lob.polid] = []
      lobsByPolid[lob.polid].push(lob)
    }

    // Build AMS customer lookup by custid
    const amsCustomerById = {}
    for (const c of amsCustomers) amsCustomerById[c.custid] = c

    // Build SOV lookup (legacy origami SOV data)
    const sovByPolicy = {}
    locationValues.forEach(lv => {
      if (!sovByPolicy[lv.policy_id]) sovByPolicy[lv.policy_id] = []
      sovByPolicy[lv.policy_id].push(lv)
    })

    // Sort AMS policies by most recent expiration first
    dedupedAmsPolicies.sort((a, b) => new Date(b.polexpdate || 0) - new Date(a.polexpdate || 0))

    // Build AMS-first policies list in the same shape the UI expects
    // Use AMS polno as the bridge to map origami SOV data in via policy_number
    const origamiByPolicyNumber = {}
    rawPolicies.forEach(op => {
      const k = (op.policy_number || '').trim().toUpperCase()
      if (k) origamiByPolicyNumber[k] = op
    })

    const policies = dedupedAmsPolicies.map(ap => {
      const polnoKey = (ap.polno || '').trim().toUpperCase()
      const originalOrigami = origamiByPolicyNumber[polnoKey]
      const origamiPolicyId = originalOrigami?.policy_id || null

      // LOB info
      const lobs = lobsByPolid[ap.polid] || []
      const primaryLob = lobs[0] || null
      const lineOfBusiness = primaryLob?.lineofbus || ap.poltypelob || null

      // Carrier: writingcocode is the issuing carrier, cocode is the wholesaler
      const writingCarrier = carrierLookup[(ap.writingcocode || '').trim()] || null
      const brokerCarrier = carrierLookup[(ap.cocode || '').trim()] || null
      const carrierName = writingCarrier?.name?.trim() || brokerCarrier?.name?.trim() || null

      // Bring in legacy SOV if it exists for this policy_number via the bridge
      const sovLocations = origamiPolicyId ? (sovByPolicy[origamiPolicyId] || []) : []
      let locationValuesForPolicy = sovLocations
      if (locationValuesForPolicy.length === 0) {
        // Fall back to all client-level origami locations
        locationValuesForPolicy = origamiLocations
          .filter(loc => origamiClientIds.includes(loc.client_id))
          .map(loc => ({
            location_value_id: `client-ams-${ap.polid}-${loc.location_id}`,
            location_id: loc.location_id,
            policy_id: origamiPolicyId,
            description: loc.description || loc.street1 || `Location ${loc.location_id}`,
            building_value: null, contents_value: null, bi_value: null,
            other_value: null, total_insured_value: null, premium: null,
            occupancy: null, year_built: null, _from_client: true,
          }))
      }

      return {
        // Keep legacy shape
        policy_id: origamiPolicyId, // null if no origami match
        policy_number: ap.polno,
        description: ap.descriptionbpol || primaryLob?.description || lineOfBusiness || originalOrigami?.description || '',
        effective_date: ap.poleffdate,
        expiration_date: ap.polexpdate,
        premium: Number(ap.fulltermpremium) || 0,
        status: ap.status === 'A' ? 'Active' : ap.status === 'C' ? 'Cancelled' : ap.status,
        client_id: originalOrigami?.client_id || null,
        major_coverage_id: originalOrigami?.major_coverage_id || null,
        // AMS enrichment
        polid: ap.polid,
        carrier_name: carrierName,
        carrier_type: writingCarrier ? 'Carrier' : brokerCarrier ? 'Broker' : null,
        line_of_business: lineOfBusiness,
        source: 'ams',
        location_values: locationValuesForPolicy,
      }
    })

    // Also include any origami policies that don't have an AMS match (the 166 orphans)
    const amsPolnoSet = new Set(dedupedAmsPolicies.map(p => (p.polno || '').trim().toUpperCase()))
    for (const op of rawPolicies) {
      const k = (op.policy_number || '').trim().toUpperCase()
      if (k && !amsPolnoSet.has(k)) {
        const sovLocations = sovByPolicy[op.policy_id] || []
        let locationValuesForPolicy = sovLocations
        if (locationValuesForPolicy.length === 0) {
          locationValuesForPolicy = origamiLocations
            .filter(loc => loc.client_id === op.client_id)
            .map(loc => ({
              location_value_id: `client-${op.policy_id}-${loc.location_id}`,
              location_id: loc.location_id,
              policy_id: op.policy_id,
              description: loc.description || loc.street1 || `Location ${loc.location_id}`,
              building_value: null, contents_value: null, bi_value: null,
              other_value: null, total_insured_value: null, premium: null,
              occupancy: null, year_built: null, _from_client: true,
            }))
        }
        policies.push({
          ...op,
          polid: null,
          carrier_name: null,
          line_of_business: null,
          source: 'origami',
          location_values: locationValuesForPolicy,
        })
      }
    }

    // Build coverage lookup for claims: policy_number → line_of_business from AMS
    const polnoToLob = {}
    for (const p of dedupedAmsPolicies) {
      const lobs = lobsByPolid[p.polid] || []
      const lob = lobs[0]?.lineofbus || p.poltypelob || null
      polnoToLob[(p.polno || '').trim().toUpperCase()] = lob
    }

    // Legacy origami policy lookup (still used as fallback for coverage type)
    const policyLookup = {}
    rawPolicies.forEach(p => { policyLookup[p.policy_id] = p })

    const COVERAGE_MAP = { 20: 'APD', 40: 'GL', 50: 'Property', 60: 'WC' }

    function getCoverageType(claim) {
      // Try AMS lookup first via policy_id → policy_number → AMS LOB
      const op = policyLookup[claim.policy_id]
      if (op?.policy_number) {
        const lob = polnoToLob[op.policy_number.trim().toUpperCase()]
        if (lob) {
          const lobLower = lob.toLowerCase()
          if (lobLower.includes('general liability') || lobLower.includes('umbrella') || lobLower.includes('excess')) return 'GL'
          if (lobLower.includes('property') || lobLower.includes('package')) return 'Property'
          if (lobLower.includes('workers') || lobLower.includes('comp')) return 'WC'
          if (lobLower.includes('auto')) return 'Auto'
          return lob // fall through with raw label
        }
      }
      // Fall back to major_coverage_id
      if (op?.major_coverage_id && COVERAGE_MAP[op.major_coverage_id]) return COVERAGE_MAP[op.major_coverage_id]
      return null
    }

    const enrichedClaims = claims.map(c => {
      const totalPaid = [c.paid1, c.paid2, c.paid3, c.paid4, c.paid5, c.paid6, c.paid7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalReserved = [c.reserve1, c.reserve2, c.reserve3, c.reserve4, c.reserve5, c.reserve6, c.reserve7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalRecovery = [c.recovery1, c.recovery2, c.recovery3, c.recovery4, c.recovery5, c.recovery6, c.recovery7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      return {
        ...c,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_recovery: totalRecovery,
        total_incurred: totalPaid + totalReserved - totalRecovery,
        location_name: origamiLocationLookup[c.location_id]?.description || null,
        location_city: origamiLocationLookup[c.location_id]?.city || null,
        location_state: origamiLocationLookup[c.location_id]?.state_id != null ? String(origamiLocationLookup[c.location_id].state_id) : null,
        notes_count: noteCounts[c.claim_id] || 0,
        coverage_type: getCoverageType(c) || null,
      }
    })

    // Enrich incidents with location names
    const enrichedIncidents = incidents.map(inc => ({
      ...inc,
      location_name: origamiLocationLookup[inc.location_id]?.description || null,
      location_city: origamiLocationLookup[inc.location_id]?.city || null,
    }))

    return NextResponse.json({
      claims: enrichedClaims,
      policies,
      incidents: enrichedIncidents,
      origamiClientIds,
      origamiLocations: origamiLocations || [],
      client: origamiClient,
      hasOrigamiData: true,
    })
  } catch (error) {
    console.error('Client data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
