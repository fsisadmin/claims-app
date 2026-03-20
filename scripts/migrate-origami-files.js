/**
 * Origami Files Migration: SQL Server → Supabase Storage
 *
 * Extracts file attachments from SQL Server Files table,
 * uploads binary content to Supabase Storage bucket,
 * and saves metadata + claim linkage to origami_files table.
 *
 * Prerequisites:
 *   npm install msnodesqlv8 @supabase/supabase-js dotenv
 *
 * Usage:
 *   node scripts/migrate-origami-files.js
 *
 * Resume after interruption (skips already-uploaded files):
 *   node scripts/migrate-origami-files.js --resume
 */

const msnodesqlv8 = require('msnodesqlv8')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const BUCKET_NAME = 'origami-files'
const CONCURRENT_UPLOADS = 3

// Helper: query SQL Server with promises
function querySQL(connectionString, sql) {
  return new Promise((resolve, reject) => {
    msnodesqlv8.query(connectionString, sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

// Helper: query single file with binary content
function queryFileContent(connectionString, fileId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT FileID, FileName, MimeType, Contents, FileSize, Description,
                        EntryDate, EntryUserID, ClientID, NoteID, FolderID,
                        DocumentTypeID, PageCount
                 FROM Files WHERE FileID = ${fileId}`
    msnodesqlv8.query(connectionString, sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows[0] || null)
    })
  })
}

// Mime type mapping for common file types
function getMimeType(fileName, dbMimeType) {
  // DB stores just the extension like ".msg" or ".pdf" - extract and use our map
  const dbExt = (dbMimeType || '').trim().replace(/^\./, '').toLowerCase()
  const fileExt = (fileName || '').split('.').pop().toLowerCase()
  const ext = dbExt || fileExt
  const mimeMap = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    bmp: 'image/bmp',
    msg: 'application/vnd.ms-outlook',
    eml: 'message/rfc822',
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    htm: 'text/html',
    zip: 'application/zip',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    rtf: 'application/rtf',
    xml: 'application/xml',
    json: 'application/json',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

// Sanitize file name for storage path
function sanitizeFileName(name) {
  return (name || 'unnamed')
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 200)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const mssqlServer = process.env.MSSQL_SERVER
  const mssqlDatabase = process.env.MSSQL_DATABASE || 'ExportFranklinStreet'
  const resumeMode = process.argv.includes('--resume')

  if (!supabaseUrl || !serviceKey || !mssqlServer) {
    console.error('❌ Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MSSQL_SERVER)')
    process.exit(1)
  }

  const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${mssqlServer};Database=${mssqlDatabase};Trusted_Connection=yes;TrustServerCertificate=yes;`

  // Test SQL Server connection
  console.log(`🔌 Connecting to SQL Server: ${mssqlServer}/${mssqlDatabase}`)
  await querySQL(connectionString, 'SELECT 1 AS test')
  console.log('✅ Connected to SQL Server')

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, serviceKey)
  console.log('✅ Connected to Supabase')

  // Ensure storage bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB max per file
    })
    if (error) {
      console.error('❌ Failed to create bucket:', error.message)
      process.exit(1)
    }
    console.log(`✅ Created storage bucket: ${BUCKET_NAME}`)
  } else {
    console.log(`✅ Storage bucket exists: ${BUCKET_NAME}`)
  }

  // Get all file IDs and metadata (without binary content to save memory)
  console.log('\n📋 Fetching file list from SQL Server...')
  const files = await querySQL(connectionString,
    `SELECT f.FileID, f.FileName, f.MimeType, f.FileSize, f.Description,
            f.EntryDate, f.EntryUserID, f.ClientID, f.NoteID, f.FolderID,
            f.DocumentTypeID, f.PageCount
     FROM Files f
     WHERE f.Contents IS NOT NULL
     ORDER BY f.FileID`
  )
  console.log(`   Found ${files.length} files with content`)

  // Get claim linkages from Links table (ParentDomainID=1 = Claims, ChildDomainID=4 = Files)
  console.log('📋 Fetching claim-file linkages...')
  const links = await querySQL(connectionString,
    `SELECT ChildID as file_id, ParentID as claim_id, ParentDomainID as parent_domain_id
     FROM Links
     WHERE ChildDomainID = 4`
  )
  // Build lookup: file_id -> array of {claim_id, parent_domain_id}
  const fileLinkMap = {}
  for (const link of links) {
    if (!fileLinkMap[link.file_id]) fileLinkMap[link.file_id] = []
    fileLinkMap[link.file_id].push({ claim_id: link.claim_id, parent_domain_id: link.parent_domain_id })
  }
  console.log(`   Found ${links.length} file linkages`)

  // Check which files are already uploaded (resume mode)
  let uploadedFileIds = new Set()
  if (resumeMode) {
    console.log('📋 Checking already-uploaded files...')
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('origami_files')
        .select('file_id')
        .range(offset, offset + pageSize - 1)
      if (error) { console.error('Error checking existing files:', error.message); break }
      if (!data || data.length === 0) break
      data.forEach(r => uploadedFileIds.add(r.file_id))
      offset += pageSize
    }
    console.log(`   Found ${uploadedFileIds.size} already-uploaded files, will skip them`)
  }

  // Process files
  let uploaded = 0
  let skipped = 0
  let failed = 0
  const total = files.length
  const startTime = Date.now()

  for (let i = 0; i < files.length; i++) {
    const fileMeta = files[i]
    const fileId = fileMeta.FileID

    // Skip already uploaded
    if (uploadedFileIds.has(fileId)) {
      skipped++
      continue
    }

    try {
      // Fetch binary content for this single file
      const fileRow = await queryFileContent(connectionString, fileId)
      if (!fileRow || !fileRow.Contents) {
        console.log(`   ⚠️  File ${fileId} has no content, skipping`)
        skipped++
        continue
      }

      const fileName = (fileRow.FileName || 'unnamed').trim()
      const safeFileName = sanitizeFileName(fileName)
      const clientId = fileRow.ClientID || 0
      const storagePath = `${clientId}/${fileId}_${safeFileName}`
      const mimeType = getMimeType(fileName, fileRow.MimeType)

      // Upload binary to Supabase Storage
      const contentBuffer = Buffer.isBuffer(fileRow.Contents)
        ? fileRow.Contents
        : Buffer.from(fileRow.Contents)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, contentBuffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error(`\n   ❌ Upload failed for ${fileId} (${fileName}): ${uploadError.message}`)
        failed++
        continue
      }

      // Get claim linkages for this file
      const fileLinks = fileLinkMap[fileId] || []
      const claimIds = fileLinks.filter(l => l.parent_domain_id === 1).map(l => l.claim_id)

      // Save metadata to origami_files table
      const { error: dbError } = await supabase
        .from('origami_files')
        .upsert({
          file_id: fileId,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileRow.FileSize,
          description: fileRow.Description ? fileRow.Description.trim() : null,
          storage_path: storagePath,
          client_id: fileRow.ClientID,
          note_id: fileRow.NoteID,
          entry_date: fileRow.EntryDate ? new Date(fileRow.EntryDate).toISOString() : null,
          entry_user_id: fileRow.EntryUserID,
          claim_ids: claimIds.length > 0 ? claimIds : null,
          folder_id: fileRow.FolderID,
          page_count: fileRow.PageCount,
        }, { onConflict: 'file_id' })

      if (dbError) {
        console.error(`\n   ❌ DB insert failed for ${fileId}: ${dbError.message}`)
        failed++
        continue
      }

      uploaded++
      const elapsed = (Date.now() - startTime) / 1000
      const rate = uploaded / elapsed
      const remaining = (total - i - 1) / rate
      const remainMins = Math.round(remaining / 60)
      process.stdout.write(
        `   ✅ ${uploaded}/${total} uploaded | ${skipped} skipped | ${failed} failed | ~${remainMins}min remaining   \r`
      )
    } catch (err) {
      console.error(`\n   ❌ Error processing file ${fileId}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n\n🎉 File migration complete!`)
  console.log(`   ✅ Uploaded: ${uploaded}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⏱️  Total time: ${Math.round((Date.now() - startTime) / 1000 / 60)} minutes`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
