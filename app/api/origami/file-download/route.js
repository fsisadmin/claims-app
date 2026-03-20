import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { storagePath } = await request.json()
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Generate a signed URL (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from('origami-files')
      .createSignedUrl(storagePath, 3600)

    if (error) throw error

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
