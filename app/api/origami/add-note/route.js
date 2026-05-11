import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FSIS_NOTE_OFFSET = 900000000
const FSIS_FILE_OFFSET = 900000000
const ORIGAMI_BUCKET = 'origami-files'

function sanitizeName(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const contentType = request.headers.get('content-type') || ''

    let parentDomainId, parentId, body, subject, authorName, authorEmail, clientId, files

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      parentDomainId = Number(form.get('parentDomainId'))
      parentId = Number(form.get('parentId'))
      body = form.get('body')?.toString() || ''
      subject = form.get('subject')?.toString() || null
      authorName = form.get('authorName')?.toString() || null
      authorEmail = form.get('authorEmail')?.toString() || null
      clientId = form.get('clientId') ? Number(form.get('clientId')) : null
      files = form.getAll('files').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f)
    } else {
      const json = await request.json()
      parentDomainId = json.parentDomainId
      parentId = json.parentId
      body = json.body
      subject = json.subject || null
      authorName = json.authorName || null
      authorEmail = json.authorEmail || null
      clientId = json.clientId || null
      files = []
    }

    if (!parentDomainId || !parentId || !body?.trim()) {
      return NextResponse.json({ error: 'parentDomainId, parentId, and body are required' }, { status: 400 })
    }

    // Generate next note_id (no sequence on the table — assign manually with offset)
    const { data: maxNote } = await supabaseAdmin
      .from('origami_notes')
      .select('note_id')
      .order('note_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const newNoteId = Math.max(maxNote?.note_id || 0, FSIS_NOTE_OFFSET) + 1

    const now = new Date().toISOString()
    const { data: note, error: noteErr } = await supabaseAdmin
      .from('origami_notes')
      .insert({
        note_id: newNoteId,
        parent_domain_id: parentDomainId,
        parent_id: parentId,
        subject,
        body: body.trim(),
        author_name: authorName || authorEmail || 'FSIS User',
        entry_date: now,
        modified_date: now,
        client_id: clientId,
      })
      .select('*')
      .single()

    if (noteErr) throw noteErr

    // Upload files (if any) and create origami_files rows linked to the note
    const uploadedFiles = []
    if (files.length > 0) {
      const { data: maxFile } = await supabaseAdmin
        .from('origami_files')
        .select('file_id')
        .order('file_id', { ascending: false })
        .limit(1)
        .maybeSingle()

      let nextFileId = Math.max(maxFile?.file_id || 0, FSIS_FILE_OFFSET) + 1
      const claimIds = parentDomainId === 1 ? [parentId] : null

      for (const file of files) {
        const safeName = sanitizeName(file.name)
        const folder = clientId || `note-${newNoteId}`
        const storagePath = `${folder}/${nextFileId}_${safeName}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(ORIGAMI_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })

        if (uploadErr) {
          console.error('Upload failed for', safeName, uploadErr)
          continue
        }

        const { data: fileRow, error: fileInsertErr } = await supabaseAdmin
          .from('origami_files')
          .insert({
            file_id: nextFileId,
            file_name: file.name,
            mime_type: file.type || null,
            file_size: file.size || null,
            storage_path: storagePath,
            client_id: clientId,
            note_id: newNoteId,
            entry_date: now,
            claim_ids: claimIds,
          })
          .select('*')
          .single()

        if (fileInsertErr) {
          console.error('File row insert failed:', fileInsertErr)
          continue
        }

        uploadedFiles.push(fileRow)
        nextFileId += 1
      }
    }

    return NextResponse.json({
      note: { ...note, files: uploadedFiles },
      files: uploadedFiles,
    })
  } catch (error) {
    console.error('Add note error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
