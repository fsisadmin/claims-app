import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { action, clientId, categories } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    if (action === 'get') {
      const { data, error } = await supabaseAdmin
        .from('origami_financial_categories')
        .select('category_index, label')
        .eq('client_id', clientId || 0)
        .order('category_index')

      if (error) throw error

      // Build lookup: { 1: "Indemnity", 2: "Medical", ... }
      const labels = {}
      for (const row of (data || [])) {
        labels[row.category_index] = row.label
      }
      return NextResponse.json({ labels })
    }

    if (action === 'save') {
      if (!categories || !Array.isArray(categories)) {
        return NextResponse.json({ error: 'Missing categories array' }, { status: 400 })
      }

      // Upsert all categories
      const rows = categories.map(c => ({
        client_id: clientId || 0,
        category_index: c.index,
        label: c.label,
      }))

      const { error } = await supabaseAdmin
        .from('origami_financial_categories')
        .upsert(rows, { onConflict: 'client_id,category_index' })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Financial categories error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
