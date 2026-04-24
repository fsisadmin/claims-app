import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import fs from 'fs'

const data = new Uint8Array(fs.readFileSync('public/templates/acord-1-property-loss.pdf'))
const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise
console.log('Pages:', doc.numPages)

for (let pageNum = 1; pageNum <= Math.min(doc.numPages, 1); pageNum++) {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1 })
  console.log(`\n=== Page ${pageNum} (${viewport.width} x ${viewport.height}) ===`)
  const content = await page.getTextContent()
  content.items.forEach(item => {
    if (!item.str.trim()) return
    const [, , , , e, f] = item.transform
    console.log(`x=${Math.round(e)}, y=${Math.round(f)}, w=${Math.round(item.width)}: "${item.str}"`)
  })
}
