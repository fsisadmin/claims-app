const Canvas = require('canvas')
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const fs = require('fs')

class F {
  create(w, h) { const c = Canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } }
  reset(ctx, w, h) { ctx.canvas.width = w; ctx.canvas.height = h }
  destroy(ctx) { ctx.canvas.width = 0; ctx.canvas.height = 0 }
}

// Mirror of the real ACORD_1_COORDS in the API
const COORDS = {
  form_date: { x: 505, y: 38 },
  agency_name: { x: 25, y: 68 },
  agency_contact: { x: 80, y: 102 },
  agency_phone: { x: 80, y: 133 },
  agency_fax: { x: 195, y: 133 },
  agency_email: { x: 80, y: 159 },
  agency_code: { x: 52, y: 188 },
  agency_subcode: { x: 215, y: 188 },
  agency_customer_id: { x: 130, y: 215 },
  insured_location_code: { x: 325, y: 68 },
  date_of_loss: { x: 478, y: 68 },
  time_of_loss: { x: 562, y: 68 },
  time_of_loss_ampm: { x: 590, y: 68 },
  property_carrier: { x: 310, y: 103 },
  property_naic: { x: 548, y: 103 },
  property_policy_number: { x: 310, y: 131 },
  property_line_of_business: { x: 548, y: 131 },
  flood_carrier: { x: 310, y: 163 },
  flood_naic: { x: 548, y: 163 },
  flood_policy_number: { x: 310, y: 189 },
  wind_carrier: { x: 310, y: 218 },
  wind_naic: { x: 548, y: 218 },
  wind_policy_number: { x: 310, y: 240 },
  insured_name: { x: 25, y: 280 },
  insured_address_line1: { x: 310, y: 278 },
  insured_address_line2: { x: 310, y: 293 },
  insured_dob: { x: 28, y: 312 },
  insured_fein: { x: 150, y: 312 },
  insured_marital_status: { x: 315, y: 312 },
  insured_phone_primary: { x: 115, y: 340 },
  insured_phone_secondary: { x: 295, y: 340 },
  insured_email_primary: { x: 410, y: 333 },
  insured_email_secondary: { x: 410, y: 352 },
  contact_name: { x: 25, y: 450 },
  contact_address_line1: { x: 310, y: 443 },
  contact_phone_primary: { x: 115, y: 475 },
  contact_email_primary: { x: 410, y: 468 },
  loss_street: { x: 80, y: 533 },
  loss_city_state_zip: { x: 80, y: 549 },
  loss_country: { x: 80, y: 565 },
  police_fire_contacted: { x: 475, y: 533 },
  report_number: { x: 400, y: 563 },
  loss_location_description: { x: 210, y: 582 },
  kind_of_loss_fire: { x: 57, y: 577, checkbox: true },
  kind_of_loss_lightning: { x: 107, y: 577, checkbox: true },
  kind_of_loss_flood: { x: 165, y: 577, checkbox: true },
  kind_of_loss_theft: { x: 57, y: 590, checkbox: true },
  kind_of_loss_hail: { x: 107, y: 590, checkbox: true },
  kind_of_loss_wind: { x: 165, y: 590, checkbox: true },
  probable_amount: { x: 480, y: 583 },
  description_of_loss: { x: 30, y: 632, multiline: true, maxWidth: 570 },
  reported_by: { x: 30, y: 728 },
  reported_to: { x: 315, y: 728 },
}

const TEST = {
  form_date: '4/15/2026',
  agency_name: 'Franklin Street Insurance Services',
  agency_contact: 'Eric Smith',
  agency_phone: '(813) 559-2012',
  agency_email: 'Eric.Smith@Franklinst.com',
  agency_code: 'FSIS',
  agency_customer_id: '3432',
  insured_location_code: 'LOC1',
  date_of_loss: '4/10/2026',
  time_of_loss: '10:00',
  time_of_loss_ampm: 'AM',
  property_carrier: 'Lexington Insurance Company',
  property_naic: '19437',
  property_policy_number: '061384270',
  property_line_of_business: 'PROP',
  insured_name: 'NHP Foundation',
  insured_address_line1: '1401 H ST NW',
  insured_address_line2: 'Washington, DC 20005',
  insured_fein: '52-1636004',
  insured_phone_primary: '(202) 789-7970',
  insured_email_primary: 'CGonzales@nhpfoundation.org',
  contact_name: 'Ken White',
  contact_phone_primary: '(202) 555-1234',
  contact_email_primary: 'KWhite@operationpathways.org',
  loss_street: '1600 W. Mount Royal Ave',
  loss_city_state_zip: 'Baltimore, MD 21217',
  kind_of_loss_fire: true,
  probable_amount: '$25,000',
  description_of_loss: 'Bolton North - Water discharge from a fire pump. Significant flooding damage to units 101 through 105. Emergency response called at 10:15 AM.',
  reported_by: 'Ken White',
  reported_to: 'Lexington Insurance',
}

async function main() {
  const bytes = fs.readFileSync('public/templates/acord-1-property-loss.pdf')
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.getPages()[0]
  const { height } = page.getSize()

  const draw = (key, value) => {
    const coord = COORDS[key]
    if (!coord) return
    if (coord.checkbox) {
      if (value) page.drawText('X', { x: coord.x, y: height - coord.y, size: 9, font: fontBold, color: rgb(0, 0, 0) })
      return
    }
    if (!value) return
    const size = 7
    const baseY = height - coord.y
    if (coord.multiline) {
      const words = String(value).split(/\s+/)
      const lines = []
      let line = ''
      for (const w of words) {
        const test = line ? `${line} ${w}` : w
        if (font.widthOfTextAtSize(test, size) > (coord.maxWidth || 500) && line) {
          lines.push(line)
          line = w
        } else line = test
      }
      if (line) lines.push(line)
      lines.forEach((l, i) => page.drawText(l, { x: coord.x, y: baseY - i * (size + 2), size, font, color: rgb(0, 0, 0) }))
    } else {
      page.drawText(String(value), { x: coord.x, y: baseY, size, font, color: rgb(0, 0, 0) })
    }
  }

  for (const [k, v] of Object.entries(TEST)) draw(k, v)

  const out = await pdf.save({ useObjectStreams: false })
  fs.writeFileSync('scripts/acord-test-filled3.pdf', out)

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(out),
    canvasFactory: new F(),
    cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
  }).promise
  const p = await doc.getPage(1)
  const vp = p.getViewport({ scale: 2 })
  const f = new F()
  const cc = f.create(vp.width, vp.height)
  await p.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise
  fs.writeFileSync('scripts/acord-test-filled3.png', cc.canvas.toBuffer('image/png'))
  console.log('Wrote scripts/acord-test-filled3.png')
}

main().catch(e => console.error('Err:', e.message))
