import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET-like: fetch claim + policy + location + client data, merge with any saved acord_form_data
export async function POST(request) {
  try {
    const { claimId, action, formData } = await request.json()
    if (!claimId) {
      return NextResponse.json({ error: 'Missing claimId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Save action
    if (action === 'save') {
      const { error } = await supabaseAdmin
        .from('origami_claims')
        .update({ acord_form_data: formData })
        .eq('claim_id', claimId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Load: fetch claim and build the form data (prefill + overrides from saved)
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from('origami_claims')
      .select('*')
      .eq('claim_id', claimId)
      .single()
    if (claimErr) throw claimErr

    // Fetch location
    let location = null
    if (claim.location_id) {
      const { data } = await supabaseAdmin
        .from('origami_locations')
        .select('location_id, description, street1, street2, city, state_id, postal_code, client_id')
        .eq('location_id', claim.location_id)
        .single()
      location = data
    }

    // Fetch origami policy by id to get policy_number for AMS bridge
    let origamiPolicy = null
    if (claim.policy_id) {
      const { data } = await supabaseAdmin
        .from('origami_policies')
        .select('policy_id, policy_number, description, effective_date, expiration_date, major_coverage_id')
        .eq('policy_id', claim.policy_id)
        .single()
      origamiPolicy = data
    }

    // Fetch origami client to get reference_number for AMS bridge
    let origamiClient = null
    if (claim.client_id) {
      const { data } = await supabaseAdmin
        .from('origami_clients')
        .select('client_id, name, street1, street2, city, state, postal_code, reference_number, primary_contact_name, primary_contact_email, primary_contact_phone')
        .eq('client_id', claim.client_id)
        .single()
      origamiClient = data
    }

    // Bridge to AMS customer
    let amsCustomer = null
    if (origamiClient?.reference_number) {
      const custno = parseInt(origamiClient.reference_number, 10)
      if (!isNaN(custno)) {
        const { data } = await supabaseAdmin
          .from('ams_customer')
          .select('custid, custno, firmnamecust, lastname, firstname, addr1, addr2, city, state, zipcode, fedidno, busfullphone, resfullphone, email, typeentity')
          .eq('custno', custno)
          .limit(1)
          .maybeSingle()
        amsCustomer = data
      }
    }

    // Bridge to AMS policy
    let amsPolicy = null
    let amsCarrier = null
    let amsLob = null
    if (origamiPolicy?.policy_number) {
      const { data: polData } = await supabaseAdmin
        .from('ams_basicpolinfo')
        .select('polid, polno, poltypelob, writingcocode, cocode, poleffdate, polexpdate, fulltermpremium, descriptionbpol, changeddate')
        .eq('polno', origamiPolicy.policy_number.trim())
        .order('changeddate', { ascending: false })
        .limit(1)
        .maybeSingle()
      amsPolicy = polData

      if (amsPolicy?.writingcocode) {
        const { data } = await supabaseAdmin
          .from('ams_company')
          .select('cocode, name, naic')
          .eq('cocode', amsPolicy.writingcocode.trim())
          .limit(1)
          .maybeSingle()
        amsCarrier = data
      }

      if (amsPolicy?.polid) {
        const { data } = await supabaseAdmin
          .from('ams_lineofbusiness')
          .select('polid, lineofbus, description, plantype')
          .eq('polid', amsPolicy.polid)
          .limit(1)
          .maybeSingle()
        amsLob = data
      }
    }

    // Build default form data (prefill)
    const insuredName = amsCustomer?.firmnamecust?.trim() ||
      [amsCustomer?.firstname, amsCustomer?.lastname].filter(Boolean).join(' ').trim() ||
      origamiClient?.name ||
      claim.claimant || ''

    const insuredAddr = amsCustomer?.addr1 || origamiClient?.street1 || ''
    const insuredCityStateZip = amsCustomer
      ? `${amsCustomer.city || ''}, ${amsCustomer.state || ''} ${amsCustomer.zipcode || ''}`.trim()
      : origamiClient
      ? `${origamiClient.city || ''}, ${origamiClient.state || ''} ${origamiClient.postal_code || ''}`.trim()
      : ''

    const lossLocationStreet = location?.street1 || claim.accident_street1 || ''
    const lossLocationCityStateZip = location
      ? `${location.city || ''}, ${location.state_id || ''} ${location.postal_code || ''}`.trim()
      : `${claim.accident_city || ''}, ${claim.accident_state_id || ''} ${claim.accident_postal_code || ''}`.trim()

    const lossDate = claim.loss_date ? new Date(claim.loss_date).toLocaleDateString('en-US') : ''

    const prefill = {
      // Internal — used for filename/labels, not drawn on the form
      location_name: location?.description || '',

      // Header
      form_date: new Date().toLocaleDateString('en-US'),

      // Agency
      agency_name: 'Franklin Street Insurance Services, LLC\n1311 N Westshore Blvd, Suite 200\nTampa, FL 33607',
      agency_contact: 'Eric Smith',
      agency_phone: '(813) 559-2012',
      agency_fax: '',
      agency_email: 'Eric.Smith@Franklinst.com',
      agency_code: '',
      agency_subcode: '',
      agency_customer_id: amsCustomer?.custno?.toString() || origamiClient?.reference_number || '',

      // Policy block
      insured_location_code: location?.display_code || '',
      date_of_loss: lossDate,
      time_of_loss: '',
      time_of_loss_ampm: '',

      property_carrier: amsCarrier?.name?.trim() || '',
      property_naic: amsCarrier?.naic || '',
      property_policy_number: amsPolicy?.polno || origamiPolicy?.policy_number || '',
      property_line_of_business: amsLob?.lineofbus || amsPolicy?.poltypelob || '',

      flood_carrier: '',
      flood_naic: '',
      flood_policy_number: '',

      wind_carrier: '',
      wind_naic: '',
      wind_policy_number: '',

      // Insured block
      insured_name: insuredName,
      insured_address: [insuredAddr, insuredCityStateZip].filter(Boolean).join('\n'),
      insured_dob: claim.birth_date ? new Date(claim.birth_date).toLocaleDateString('en-US') : '',
      insured_fein: amsCustomer?.fedidno || '',
      insured_marital_status: claim.marital_status || '',
      insured_phone_primary: amsCustomer?.busfullphone || origamiClient?.primary_contact_phone || claim.claimant_work_phone || '',
      insured_phone_primary_type: (amsCustomer?.busfullphone || origamiClient?.primary_contact_phone || claim.claimant_work_phone) ? 'BUS' : '',
      insured_phone_secondary: amsCustomer?.resfullphone || claim.claimant_home_phone || '',
      insured_phone_secondary_type: (amsCustomer?.resfullphone || claim.claimant_home_phone) ? 'HOME' : '',
      insured_email_primary: amsCustomer?.email || origamiClient?.primary_contact_email || claim.claimant_email || '',
      insured_email_secondary: '',

      // Spouse
      spouse_name: '',
      spouse_address: '',
      spouse_dob: '',
      spouse_fein: '',
      spouse_marital_status: '',
      spouse_phone_primary: '',
      spouse_phone_primary_type: '',
      spouse_phone_secondary: '',
      spouse_phone_secondary_type: '',
      spouse_email_primary: '',
      spouse_email_secondary: '',

      // Contact block
      contact_insured: false,
      contact_name: origamiClient?.primary_contact_name || '',
      contact_address: '',
      contact_phone_primary: origamiClient?.primary_contact_phone || '',
      contact_phone_primary_type: origamiClient?.primary_contact_phone ? 'BUS' : '',
      contact_phone_secondary: '',
      contact_phone_secondary_type: '',
      contact_email_primary: origamiClient?.primary_contact_email || '',
      contact_email_secondary: '',
      contact_when: '',

      // Loss block
      loss_street: lossLocationStreet,
      loss_city_state_zip: lossLocationCityStateZip,
      loss_country: 'U.S.',
      loss_location_description: claim.event_location || '',
      police_fire_contacted: '',
      report_number: '',
      kind_of_loss_fire: false,
      kind_of_loss_theft: false,
      kind_of_loss_lightning: false,
      kind_of_loss_hail: false,
      kind_of_loss_flood: false,
      kind_of_loss_wind: false,
      kind_of_loss_other: '',
      probable_amount: claim.expected_settlement_amount ? `$${Number(claim.expected_settlement_amount).toLocaleString()}` : '',
      description_of_loss: claim.loss_description || claim.event_description || '',
      reported_by: claim.claimant || '',
      reported_to: claim.claim_adjuster_name || '',

      // Injured / Property Damaged (page 2 of ACORD 3)
      injured_name: claim.claimant || '',
      injured_address_1: '',
      injured_address_2: '',
      employer_name: '',
      employer_address_1: '',
      employer_address_2: '',

      // Remarks
      remarks: '',
    }

    // Merge saved data over prefill (saved overrides prefill)
    const merged = { ...prefill, ...(claim.acord_form_data || {}) }

    return NextResponse.json({
      formData: merged,
      hasSavedData: !!claim.acord_form_data,
      coverageType: origamiPolicy?.major_coverage_id === 40 ? 'GL' : origamiPolicy?.major_coverage_id === 50 ? 'Property' : (amsLob?.lineofbus || '').toLowerCase().includes('liab') ? 'GL' : 'Property',
    })
  } catch (error) {
    console.error('ACORD form error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
