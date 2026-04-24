import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

async function fetchAll(supabase, table, select, filters = {}, orderBy = null, ascending = false) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy, { ascending })
    for (const [key, val] of Object.entries(filters)) {
      if (key.endsWith('_in')) {
        query = query.in(key.replace('_in', ''), val)
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

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
}

function fmtPolicyDates(eff, exp) {
  return (!eff || !exp) ? '' : `${fmtDate(eff)}-${fmtDate(exp)}`
}

function fmtCurrency(val) {
  if (val === null || val === undefined || val === 0) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val)
}

function isPropPolicy(policy) {
  return policy.major_coverage_id === 50
}

function isGLPolicy(policy) {
  return policy.major_coverage_id === 40
}

const TEAL = { argb: 'FF005570' }
const LIGHT_GRAY = { argb: 'FFE8E8E8' }
const WHITE_FONT = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
const HEADER_FONT = { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF333333' } }
const HEADER_FONT_BOLD = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF333333' } }
const DATA_FONT = { name: 'Calibri', size: 10, color: { argb: 'FF333333' } }
const CELL_BORDER = {
  top: { style: 'medium', color: { argb: 'FF005570' } },
  bottom: { style: 'medium', color: { argb: 'FF005570' } },
  left: { style: 'medium', color: { argb: 'FF005570' } },
  right: { style: 'medium', color: { argb: 'FF005570' } },
}

function buildSheet(workbook, sheetName, typeLabel, entity, locDesc, locAddr, prepDate, startDate, policyYears, claims, carriersByPolicy, filteredPolicyIds, logoId) {
  const ws = workbook.addWorksheet(sheetName)

  ws.columns = [
    { width: 22 }, { width: 30 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 30 }, { width: 10 }, { width: 14 },
    { width: 14 }, { width: 16 },
  ]

  // Row 1: Teal header with logo
  const row1 = ws.addRow([''])
  row1.height = 55
  ws.mergeCells('A1:J1')
  row1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: TEAL }

  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0, row: 0.05 },
      ext: { width: 350, height: 50 },
    })
  }

  // Row 2: Entity header
  const row2 = ws.addRow([`${entity} ${typeLabel} Loss Run Prepared by Franklin Street Insurance Services: Prepared ${prepDate}\n${locDesc}: ${locAddr}`])
  row2.height = 37
  ws.mergeCells('A2:J2')
  const c2 = row2.getCell(1)
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_GRAY }
  c2.font = HEADER_FONT_BOLD
  c2.alignment = { wrapText: true, vertical: 'middle' }

  // Row 3: Date range
  const row3 = ws.addRow([`Loss History From ${startDate}-${prepDate}`])
  row3.height = 36
  ws.mergeCells('A3:J3')
  const c3 = row3.getCell(1)
  c3.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_GRAY }
  c3.font = HEADER_FONT_BOLD
  c3.alignment = { vertical: 'middle' }

  // Row 4: Column headers
  const headers = ['Policy Dates', 'Carrier', 'Line of Coverage', 'Claim No.', 'Date of Loss', 'Description', 'Status', 'Total Paid', 'Total Reserve', 'Total Incurred']
  const row4 = ws.addRow(headers)
  row4.height = 20
  row4.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: TEAL }
    cell.font = WHITE_FONT
    cell.alignment = { vertical: 'middle' }
    cell.border = CELL_BORDER
  })

  // Coverage label
  const covLabel = sheetName === 'Prop' ? 'Property' : 'Liability'

  // Data rows
  const dataRows = []
  for (const policy of policyYears) {
    const dates = fmtPolicyDates(policy.effective_date, policy.expiration_date)
    const carrier = carriersByPolicy[policy.policy_id] || ''
    const effDate = new Date(policy.effective_date)
    const expDate = new Date(policy.expiration_date)

    const policyClaims = claims.filter(c => {
      if (c.policy_id === policy.policy_id) return true
      if (!c.policy_id && c.loss_date) {
        const ld = new Date(c.loss_date)
        if (ld >= effDate && ld < expDate) {
          const firstMatch = policyYears.find(p => {
            const e = new Date(p.effective_date)
            const x = new Date(p.expiration_date)
            return ld >= e && ld < x
          })
          return firstMatch?.policy_id === policy.policy_id
        }
      }
      return false
    })

    if (policyClaims.length === 0) {
      dataRows.push({ dates, carrier, noClaims: true })
    } else {
      policyClaims.forEach((c, i) => {
        dataRows.push({
          dates: i === 0 ? dates : '', carrier: i === 0 ? carrier : '', coverage: i === 0 ? covLabel : '',
          noClaims: false,
          claimNo: c.claim_number || '', lossDate: fmtDate(c.loss_date), description: c.loss_description || '',
          status: c.status === 'O' ? 'Open' : c.status === 'C' ? 'Closed' : c.status === 'R' ? 'Reopened' : c.status || '',
          totalPaid: fmtCurrency(c.total_paid), totalReserve: fmtCurrency(c.total_reserved), totalIncurred: fmtCurrency(c.total_incurred),
        })
      })
    }
  }

  if (dataRows.length === 0) {
    dataRows.push({ dates: '', carrier: '', noClaims: true })
  }

  dataRows.forEach(row => {
    if (row.noClaims) {
      const r = ws.addRow([row.dates, row.carrier, covLabel, '', '', '', '', '', '', ''])
      r.height = 40
      r.eachCell((cell) => {
        cell.font = DATA_FONT
        cell.alignment = { wrapText: true, vertical: 'middle' }
        cell.border = CELL_BORDER
      })
      const rowNum = r.number
      ws.mergeCells(`D${rowNum}:J${rowNum}`)
      const mc = r.getCell(4)
      mc.value = '***No Claims***'
      mc.font = { ...DATA_FONT, bold: true }
      mc.alignment = { horizontal: 'center', vertical: 'middle' }
    } else {
      const r = ws.addRow([row.dates, row.carrier, row.coverage || covLabel, row.claimNo, row.lossDate, row.description, row.status, row.totalPaid, row.totalReserve, row.totalIncurred])
      r.height = 40
      r.eachCell((cell) => {
        cell.font = DATA_FONT
        cell.alignment = { wrapText: true, vertical: 'middle' }
        cell.border = CELL_BORDER
      })
    }
  })

  // Footer 1
  const f1 = ws.addRow([`Prepared by Eric Smith Practice Leader - Claims and Risk Management of Franklin Street Insurance Services. Should you, or another party, have any questions or concerns; please feel free to contact me directly at (813) 559-2012 or Eric.Smith@Franklinst.com.   `])
  f1.height = 38
  ws.mergeCells(`A${f1.number}:J${f1.number}`)
  const fc1 = f1.getCell(1)
  fc1.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_GRAY }
  fc1.font = HEADER_FONT
  fc1.alignment = { wrapText: true, vertical: 'middle' }

  // Footer 2
  const f2 = ws.addRow([`As the current insurance broker for the above referenced location, please accept this letter as evidence of loss history effective ${startDate}-${prepDate} provided by each respective carrier listed above.  Paid amounts are in excess of applicable deductibles.`])
  f2.height = 38
  ws.mergeCells(`A${f2.number}:J${f2.number}`)
  const fc2 = f2.getCell(1)
  fc2.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_GRAY }
  fc2.font = HEADER_FONT
  fc2.alignment = { wrapText: true, vertical: 'middle' }
}

