import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchAll(supabase, table, select, filters = {}) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    for (const [key, val] of Object.entries(filters)) {
      if (key.endsWith('_in')) {
        query = query.in(key.replace('_in', ''), val)
      } else if (key.endsWith('_cs')) {
        query = query.contains(key.replace('_cs', ''), [val])
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

function formatFileSize(bytes) {
  if (!bytes) return 'unknown'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

function formatClaimContext(claim, notes, files, location, policy) {
  let context = '## CLAIM DATA\n'

  // Core claim info
  context += `Claim Number: ${claim.claim_number || 'N/A'}\n`
  context += `TPA Claim Number: ${claim.tpa_claim_number || 'N/A'}\n`
  context += `Status: ${claim.status === 'O' ? 'Open' : claim.status === 'C' ? 'Closed' : claim.status === 'R' ? 'Reopened' : claim.status || 'Unknown'}\n`
  context += `Claimant: ${claim.claimant || 'Unknown'}\n`
  context += `Loss Date: ${claim.loss_date || 'N/A'}\n`
  context += `Report Date: ${claim.report_date || 'N/A'}\n`
  context += `Loss Description: ${claim.loss_description || 'N/A'}\n`
  context += `Event Description: ${claim.event_description || 'N/A'}\n`
  context += `Adjuster: ${claim.claim_adjuster_name || 'N/A'}\n`
  context += `Occurrence Number: ${claim.occurrence_number || 'N/A'}\n`

  // Lawsuit info
  if (claim.lawsuit_filed) {
    context += `\n### Lawsuit Information\n`
    context += `Lawsuit Filed: Yes\n`
    context += `Suit Date: ${claim.suit_date || 'N/A'}\n`
    context += `Lead Attorney: ${claim.lead_attorney || 'N/A'}\n`
    context += `Law Firm: ${claim.law_firm || 'N/A'}\n`
    context += `Defense Counsel: ${claim.defense_counsel_attorney || 'N/A'}\n`
    context += `Defense Firm: ${claim.defense_counsel_firm || 'N/A'}\n`
    context += `Plaintiff Counsel: ${claim.plaintiff_counsel_attorney || 'N/A'}\n`
    context += `Plaintiff Firm: ${claim.plaintiff_counsel_firm || 'N/A'}\n`
    context += `Case Number: ${claim.case_number || 'N/A'}\n`
    context += `Docket Number: ${claim.docket_number || 'N/A'}\n`
    context += `Case Overview: ${claim.case_overview || 'N/A'}\n`
    context += `Summary of Facts: ${claim.summary_of_facts || 'N/A'}\n`
    context += `Settlement Amount: ${claim.actual_settlement_amount || 'N/A'}\n`
    context += `Expected Settlement: ${claim.expected_settlement_amount || 'N/A'}\n`
    context += `Alleged Damages: ${claim.alleged_damages || 'N/A'}\n`
  }

  // Financials
  context += `\n### Financials\n`
  const categories = ['Indemnity/BI', 'Expense/PD', 'Medical', 'Legal', 'Adj. Expense', 'Other', 'Subrogation']
  for (let i = 1; i <= 7; i++) {
    const paid = Number(claim[`paid${i}`]) || 0
    const reserved = Number(claim[`reserve${i}`]) || 0
    const recovery = Number(claim[`recovery${i}`]) || 0
    if (paid || reserved || recovery) {
      context += `Category ${i} (${categories[i - 1] || 'Cat ' + i}): Paid=$${paid.toFixed(2)}, Reserved=$${reserved.toFixed(2)}, Recovery=$${recovery.toFixed(2)}\n`
    }
  }
  context += `Total Paid: $${(claim.total_paid || 0).toFixed(2)}\n`
  context += `Total Reserved: $${(claim.total_reserved || 0).toFixed(2)}\n`
  context += `Total Recovery: $${(claim.total_recovery || 0).toFixed(2)}\n`
  context += `Total Incurred: $${(claim.total_incurred || 0).toFixed(2)}\n`

  // Location
  if (location) {
    context += `\n### Location\n`
    context += `Name: ${location.description || 'N/A'}\n`
    context += `Address: ${[location.street1, location.city, location.state_id, location.postal_code].filter(Boolean).join(', ')}\n`
  }

  // Policy
  if (policy) {
    context += `\n### Policy\n`
    context += `Policy Number: ${policy.policy_number || 'N/A'}\n`
    context += `Description: ${policy.description || 'N/A'}\n`
    context += `Effective: ${policy.effective_date || 'N/A'} to ${policy.expiration_date || 'N/A'}\n`
  }

  // Notes — cap total context to ~8K tokens worth of notes
  if (notes.length > 0) {
    context += `\n## NOTES & DIARY ENTRIES (${notes.length} total)\n`
    const MAX_NOTES_CHARS = 30000 // ~8K tokens
    let notesChars = 0

    // Show most recent notes first (already sorted desc by entry_date)
    for (const note of notes) {
      if (notesChars > MAX_NOTES_CHARS) {
        context += `\n... (${notes.length - notes.indexOf(note)} older notes omitted for brevity)\n`
        break
      }
      const author = note.user_name || note.author_name || 'Unknown'
      const date = note.entry_date ? new Date(note.entry_date).toLocaleDateString() : 'N/A'
      const subject = note.subject ? ` | ${note.subject}` : ''
      // Strip email headers/signatures and excessive whitespace
      let body = (note.body || '')
        .replace(/^(From|To|Cc|Sent|Date|Subject):.*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .substring(0, 500)
      const attachments = note.files?.length ? ` [Files: ${note.files.map(f => f.file_name).join(', ')}]` : ''
      const entry = `[${date}] ${author}${subject}: ${body}${attachments}\n`
      context += entry
      notesChars += entry.length
    }
  }

  // Files — just list names
  if (files.length > 0) {
    context += `\n## ATTACHED FILES (${files.length})\n`
    for (const f of files.slice(0, 50)) {
      context += `- ${f.file_name} (${formatFileSize(f.file_size)})\n`
    }
    if (files.length > 50) context += `... and ${files.length - 50} more files\n`
  }

  return context
}

export async function POST(request) {
  try {
    const { claimId, question, conversationHistory = [] } = await request.json()

    if (!claimId || !question) {
      return NextResponse.json({ error: 'Missing claimId or question' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all claim data in parallel
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('origami_claims')
      .select('*')
      .eq('claim_id', claimId)
      .single()

    if (claimError) throw claimError

    const [rawNotes, location, policy, claimFiles] = await Promise.all([
      fetchAll(supabaseAdmin, 'origami_notes',
        'note_id, parent_id, body, author_name, entry_date, subject, entry_user_id',
        { parent_domain_id: 1, parent_id: claimId }
      ),
      claim.location_id
        ? supabaseAdmin.from('origami_locations')
            .select('location_id, description, display_code, street1, city, state_id, postal_code')
            .eq('location_id', claim.location_id).single().then(r => r.data)
        : Promise.resolve(null),
      claim.policy_id
        ? supabaseAdmin.from('origami_policies')
            .select('policy_id, policy_number, description, effective_date, expiration_date')
            .eq('policy_id', claim.policy_id).single().then(r => r.data)
        : Promise.resolve(null),
      fetchAll(supabaseAdmin, 'origami_files',
        'file_id, file_name, mime_type, file_size, description, note_id',
        { claim_ids_cs: claimId }
      ),
    ])

    // Enrich notes with user info
    const noteUserIds = [...new Set(rawNotes.map(n => n.entry_user_id).filter(Boolean))]
    let userLookup = {}
    if (noteUserIds.length > 0) {
      const users = await fetchAll(supabaseAdmin, 'origami_users',
        'user_id, first_name, last_name, email, title',
        { user_id_in: noteUserIds }
      )
      users.forEach(u => { userLookup[u.user_id] = u })
    }

    // Also get files attached to notes
    const noteIds = rawNotes.map(n => n.note_id).filter(Boolean)
    let noteFiles = []
    if (noteIds.length > 0) {
      noteFiles = await fetchAll(supabaseAdmin, 'origami_files',
        'file_id, file_name, mime_type, file_size, description, note_id',
        { note_id_in: noteIds }
      )
    }

    const noteFileMap = {}
    for (const f of noteFiles) {
      if (f.note_id) {
        if (!noteFileMap[f.note_id]) noteFileMap[f.note_id] = []
        noteFileMap[f.note_id].push(f)
      }
    }

    const notes = rawNotes.map(n => {
      const user = userLookup[n.entry_user_id]
      return {
        ...n,
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : n.author_name,
        files: noteFileMap[n.note_id] || [],
      }
    })

    const standaloneFiles = claimFiles.filter(f => !f.note_id)

    // Calculate totals
    const totalPaid = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(claim[`paid${i}`]) || 0), 0)
    const totalReserved = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(claim[`reserve${i}`]) || 0), 0)
    const totalRecovery = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(claim[`recovery${i}`]) || 0), 0)
    claim.total_paid = totalPaid
    claim.total_reserved = totalReserved
    claim.total_recovery = totalRecovery
    claim.total_incurred = totalPaid + totalReserved - totalRecovery

    // Build context
    const claimContext = formatClaimContext(claim, notes, standaloneFiles, location, policy)

    // Build messages
    const messages = []

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add current question
    messages.push({ role: 'user', content: question })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You are a claims analyst assistant for Franklin Street Insurance. You have access to detailed claim data including notes, financial information, files, and history.

Your role is to:
- Answer questions about the claim based on the data provided
- Provide insights on claim trends, patterns, and potential concerns
- Summarize notes and communications
- Explain financial data and projections
- Flag potential issues or anomalies
- Help with claim management decisions

Be concise, specific, and reference actual data from the claim. Use dollar amounts, dates, and names when available. If the data doesn't contain information to answer a question, say so clearly.

Here is the complete claim data:

${claimContext}`,
      messages,
    })

    const answer = response.content[0]?.text || 'No response generated.'

    return NextResponse.json({ answer })
  } catch (error) {
    console.error('Claim insights error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
