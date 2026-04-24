/**
 * ACORD form coordinate preview tool
 *
 * Usage:
 *   node scripts/acord-preview.cjs acord_1
 *   node scripts/acord-preview.cjs acord_1 --grid          # overlay coordinate grid on top
 *   node scripts/acord-preview.cjs acord_1 --labels        # label each field with its name (shows empty fields too)
 *   node scripts/acord-preview.cjs acord_3
 *
 * Outputs:
 *   scripts/acord_1-preview.pdf   (open in any PDF viewer)
 *   scripts/acord_1-preview.png   (rendered preview image)
 *
 * Workflow:
 *   1. Open scripts/acord_1-preview.pdf in your PDF viewer to see how the current
 *      coordinates land on the real template.
 *   2. Edit scripts/acord-coords.json - change any field's x/y/maxWidth.
 *   3. Re-run this script. Check the preview again.
 *   4. Repeat until fields line up.
 *   5. When happy, copy the coords from acord-coords.json into
 *      app/api/origami/acord-pdf/route.js (the ACORD_1_COORDS constant).
 *
 * Grid reference (when --grid is used):
 *   - Red horizontal lines every 25 PDF points (labels on the left edge)
 *   - Red vertical lines every 25 PDF points (labels on the top edge)
 *   - Page is 612x792 points (letter, origin top-left in this tool)
 */

const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const Canvas = require('canvas')
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')

const formType = process.argv[2] || 'acord_1'
const showGrid = process.argv.includes('--grid')
const showLabels = process.argv.includes('--labels')

// Sample test data to see how real values render
const TEST_DATA = {
  form_date: '4/15/2026',
  agency_name: 'Franklin Street Insurance Services, LLC\n1311 N. Westshore Blvd., Suite 200\nTampa, FL 33607',
  agency_contact: 'Eric Smith',
  agency_phone: '(813) 559-2012',
  agency_fax: '(813) 555-0000',
  agency_email: 'Eric.Smith@Franklinst.com',
  agency_code: 'FSIS',
  agency_subcode: '001',
  agency_customer_id: '3432',

  insured_location_code: 'LOC1',
  date_of_loss: '4/10/2026',
  time_of_loss: '10:00',
  time_of_loss_ampm: 'AM',

  property_carrier: 'Lexington Insurance Company',
  property_naic: '19437',
  property_policy_number: '061384270',
  property_line_of_business: 'PROP',

  flood_carrier: 'Wright Flood',
  flood_naic: '10194',
  flood_policy_number: 'FL-12345',

  wind_carrier: 'Citizens',
  wind_naic: '10064',
  wind_policy_number: 'WD-98765',

  insured_name: 'NHP Foundation',
  insured_address_line1: '1401 H ST NW',
  insured_address_line2: 'Washington, DC 20005',
  insured_dob: '01/01/1990',
  insured_fein: '52-1636004',
  insured_marital_status: 'N/A',
  insured_phone_primary: '(202) 789-7970',
  insured_phone_secondary: '(202) 555-1111',
  insured_email_primary: 'CGonzales@nhpfoundation.org',
  insured_email_secondary: 'info@nhpfoundation.org',

  contact_name: 'Ken White',
  contact_address_line1: '1600 W. Mount Royal Ave',
  contact_address_line2: 'Baltimore, MD 21217',
  contact_phone_primary: '(202) 555-1234',
  contact_phone_secondary: '(202) 555-5678',
  contact_when: 'Business Hours',
  contact_email_primary: 'KWhite@operationpathways.org',
  contact_email_secondary: 'backup@opp.org',

  loss_street: '1600 W. Mount Royal Ave',
  loss_city_state_zip: 'Baltimore, MD 21217',
  loss_country: 'USA',
  police_fire_contacted: 'Baltimore FD',
  report_number: 'BFD-2026-001',
  loss_location_description: 'Unit 1207 - common area',

  kind_of_loss_fire: true,
  kind_of_loss_lightning: false,
  kind_of_loss_flood: false,
  kind_of_loss_theft: false,
  kind_of_loss_hail: false,
  kind_of_loss_wind: false,
  kind_of_loss_other: 'Water damage',

  probable_amount: '$25,000',

  description_of_loss: 'Bolton North - Water discharge from a fire pump. Significant flooding damage to units 101 through 105. Emergency response called at 10:15 AM.',

  reported_by: 'Ken White',
  reported_to: 'Lexington Insurance',
}

class CanvasFactory {
  create(w, h) { const c = Canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } }
  reset(ctx, w, h) { ctx.canvas.width = w; ctx.canvas.height = h }
  destroy(ctx) { ctx.canvas.width = 0; ctx.canvas.height = 0 }
}