export async function POST(request) {
  try {
    const { origamiLocationId, organizationId } = await request.json()
    if (!origamiLocationId || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: location } = await supabaseAdmin.from('origami_locations').select('*').eq('location_id', origamiLocationId).single()
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const { data: client } = await supabaseAdmin.from('origami_clients').select('client_id, name').eq('client_id', location.client_id).single()

    const allPolicies = await fetchAll(supabaseAdmin, 'origami_policies',
      'policy_id, policy_number, description, effective_date, expiration_date, premium, status, major_coverage_id, client_id',
      { client_id: location.client_id }, 'effective_date', false)

    const coverageIds = [...new Set(allPolicies.map(p => p.major_coverage_id).filter(Boolean))]
    let coverageLookup = {}
    if (coverageIds.length > 0) {
      const codes = await fetchAll(supabaseAdmin, 'origami_codes', 'code_id, description', { code_id_in: coverageIds })
      codes.forEach(c => { coverageLookup[c.code_id] = c.description })
    }

    const policyIds = allPolicies.map(p => p.policy_id)
    let carriersByPolicy = {}
    if (policyIds.length > 0) {
      const policyCarriers = await fetchAll(supabaseAdmin, 'origami_policy_carriers', 'policy_id, carrier_id', { policy_id_in: policyIds })
      const carrierIds = [...new Set(policyCarriers.map(pc => pc.carrier_id).filter(Boolean))]
      let carrierLookup = {}
      if (carrierIds.length > 0) {
        const carriers = await fetchAll(supabaseAdmin, 'origami_carriers', 'carrier_id, description, legal_name', { carrier_id_in: carrierIds })
        carriers.forEach(c => { carrierLookup[c.carrier_id] = c.description || c.legal_name || '' })
      }
      policyCarriers.forEach(pc => { carriersByPolicy[pc.policy_id] = carrierLookup[pc.carrier_id] || '' })
    }

    // Fetch claims first (needed for policy selection)
    const allClaims = await fetchAll(supabaseAdmin, 'origami_claims',
      'claim_id, claim_number, claimant, loss_date, loss_description, status, policy_id, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7',
      { location_id: origamiLocationId }, 'loss_date')

    const claims = allClaims.map(c => {
      const totalPaid = [c.paid1, c.paid2, c.paid3, c.paid4, c.paid5, c.paid6, c.paid7].reduce((s, v) => s + (Number(v) || 0), 0)
      const totalReserved = [c.reserve1, c.reserve2, c.reserve3, c.reserve4, c.reserve5, c.reserve6, c.reserve7].reduce((s, v) => s + (Number(v) || 0), 0)
      const totalRecovery = [c.recovery1, c.recovery2, c.recovery3, c.recovery4, c.recovery5, c.recovery6, c.recovery7].reduce((s, v) => s + (Number(v) || 0), 0)
      return { ...c, total_paid: totalPaid, total_reserved: totalReserved, total_incurred: totalPaid + totalReserved - totalRecovery }
    })

    // Filter policies by type
    const propPolicies = allPolicies.filter(p => isPropPolicy(p))
    const glPolicies = allPolicies.filter(p => isGLPolicy(p))

    // Get policy IDs that have claims at this location
    const claimPolicyIds = new Set(claims.map(c => c.policy_id).filter(Boolean))

    // For each type: include all policies with claims + fill up to 6 with most recent
    function selectPolicyYears(typePolicies) {
      const sorted = [...typePolicies].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
      const withClaims = sorted.filter(p => claimPolicyIds.has(p.policy_id))
      const withoutClaims = sorted.filter(p => !claimPolicyIds.has(p.policy_id))
      const result = [...withClaims]
      for (const p of withoutClaims) {
        if (result.length >= 6) break
        result.push(p)
      }
      return result.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
    }

    const propSorted = selectPolicyYears(propPolicies)
    const glSorted = selectPolicyYears(glPolicies)

    const today = new Date()
    const prepDate = fmtDate(today)
    const locDesc = location.description || location.street1 || ''
    const locAddr = [location.street1, location.city, location.state_id ? String(location.state_id) : '', location.postal_code].filter(Boolean).join(', ')
    const entity = client?.name || ''

    const propStart = propSorted.length > 0 ? fmtDate(propSorted[propSorted.length - 1].effective_date) : ''
    const glStart = glSorted.length > 0 ? fmtDate(glSorted[glSorted.length - 1].effective_date) : ''

    const propPolicyIds = new Set(propPolicies.map(p => p.policy_id))
    const glPolicyIds = new Set(glPolicies.map(p => p.policy_id))

    // Build workbook with both sheets
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()

    // Add logo once
    const logoPath = path.join(process.cwd(), 'public', 'templates', 'fsis-logo.png')
    let logoId = null
    if (fs.existsSync(logoPath)) {
      logoId = workbook.addImage({ buffer: fs.readFileSync(logoPath), extension: 'png' })
    }

    // Build Prop sheet
    buildSheet(workbook, 'Prop', 'Property', entity, locDesc, locAddr, prepDate, propStart, propSorted, claims, carriersByPolicy, propPolicyIds, logoId)

    // Build GL sheet
    buildSheet(workbook, 'GL', 'General Liability', entity, locDesc, locAddr, prepDate, glStart, glSorted, claims, carriersByPolicy, glPolicyIds, logoId)

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `${locDesc.replace(/[^a-zA-Z0-9 ]/g, '')} Loss Letter.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Loss letter error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
