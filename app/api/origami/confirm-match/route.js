import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { matches, organizationId, userId, entityType } = await request.json()

    if (!matches?.length || !organizationId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const type = entityType || 'client'

    if (type === 'location') {
      const rows = matches.map(m => ({
        origami_location_id: m.origami_location_id,
        app_location_id: m.app_location_id,
        organization_id: organizationId,
        entity_type: 'location',
        confidence_score: m.confidence_score,
        match_reasoning: m.match_reasoning,
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      }))

      const { data, error } = await supabaseAdmin
        .from('origami_location_map')
        .upsert(rows, { onConflict: 'origami_location_id,entity_type,organization_id' })
        .select('id')

      if (error) throw error
      return NextResponse.json({ success: true, count: data.length })
    }

    // Default: client matching
    const rows = matches.map(m => ({
      origami_client_id: m.origami_client_id,
      app_client_id: m.app_client_id,
      organization_id: organizationId,
      entity_type: 'client',
      confidence_score: m.confidence_score,
      match_reasoning: m.match_reasoning,
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
    }))

    const { data, error } = await supabaseAdmin
      .from('origami_client_map')
      .upsert(rows, { onConflict: 'origami_client_id,entity_type,organization_id' })
      .select('id')

    if (error) throw error

    return NextResponse.json({ success: true, count: data.length })
  } catch (error) {
    console.error('Confirm match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