async function main() {
  // Load coordinate map
  const coordsJson = JSON.parse(fs.readFileSync('scripts/acord-coords.json', 'utf8'))
  const coords = coordsJson[formType]
  if (!coords) {
    console.error(`No coordinates for formType "${formType}". Available: ${Object.keys(coordsJson).filter(k => k !== '_comment').join(', ')}`)
    process.exit(1)
  }

  const templateName = formType === 'acord_3' ? 'acord-3-liability.pdf' : 'acord-1-property-loss.pdf'
  const templatePath = path.join('public', 'templates', templateName)
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`)
    process.exit(1)
  }

  const bytes = fs.readFileSync(templatePath)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.getPages()[0]
  const { width, height } = page.getSize()

  // Draw coordinate grid if requested
  if (showGrid) {
    const gridColor = rgb(0.85, 0.2, 0.2)
    const labelColor = rgb(0.6, 0.1, 0.1)
    for (let x = 0; x <= width; x += 25) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.3, color: gridColor, opacity: 0.5 })
      if (x % 50 === 0) {
        page.drawText(String(x), { x: x + 1, y: height - 10, size: 6, font, color: labelColor })
      }
    }
    for (let y = 0; y <= height; y += 25) {
      page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.3, color: gridColor, opacity: 0.5 })
      if (y % 50 === 0) {
        // Label on left edge — y is from bottom in PDF, but we label it as "y from top"
        page.drawText(String(y), { x: 2, y: y - 3, size: 6, font, color: labelColor })
      }
    }
  }

  // Draw each field
  const draw = (key, coord, overrideValue) => {
    if (!coord) return
    if (coord.options) {
      const value = overrideValue !== undefined ? overrideValue : TEST_DATA[key]
      const picked = coord.options[String(value || '').toUpperCase().trim()]
      if (picked) {
        page.drawText('X', { x: picked.x, y: height - picked.y, size: 9, font: fontBold, color: rgb(0, 0, 0) })
      }
      return
    }
    if (coord.checkbox) {
      const value = overrideValue !== undefined ? overrideValue : TEST_DATA[key]
      if (value === true || value === 'true') {
        page.drawText('X', { x: coord.x, y: height - coord.y, size: 9, font: fontBold, color: rgb(0, 0, 0) })
      } else if (showLabels) {
        // Draw a small empty box marker so we can see where it is
        page.drawText('□', { x: coord.x, y: height - coord.y, size: 10, font, color: rgb(0.2, 0.6, 0.2) })
      }
      return
    }
    const value = overrideValue !== undefined ? overrideValue : TEST_DATA[key]
    const displayValue = showLabels ? (value ? `${value}` : `[${key}]`) : value
    if (!displayValue) return
    const size = 7
    const baseY = height - coord.y
    const color = showLabels ? rgb(0, 0.4, 0) : rgb(0, 0, 0)

    if (coord.multiline) {
      const maxWidth = coord.maxWidth || 500
      const segments = coord.splitOnNewline ? String(displayValue).split(/\n/) : [String(displayValue)]
      const lines = []
      for (const segment of segments) {
        const words = segment.split(/\s+/).filter(Boolean)
        let line = ''
        for (const w of words) {
          const test = line ? `${line} ${w}` : w
          if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
            lines.push(line)
            line = w
          } else line = test
        }
        if (line) lines.push(line)
        else if (segment === '') lines.push('')
      }
      lines.forEach((l, i) => page.drawText(l, { x: coord.x, y: baseY - i * (size + 2), size, font, color }))
    } else {
      let display = String(displayValue)
      if (coord.maxWidth) {
        let w = font.widthOfTextAtSize(display, size)
        while (w > coord.maxWidth && display.length > 1) {
          display = display.slice(0, -1)
          w = font.widthOfTextAtSize(display, size)
        }
      }
      page.drawText(display, { x: coord.x, y: baseY, size, font, color })
    }
  }

  // Draw all fields defined in coords (skip _comment and other meta keys)
  for (const [key, coord] of Object.entries(coords)) {
    if (key.startsWith('_')) continue
    draw(key, coord)
  }

  // Save PDF
  const out = await pdf.save({ useObjectStreams: false })
  const pdfOut = `scripts/${formType}-preview.pdf`
  fs.writeFileSync(pdfOut, out)
  console.log(`✓ Wrote ${pdfOut}`)

  // Render first page to PNG for quick viewing
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(out),
    canvasFactory: new CanvasFactory(),
    cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
  }).promise
  const p = await doc.getPage(1)
  const vp = p.getViewport({ scale: 2 })
  const f = new CanvasFactory()
  const cc = f.create(vp.width, vp.height)
  await p.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise
  const pngOut = `scripts/${formType}-preview.png`
  fs.writeFileSync(pngOut, cc.canvas.toBuffer('image/png'))
  console.log(`✓ Wrote ${pngOut}`)

  console.log('\nOpen the preview files to see the result. Edit scripts/acord-coords.json to tune.')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
