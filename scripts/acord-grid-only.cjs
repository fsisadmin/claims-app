/**
 * Generates a clean grid overlay on the ACORD template — no field data, just
 * the red coordinate grid so you can read off x/y values for each form box.
 *
 * Usage:
 *   node scripts/acord-grid-only.cjs acord_1
 *   node scripts/acord-grid-only.cjs acord_3
 */

const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const Canvas = require('canvas')
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')

const formType = process.argv[2] || 'acord_1'

class CanvasFactory {
  create(w, h) { const c = Canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } }
  reset(ctx, w, h) { ctx.canvas.width = w; ctx.canvas.height = h }
  destroy(ctx) { ctx.canvas.width = 0; ctx.canvas.height = 0 }
}

async function main() {
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

  const fineColor = rgb(0.95, 0.5, 0.5)
  const majorColor = rgb(0.85, 0.15, 0.15)
  const labelColor = rgb(0.6, 0.05, 0.05)

  // Fine grid every 5 pts (very light)
  for (let x = 0; x <= width; x += 5) {
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.15, color: fineColor, opacity: 0.25 })
  }
  for (let y = 0; y <= height; y += 5) {
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.15, color: fineColor, opacity: 0.25 })
  }

  // Major grid every 25 pts (medium)
  for (let x = 0; x <= width; x += 25) {
    const thickness = x % 50 === 0 ? 0.5 : 0.3
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness, color: majorColor, opacity: 0.6 })
  }
  for (let y = 0; y <= height; y += 25) {
    const thickness = y % 50 === 0 ? 0.5 : 0.3
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness, color: majorColor, opacity: 0.6 })
  }

  // Labels every 50 pts
  // X labels on top AND bottom
  for (let x = 0; x <= width; x += 50) {
    page.drawText(String(x), { x: x + 1, y: height - 8, size: 7, font: fontBold, color: labelColor })
    page.drawText(String(x), { x: x + 1, y: 4, size: 7, font: fontBold, color: labelColor })
  }
  // Y labels on left AND right edges
  // y in our coord system is "from TOP" — but pdf-lib y is from bottom.
  // So a label saying "y=100" should appear at height-100 in pdf-lib coords.
  for (let y = 0; y <= height; y += 50) {
    page.drawText(String(y), { x: 2, y: height - y - 3, size: 7, font: fontBold, color: labelColor })
    page.drawText(String(y), { x: width - 22, y: height - y - 3, size: 7, font: fontBold, color: labelColor })
  }

  // Axis legend in top-left corner
  page.drawRectangle({ x: 610, y: 760, width: 2, height: 2, color: rgb(0, 0, 1) })
  page.drawText('x = left to right, y = top to bottom (baseline)', {
    x: 62, y: height - 8, size: 6, font, color: rgb(0, 0, 0.6),
  })

  const out = await pdf.save({ useObjectStreams: false })
  const pdfOut = `scripts/${formType}-grid.pdf`
  fs.writeFileSync(pdfOut, out)
  console.log(`✓ Wrote ${pdfOut}`)

  // Render to PNG at 3x for high-res viewing
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(out),
    canvasFactory: new CanvasFactory(),
    cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
  }).promise
  const p = await doc.getPage(1)
  const vp = p.getViewport({ scale: 3 })
  const f = new CanvasFactory()
  const cc = f.create(vp.width, vp.height)
  await p.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise
  const pngOut = `scripts/${formType}-grid.png`
  fs.writeFileSync(pngOut, cc.canvas.toBuffer('image/png'))
  console.log(`✓ Wrote ${pngOut}`)

  console.log('\nOpen the PDF in a PDF viewer for best accuracy. Zoom in to read field positions.')
  console.log('Y values are "baseline from top" — that is what you put in scripts/acord-coords.json.')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
