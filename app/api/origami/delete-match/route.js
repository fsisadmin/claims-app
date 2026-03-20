import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { origamiClientId, origamiLocationId, organizationId, entityType } = await request.json()

    const type = entityType || 'client'
    const id = type === 'location' ? origamiLocationId : origamiClientId

    if (!id || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    if (type === 'location') {
      const { error } = await supabaseAdmin
        .from('origami_location_map')
        .delete()
        .eq('origami_location_id', origamiLocationId)
        .eq('organization_id', organizationId)
        .eq('entity_type', 'location')

      if (error) throw error
    } else {
      const { error } = await supabaseAdmin
        .from('origami_client_map')
        .delete()
        .eq('origami_client_id', origamiClientId)
        .eq('organization_id', organizationId)
        .eq('entity_type', 'client')

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
