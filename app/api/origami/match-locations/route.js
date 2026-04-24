import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120 // Allow up to 2 minutes for AI matching

async function fetchAll(supabase, table, select, filters = {}, orderBy = null) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy)
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

// Normalize address for comparison
function normalizeAddr(s) {
  if (!s) return ''
  return s.toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|circle|cir|place|pl|suite|ste|unit|apt|#)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Quick address match: street number + city
function addressOverlap(origLoc, appLoc) {
  const origAddr = normalizeAddr(origLoc.street1)
  const appAddr = normalizeAddr(appLoc.street_address)
  const origCity = (origLoc.city || '').toLowerCase().trim()
  const appCity = (appLoc.city || '').toLowerCase().trim()

  if (!origAddr && !appAddr) return 0

  // Extract leading street number
  const origNum = origAddr.match(/^(\d+)/)
  const appNum = appAddr.match(/^(\d+)/)

  let score = 0
  if (origNum && appNum && origNum[1] === appNum[1]) score += 0.5
  if (origCity && appCity && origCity === appCity) score += 0.3
  if (origLoc.state_id && appLoc.state && String(origLoc.state_id).toLowerCase() === appLoc.state.toLowerCase()) score += 0.2

  return score
}

function buildLocationMatchPrompt(origamiLocations, appLocations) {
  return `You are a data matching specialist. Match each Origami location to the most likely app location.

ORIGAMI LOCATIONS (to match):
${JSON.stringify(origamiLocations.map(o => ({
  origami_location_id: o.location_id,
  name: o.description,
  display_code: o.display_code,
  street: o.street1,
  city: o.city,
  state: o.state_id != null ? String(o.state_id) : null,
  postal_code: o.postal_code,
})), null, 2)}

APP LOCATIONS (match targets):
${JSON.stringify(appLocations.map(l => ({
  app_location_id: l.id,
  name: l.location_name,
  street_address: l.street_address,
  city: l.city,
  state: l.state,
  zip: l.zip,
})), null, 2)}

MATCHING RULES:
1. Match primarily on address — street number + street name + city + state is the strongest signal.
2. If street addresses match (same street number + city), confidence 90-100.
3. Location names/descriptions can confirm a match but are secondary to address.
4. City + state match alone (without street) is moderate confidence (50-70).
5. display_code may contain location identifiers — use as a supplementary signal.
6. Assign a confidence score 0-100:
   - 95-100: Exact address match (street + city + state)
   - 85-94: Strong address match (slight formatting differences)
   - 70-84: Same city/state with partial name or address similarity
   - 50-69: Same city/state only, or partial address match
   - Below 50: Weak/speculative
7. If no reasonable match exists, set app_location_id to null with confidence 0.
8. One origami location can only match one app location. One app location can match multiple origami locations.

Return ONLY a JSON array (no markdown, no explanation):
[{"origami_location_id":<int>,"app_location_id":"<uuid or null>","confidence":<0-100>,"reasoning":"<brief>"}]`
}

export async function POST(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 500 })
    }

    const { organizationId, appClientId } = await request.json()
    if (!organizationId || !appClientId) {
      return NextResponse.json({ error: 'Missing organizationId or appClientId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Step 1: Find origami client IDs mapped to this app client
    const { data: clientMaps, error: mapError } = await supabaseAdmin
      .from('origami_client_map')
      .select('origami_client_id')
      .eq('app_client_id', appClientId)
      .eq('organization_id', organizationId)
      .eq('entity_type', 'client')

    if (mapError) throw mapError
    const origamiClientIds = (clientMaps || []).map(m => m.origami_client_id)

    if (origamiClientIds.length === 0) {
      return NextResponse.json({ matches: [], message: 'No origami clients mapped.' })
    }

    // Step 2: Fetch origami locations for those clients
    const origamiLocations = await fetchAll(
      supabaseAdmin, 'origami_locations',
      'location_id, client_id, display_code, description, street1, city, state_id, postal_code, is_inactive',
      { client_id_in: origamiClientIds }
    )

    // Step 3: Fetch app locations for this client
    const appLocations = await fetchAll(
      supabaseAdmin, 'locations',
      'id, location_name, street_address, city, state, zip, client_id',
      { client_id: appClientId },
      'location_name'
    )

    // Step 4: Exclude already-mapped origami locations
    const existingMaps = await fetchAll(
      supabaseAdmin, 'origami_location_map',
      'origami_location_id',
      { organization_id: organizationId, entity_type: 'location' },
      'created_at'
    )
    const mappedIds = new Set(existingMaps.map(m => m.origami_location_id))
    const unmappedOrigami = origamiLocations.filter(o => !mappedIds.has(o.location_id))

    if (unmappedOrigami.length === 0) {
      return NextResponse.json({ matches: [], appLocations, message: 'All origami locations are already mapped.' })
    }

    // Phase 1: Direct address matching
    const directMatched = []
    const remaining = []

    for (const orig of unmappedOrigami) {
      let bestMatch = null
      let bestScore = 0
      for (const app of appLocations) {
        const score = addressOverlap(orig, app)
        if (score > bestScore) {
          bestScore = score
          bestMatch = app
        }
      }
      if (bestScore >= 0.8) {
        directMatched.push({
          origami_location_id: orig.location_id,
          app_location_id: bestMatch.id,
          confidence: 95 + Math.round(bestScore * 5),
          reasoning: `Direct address match: "${orig.street1}, ${orig.city}" ≈ "${bestMatch.street_address}, ${bestMatch.city}"`,
        })
      } else {
        remaining.push(orig)
      }
    }

    console.log(`[Origami Location Match] ${unmappedOrigami.length} unmapped, ${directMatched.length} direct address matches, ${remaining.length} for AI`)

    // Phase 2: AI matching for remaining
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const BATCH_SIZE = 25
    const allMatches = [...directMatched]

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE)
      const prompt = buildLocationMatchPrompt(batch, appLocations)

      console.log(`[Origami Location Match] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(remaining.length / BATCH_SIZE)}: ${batch.length} locations`)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })

      let text = response.content[0].text
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      try {
        const parsed = JSON.parse(text)
        allMatches.push(...(Array.isArray(parsed) ? parsed : [parsed]))
      } catch {
        const match = text.match(/\[[\s\S]*\]/)
        if (match) {
          try {
            allMatches.push(...JSON.parse(match[0]))
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2.message, text.slice(0, 500))
          }
        } else {
          console.error('Failed to parse Claude response:', text.slice(0, 500))
        }
      }
    }

    // Sort: highest confidence first
    allMatches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

    return NextResponse.json({
      matches: allMatches,
      origamiLocations: unmappedOrigami,
      appLocations,
    })
  } catch (error) {
    console.error('Match locations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
