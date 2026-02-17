import { NextResponse } from 'next/server'
import path from 'path'

const PROPERTY_CONFIG = {
  template: 'property-template.xlsx',
  sheet: 'Claim Details',
  dataStartRow: 17,
  columns: {
    1: { field: 'policy_number' },
    3: { field: 'carrier' },
    4: { field: 'claim_number' },
    5: { field: 'loss_date', type: 'date' },
    6: { field: 'property_name' },
    7: { field: 'location_city' },
    8: { field: 'location_state' },
    10: { field: 'loss_description' },
    11: { field: 'cause_of_loss' },
    12: { field: 'claim_type' },
    14: { field: 'total_incurred', type: 'currency' },
    15: { field: 'total_paid', type: 'currency' },
    16: { field: 'total_reserved', type: 'currency' },
    18: { field: 'status' },
  },
}

const LIABILITY_CONFIG = {
  template: 'liability-template.xlsx',
  sheet: 'Claim Detail',
  dataStartRow: 12,
  columns: {
    1: { field: 'policy_number' },
    2: { field: '_clientName' },
    3: { field: 'carrier' },
    4: { field: 'tpa_claim_number' },
    8: { field: 'claim_number' },
    10: { field: 'claimant' },
    11: { field: 'loss_date', type: 'date' },
    12: { field: 'property_name' },
    13: { field: 'location_city' },
    14: { field: 'location_state' },
    15: { field: 'loss_description' },
    16: { field: 'cause_of_loss' },
    17: { field: 'deductible', type: 'currency' },
    19: { field: 'total_reserved', type: 'currency' },
    22: { field: 'total_paid', type: 'currency' },
    27: { field: 'status' },
  },
}

export async function POST(request) {
  try {
    const XlsxPopulate = require('xlsx-populate')
    const { claims, coverageType, clientName } = await request.json()

    const config = coverageType === 'Property' ? PROPERTY_CONFIG : LIABILITY_CONFIG
    const templatePath = path.join(process.cwd(), 'public', 'templates', config.template)

    const workbook = await XlsxPopulate.fromFileAsync(templatePath)
    const sheet = workbook.sheet(config.sheet)

    if (!sheet) {
      return NextResponse.json(
        { error: `Sheet "${config.sheet}" not found in template` },
        { status: 400 }
      )
    }

    // Log sample data for debugging
    if (claims.length > 0) {
      const sample = claims[0]
      console.log(`[Export] ${coverageType}: ${claims.length} claims`)
      console.log(`[Export] Sample claim fields:`, {
        claim_number: sample.claim_number,
        total_incurred: sample.total_incurred,
        total_paid: sample.total_paid,
        total_reserved: sample.total_reserved,
      })
    }

    let cellsWritten = 0
    claims.forEach((claim, idx) => {
      const rowNum = config.dataStartRow + idx

      Object.entries(config.columns).forEach(([colStr, colConfig]) => {
        const col = parseInt(colStr)
        const cell = sheet.cell(rowNum, col)

        // Skip cells that have formulas
        if (cell.formula()) return

        let value
        if (colConfig.field === '_clientName') {
          value = clientName || ''
        } else {
          value = claim[colConfig.field]
        }

        if (value === null || value === undefined || value === '') {
          return
        }

        if (colConfig.type === 'date' && value) {
          cell.value(new Date(value))
        } else if (colConfig.type === 'currency') {
          const numVal = typeof value === 'number' ? value : parseFloat(value) || 0
          cell.value(numVal)
        } else {
          cell.value(String(value))
        }
        cellsWritten++
      })
    })

    console.log(`[Export] Total cells written: ${cellsWritten}`)

    const buffer = await workbook.outputAsync()
    const safeName = (clientName || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    const typeName = coverageType === 'Property' ? 'Property_Loss_Summary' : 'Liability_Loss_Summary'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}_${typeName}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
