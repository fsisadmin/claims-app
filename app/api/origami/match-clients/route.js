import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

// Simple word-overlap score to pre-filter candidates
function wordOverlap(a, b) {
  if (!a || !b) return 0
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const wordsA = new Set(normalize(a))
  const wordsB = normalize(b)
  if (wordsA.size === 0 || wordsB.length === 0) return 0
  const matches = wordsB.filter(w => wordsA.has(w)).length
  return matches / Math.max(wordsA.size, wordsB.length)
}

// Direct match on AMS code / client number / reference number
function findAmsMatch(origClient, appClients) {
  const ref = (origClient.reference_number || '').trim().toLowerCase()
  if (!ref) return null

  for (const app of appClients) {
    const ams = (app.ams_code || '').trim().toLowerCase()
    const cn = (app.client_number || '').trim().toLowerCase()
    if (ams && ams === ref) return app
    if (cn && cn === ref) return app
  }
  return null
}

function buildMatchPrompt(origamiClients, appClients) {
  return `You are a data matching specialist. Match each Origami client to the most likely app client.

ORIGAMI CLIENTS (to match):
${JSON.stringify(origamiClients.map(o => ({
  origami_client_id: o.client_id,
  name: o.name,
  reference_number: o.reference_number,
  street: o.street1,
  city: o.city,
  state: o.state,
  contact_email: o.primary_contact_email,
})), null, 2)}

APP CLIENTS (match targets):
${JSON.stringify(appClients.map(c => ({
  app_client_id: c.id,
  name: c.name,
  ams_code: c.ams_code,
  client_number: c.client_number,
  street_address: c.street_address,
  city: c.city,
  state: c.state,
  email: c.email,
})), null, 2)}

MATCHING RULES:
1. FIRST check if reference_number matches ams_code or client_number — this is the strongest signal (confidence 99-100).
2. Match on company name similarity (accounting for abbreviations, "LLC"/"Inc"/"LP" variations, word reordering).
3. Use address (city/state) as a secondary signal to confirm or break ties.
4. Use contact email domain as a tertiary signal.
5. Assign a confidence score 0-100:
   - 99-100: reference_number matches ams_code or client_number
   - 90-98: Near-exact name match + address/email confirms
   - 70-89: Strong name similarity, minor differences
   - 50-69: Partial name match or different location
   - Below 50: Weak/speculative
6. If no reasonable match exists, set app_client_id to null with confidence 0.

Return ONLY a JSON array (no markdown, no explanation):
[{"origami_client_id":<int>,"app_client_id":"<uuid or null>","confidence":<0-100>,"reasoning":"<brief>"}]`
}

// Fetch all rows from a table, paginating past the 1000-row default limit
async function fetchAll(supabase, table, select, filters = {}, orderBy = 'name') {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).order(orderBy).range(from, from + PAGE_SIZE - 1)
    for (const [key, val] of Object.entries(filters)) {
      query = query.eq(key, val)
    }
    const { data, error } = await query
    if (error) throw error
    allRows = allRows.concat(data || [])
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return allRows
}

export async function POST(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 500 })
    }

    const { organizationId } = await request.json()
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch ALL origami clients (paginated past 1000 limit)
    const origamiClients = await fetchAll(
      supabaseAdmin, 'origami_clients',
      'client_id, name, street1, city, state, postal_code, primary_contact_name, primary_contact_email, reference_number'
    )

    // Fetch app clients for this org
    const appClients = await fetchAll(
      supabaseAdmin, 'clients',
      'id, name, street_address, city, state, email, ams_code, client_number',
      { organization_id: organizationId }
    )

    // Exclude already-mapped
    const existingMaps = await fetchAll(
      supabaseAdmin, 'origami_client_map',
      'origami_client_id',
      { organization_id: organizationId, entity_type: 'client' },
      'created_at'
    )

    const mappedIds = new Set(existingMaps.map(m => m.origami_client_id))
    const unmappedOrigami = origamiClients.filter(o => !mappedIds.has(o.client_id))

    if (unmappedOrigami.length === 0) {
      return NextResponse.json({ matches: [], origamiClients: [], appClients, message: 'All origami clients are already mapped.' })
    }

    // Phase 1: Direct AMS code matching (highest priority)
    const amsMatched = []
    const remaining = []

    for (const orig of unmappedOrigami) {
      const amsMatch = findAmsMatch(orig, appClients)
      if (amsMatch) {
        amsMatched.push({
          origami_client_id: orig.client_id,
          app_client_id: amsMatch.id,
          confidence: 100,
          reasoning: `AMS code match: reference_number "${orig.reference_number}" = ams_code/client_number "${amsMatch.ams_code || amsMatch.client_number}"`,
        })
      } else {
        remaining.push(orig)
      }
    }

    console.log(`[Origami Match] ${unmappedOrigami.length} unmapped, ${amsMatched.length} matched by AMS code, ${remaining.length} remaining`)

    // Phase 2: Pre-filter remaining by word overlap for AI matching
    const candidates = []
    const noMatch = []

    for (const orig of remaining) {
      let bestScore = 0
      for (const app of appClients) {
        const score = wordOverlap(orig.name, app.name)
        if (score > bestScore) bestScore = score
      }
      if (bestScore >= 0.2) {
        candidates.push(orig)
      } else {
        noMatch.push({
          origami_client_id: orig.client_id,
          app_client_id: null,
          confidence: 0,
          reasoning: 'No name similarity found with any app client',
        })
      }
    }

    console.log(`[Origami Match] ${candidates.length} candidates for AI matching, ${noMatch.length} no-match`)

    // Call Claude API for the candidates only
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const BATCH_SIZE = 75
    const allMatches = [...amsMatched, ...noMatch]

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)
      const prompt = buildMatchPrompt(batch, appClients)

      console.log(`[Origami Match] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)}: ${batch.length} clients`)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })

      let text = response.content[0].text
      // Strip markdown code fences if present
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

    // Sort: highest confidence first, then no-matches at the end
    allMatches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

    return NextResponse.json({
      matches: allMatches,
      origamiClients: unmappedOrigami,
      appClients,
    })
  } catch (error) {
    console.error('Match clients error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
