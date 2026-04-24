import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// ACORD 1 Property Loss Notice (2013/01) — coordinate map
// Page 1 of 3, letter size 612x792 pts.
// coord.y = baseline-from-top in PDF points (helper converts to pdf-lib bottom-up).
const ACORD_1_COORDS = {
  // Header row
  form_date: { x: 540, y: 38 },

  // Agency block (top-left) - each row label is above, text sits on the line below
  agency_name: { x: 25, y: 60, maxWidth: 280, multiline: true, splitOnNewline: true },
  agency_contact: { x: 80, y: 112, maxWidth: 220 },
  agency_phone: { x: 80, y: 123, maxWidth: 100 },
  agency_fax: { x: 80, y: 135, maxWidth: 100 },
  agency_email: { x: 80, y: 148, maxWidth: 220 },
  agency_code: { x: 52, y: 159, maxWidth: 100 },
  agency_subcode: { x: 215, y: 159, maxWidth: 100 },
  agency_customer_id: { x: 100, y: 173, maxWidth: 175 },

  // Policy block (top-right)
  insured_location_code: { x: 325, y: 64, maxWidth: 130 },
  date_of_loss: { x: 478, y: 64, maxWidth: 78 },
  time_of_loss: { x: 530, y: 64, maxWidth: 25 },
  time_of_loss_ampm: { options: { AM: { x: 570, y: 54}, PM: { x: 570, y: 65 } } },

  // Property/Home Policy
  property_carrier: { x: 310, y: 100, maxWidth: 230 },
  property_naic: { x: 548, y: 100, maxWidth: 50 },
  property_policy_number: { x: 310, y: 123, maxWidth: 230 },
 

  // Flood Policy
  flood_carrier: { x: 310, y: 156, maxWidth: 230 },
  flood_naic: { x: 548, y: 156, maxWidth: 50 },
  flood_policy_number: { x: 310, y: 181, maxWidth: 290 },

  // Wind Policy
  wind_carrier: { x: 310, y: 218, maxWidth: 230 },
  wind_naic: { x: 548, y: 218, maxWidth: 50 },
  wind_policy_number: { x: 310, y: 240, maxWidth: 290 },

  // INSURED section
  insured_name: { x: 25, y: 280, maxWidth: 280 },
  insured_address_line1: { x: 310, y: 278, maxWidth: 290 },
  insured_address_line2: { x: 310, y: 293, maxWidth: 290 },
  insured_dob: { x: 28, y: 304, maxWidth: 95 },
  insured_fein: { x: 150, y: 304, maxWidth: 130 },
  insured_marital_status: { x: 250, y: 304, maxWidth: 280 },
  insured_phone_primary_type: { options: { HOME: { x: 65, y: 316.5 }, BUS: { x: 97, y: 316.5 }, CELL: { x: 127, y: 316.5 } } },
  insured_phone_primary: { x: 28, y: 329, maxWidth: 175 },
  insured_phone_secondary_type: { options: { HOME: { x: 210, y: 316.5}, BUS: { x: 243, y: 316.5 }, CELL: { x: 271.5, y: 316.5 } } },
  insured_phone_secondary: { x: 175, y: 329, maxWidth: 180 },
  insured_email_primary: { x: 410, y: 315, maxWidth: 190 },
  insured_email_secondary: { x: 410, y: 329, maxWidth: 190 },

  // SPOUSE section
  spouse_name: { x: 25, y: 353, maxWidth: 280 },
  spouse_address_line1: { x: 310, y: 350, maxWidth: 290 },
  spouse_address_line2: { x: 310, y: 365, maxWidth: 290 },
  spouse_dob: { x: 28, y: 375, maxWidth: 95 },
  spouse_fein: { x: 150, y: 375, maxWidth: 130 },
  spouse_marital_status: { x: 250, y: 375, maxWidth: 280 },
  spouse_phone_primary_type: { options: { HOME: { x: 65, y: 389 }, BUS: { x: 97, y: 389 }, CELL: { x: 127, y: 389 } } },
  spouse_phone_primary: { x: 28, y: 401, maxWidth: 175 },
  spouse_phone_secondary_type: { options: { HOME: { x: 210, y: 389 }, BUS: { x: 243, y: 389 }, CELL: { x: 272, y: 389 } } },
  spouse_phone_secondary: { x: 175, y: 401, maxWidth: 180 },
  spouse_email_primary: { x: 410, y: 388, maxWidth: 190 },
  spouse_email_secondary: { x: 410, y: 402, maxWidth: 190 },

  // CONTACT section
  contact_insured: { x: 108, y: 412, checkbox: true },
  contact_name: { x: 25, y: 435, maxWidth: 280 },
  contact_address_line1: { x: 310, y: 438, maxWidth: 290 },
  contact_address_line2: { x: 310, y: 453, maxWidth: 290 },
  contact_phone_primary_type: { options: { HOME: { x: 65, y: 449.5 }, BUS: { x: 97, y: 449.5 }, CELL: { x: 127, y: 449.5 } } },
  contact_phone_primary: { x: 28, y: 460, maxWidth: 175 },
  contact_phone_secondary_type: { options: { HOME: { x: 210, y: 449.5 }, BUS: { x: 243, y: 449.5 }, CELL: { x: 272, y: 449.5 } } },
  contact_phone_secondary: { x: 175, y: 460, maxWidth: 180 },
  contact_when: { x:25, y: 485, maxWidth: 200 },
  contact_email_primary: { x: 410, y: 472, maxWidth: 190 },
  contact_email_secondary: { x: 410, y: 485.5, maxWidth: 190 },

  // LOSS section
  loss_street: { x: 80, y: 521, maxWidth: 220 },
  loss_city_state_zip: { x: 80, y: 533, maxWidth: 220 },
  loss_country: { x: 80, y: 545, maxWidth: 220 },
  police_fire_contacted: { x: 390, y: 521, maxWidth: 130 },
  report_number: { x: 390, y: 545, maxWidth: 200 },
  loss_location_description: { x: 210, y: 582, maxWidth: 395 },

  // Kind of loss — checkbox X marks (row 1: FIRE/LIGHTNING/FLOOD, row 2: THEFT/HAIL/WIND)
  kind_of_loss_fire: { x: 55, y: 570, checkbox: true },
  kind_of_loss_lightning: { x: 105, y: 570, checkbox: true },
  kind_of_loss_flood: { x: 163, y: 570, checkbox: true },
  kind_of_loss_theft: { x: 55, y: 583, checkbox: true },
  kind_of_loss_hail: { x: 105, y: 583, checkbox: true },
  kind_of_loss_wind: { x: 163, y: 583, checkbox: true },
  kind_of_loss_other_checkbox: { x: 215, y: 570, checkbox: true },
  kind_of_loss_other: { x: 230, y: 570, maxWidth: 250 },

  probable_amount: { x: 480, y: 580, maxWidth: 125 },

  description_of_loss: { x: 25, y: 602, maxWidth: 570, multiline: true },

  reported_by: { x: 30, y: 735, maxWidth: 280 },
  reported_to: { x: 315, y: 735, maxWidth: 280 },
}

// Page 2 — Remarks field
const ACORD_1_PAGE_2 = {
  agency_customer_id: { x: 425, y: 31, maxWidth: 150 },
  remarks: { x: 30, y:65, maxWidth: 550, multiline: true },
}

// Page 3 — Agency Customer ID only
const ACORD_1_PAGE_3 = {
  agency_customer_id: { x: 425, y: 31, maxWidth: 150 },
}

// ACORD 3 General Liability Notice of Occurrence/Claim (2013/01)
// Page 1 — same top structure as ACORD 1 but single policy block + occurrence + type of liability
const ACORD_3_COORDS = {
  // Header
  form_date: { x: 540, y: 42 },

  // Agency block (same layout as ACORD 1)
  agency_name: { x: 25, y: 70, maxWidth: 280, multiline: true, splitOnNewline: true },
  agency_contact: { x: 80, y: 116, maxWidth: 220 },
  agency_phone: { x: 80, y: 128.5, maxWidth: 100 },
  agency_fax: { x: 80, y: 140, maxWidth: 100 },
  agency_email: { x: 80, y: 153, maxWidth: 220 },
  agency_code: { x: 52, y: 166, maxWidth: 100 },
  agency_subcode: { x: 215, y: 166, maxWidth: 100 },
  agency_customer_id: { x: 100, y: 178, maxWidth: 175 },

  // Policy block (right side — single policy, no flood/wind)
  insured_location_code: { x: 325, y: 67, maxWidth: 130 },
  date_of_loss: { x: 478, y: 67, maxWidth: 78 },
  time_of_loss: { x: 530, y: 67, maxWidth: 25 },
  time_of_loss_ampm: { options: { AM: { x: 570, y: 57 }, PM: { x: 570, y: 70 } } },

  // Carrier / Policy
  property_carrier: { x: 310, y: 93, maxWidth: 230 },
  property_naic: { x: 548, y: 93, maxWidth: 50 },
  property_policy_number: { x: 310, y: 118, maxWidth: 290 },

  // INSURED section
  insured_name: { x: 25, y: 212, maxWidth: 280 },
  insured_address_line1: { x: 310, y: 210, maxWidth: 290 },
  insured_address_line2: { x: 310, y: 222, maxWidth: 290 },
  insured_dob: { x: 28, y: 235, maxWidth: 95 },
  insured_fein: { x: 140, y: 235, maxWidth: 130 },
  insured_phone_primary_type: { options: { HOME: { x: 65, y: 248.2 }, BUS: { x: 97, y: 248.2 }, CELL: { x: 127, y: 248.2 } } },
  insured_phone_primary: { x: 28, y: 260.5, maxWidth: 140 },
  insured_phone_secondary_type: { options: { HOME: { x: 210, y: 248.2 }, BUS: { x: 243, y: 248.2}, CELL: { x: 272, y: 248.2 } } },
  insured_phone_secondary: { x: 175, y: 260.5, maxWidth: 140 },
  insured_email_primary: { x: 410, y: 247, maxWidth: 190 },
  insured_email_secondary: { x: 410, y: 260.5, maxWidth: 190 },

  // CONTACT section
  contact_insured: { x: 108, y: 275, checkbox: true },
  contact_name: { x: 25, y: 295, maxWidth: 280 },
  contact_address_line1: { x: 310, y: 295, maxWidth: 290 },
  contact_address_line2: { x: 310, y: 310, maxWidth: 290 },
  contact_phone_primary_type: { options: { HOME: { x: 65, y: 310 }, BUS: { x: 97, y: 310 }, CELL: { x: 127, y: 310 } } },
  contact_phone_primary: { x: 25, y: 322, maxWidth: 140 },
  contact_phone_secondary_type: { options: { HOME: { x: 210, y: 310 }, BUS: { x: 243, y: 310 }, CELL: { x: 272, y: 310 } } },
  contact_phone_secondary: { x: 175, y: 322, maxWidth: 140 },
  contact_when: { x: 25, y: 342, maxWidth: 200 },
  contact_email_primary: { x: 410, y: 332, maxWidth: 190 },
  contact_email_secondary: { x: 410, y: 345, maxWidth: 190 },

  // OCCURRENCE section
  loss_street: { x: 80, y: 377, maxWidth: 220 },
  loss_city_state_zip: { x: 80, y: 392, maxWidth: 220 },
  loss_country: { x: 80, y: 405, maxWidth: 220 },
  police_fire_contacted: { x: 385, y: 377.5, maxWidth: 200 },
  report_number: { x: 385, y: 405, maxWidth: 200 },
  loss_location_description: { x: 210, y: 425, maxWidth: 395 },
  description_of_loss: { x: 25, y: 445, maxWidth: 570, multiline: true },

  // TYPE OF LIABILITY — Premises
  premises_owner: { x: 105, y: 598, checkbox: true },
  premises_tenant: { x: 153, y: 598, checkbox: true },
  premises_other: { x: 200, y: 598, checkbox: true },
  premises_other_text: { x: 215, y: 598, maxWidth: 90 },
  type_of_premises: { x: 310, y: 605, maxWidth: 190 },
  owner_name: { x: 25, y: 618, maxWidth: 280 },
  owner_address_1: { x: 25, y: 630, maxWidth: 280 },
  owner_address_2: { x: 25, y: 642, maxWidth: 280 },
  owner_phone_primary_type: { options: { HOME: { x: 354, y: 620.5 }, BUS: { x: 385, y: 620.5}, CELL: { x: 415, y: 620.5} } },
  owner_phone_primary: { x: 330, y: 632, maxWidth: 120 },
  owner_phone_secondary_type: { options: { HOME: { x: 498.5, y: 620.5}, BUS: { x: 529.5, y: 620.5}, CELL: { x: 559.5, y: 620.5} } },
  owner_phone_secondary: { x: 470, y: 632, maxWidth: 120 },
  owner_email_primary: { x: 410, y: 646, maxWidth: 260 },
  owner_email_secondary: { x: 410, y: 658, maxWidth: 260 },

  // TYPE OF LIABILITY — Products
  products_manufacturer: { x: 105, y: 670, checkbox: true },
  products_vendor: { x: 175, y: 670, checkbox: true },
  products_other: { x: 225, y: 670, checkbox: true },
  products_other_text: { x: 240, y: 670, maxWidth: 90 },
  type_of_product: { x: 310, y: 676, maxWidth: 190 },
  manufacturer_name: { x: 25, y: 690, maxWidth: 280 },
  manufacturer_address_1: { x: 25, y: 702, maxWidth: 280 },
  manufacturer_address_2: { x: 25, y: 714, maxWidth: 280 },
  mfr_phone_primary_type: { options: { HOME: { x: 354, y: 693 }, BUS: { x: 385, y: 693 }, CELL: { x: 415, y: 693 } } },
  mfr_phone_primary: { x: 330, y: 705, maxWidth: 120 },
  mfr_phone_secondary_type: { options: { HOME: { x: 498.5, y: 693 }, BUS: { x: 529.5, y: 693 }, CELL: { x: 559.5, y: 693 } } },
  mfr_phone_secondary: { x: 470, y: 705, maxWidth: 120 },
  mfr_email_primary: { x: 410, y: 717, maxWidth: 260 },
  mfr_email_secondary: { x: 410, y: 730, maxWidth: 260 },
  where_product_seen: { x: 150, y: 740, maxWidth: 570 },
}

// ACORD 3 Page 2 coords
const ACORD_3_PAGE_2 = {
  // Agency Customer ID (top-right, like date on page 1)
  agency_customer_id: { x:425, y: 32, maxWidth: 125 },

  // INJURED / PROPERTY DAMAGED
  injured_name: { x: 25, y: 65, maxWidth: 280 },
  injured_address_1: { x: 25, y: 80, maxWidth: 280 },
  injured_address_2: { x: 25, y: 95, maxWidth: 280 },
  employer_name: { x: 310, y: 65, maxWidth: 290 },
  employer_address_1: { x: 310, y: 80, maxWidth: 290 },
  employer_address_2: { x: 310, y: 95, maxWidth: 290 },

  // Injured phones/emails
  injured_phone_primary_type: { options: { HOME: { x: 65, y: 112 }, BUS: { x: 97, y: 112 }, CELL: { x: 127, y: 112 } } },
  injured_phone_primary: { x: 28, y: 123, maxWidth: 140 },
  injured_phone_secondary_type: { options: { HOME: { x: 210, y: 112 }, BUS: { x: 243, y: 112 }, CELL: { x: 272, y: 112 } } },
  injured_phone_secondary: { x: 200, y: 123, maxWidth: 140 },
  injured_email_primary: { x: 125, y: 135, maxWidth: 280 },
  injured_email_secondary: { x: 125, y: 147, maxWidth: 280 },

  // Employer phones/emails
  employer_phone_primary_type: { options: { HOME: { x: 353, y: 112 }, BUS: { x: 385, y: 112 }, CELL: { x: 415, y: 112 } } },
  employer_phone_primary: { x: 320, y: 123, maxWidth: 140 },
  employer_phone_secondary_type: { options: { HOME: { x: 497, y: 112 }, BUS: { x: 529, y: 112 }, CELL: { x: 559, y: 112 } } },
  employer_phone_secondary: { x: 460, y: 123, maxWidth: 140 },
  employer_email_primary: { x: 405, y: 135, maxWidth: 290 },
  employer_email_secondary: { x: 405, y: 147, maxWidth: 290 },

  injured_age: { x: 30, y: 170, maxWidth: 40 },
  injured_sex: { x: 55, y: 170, maxWidth: 30 },
  injured_occupation: { x: 80, y: 170, maxWidth: 180 },
  describe_injury: { x: 310, y: 170, maxWidth: 290, multiline: true },
  where_taken: { x: 25, y: 195, maxWidth: 280 },
  what_injured_doing: { x: 310, y: 195, maxWidth: 290 },
  describe_property: { x: 25, y: 217, maxWidth: 260, multiline: true },
  estimate_amount: { x: 280, y: 217, maxWidth: 100 },
  where_property_seen: { x: 350, y: 217, maxWidth: 180 },

  // WITNESSES (3 rows)
  witness1_name: { x: 25, y: 250, maxWidth: 280 },
  witness1_address_1: { x: 25, y: 260, maxWidth: 280 },
  witness1_address_2: { x: 25, y: 270, maxWidth: 280 },
  witness1_phone_type: { options: { HOME: { x: 353, y: 244 }, BUS: { x: 386.5, y: 244 }, CELL: { x: 415, y: 244 } } },
  witness1_phone: { x: 310, y: 254, maxWidth: 140 },
  witness1_phone2_type: { options: { HOME: { x: 497, y: 244 }, BUS: { x: 529, y: 244 }, CELL: { x: 559, y: 244 } } },
  witness1_phone2: { x: 460, y: 254, maxWidth: 140 },
  witness1_email: { x: 405, y: 267, maxWidth: 290 },
  witness1_email2: { x: 405, y: 278, maxWidth: 290 },

  witness2_name: { x: 25, y: 299, maxWidth: 280 },
  witness2_address_1: { x: 25, y: 309, maxWidth: 280 },
  witness2_address_2: { x: 25, y: 319, maxWidth: 280 },
  witness2_phone_type: { options: { HOME: { x: 353, y: 291}, BUS: { x: 386.5, y: 291 }, CELL: { x: 415, y: 291 } } },
  witness2_phone: { x: 310, y: 303, maxWidth: 140 },
  witness2_phone2_type: { options: { HOME: { x: 497, y: 291 }, BUS: { x: 529, y: 291 }, CELL: { x: 559, y: 291 } } },
  witness2_phone2: { x: 460, y: 303, maxWidth: 140 },
  witness2_email: { x: 405, y: 314, maxWidth: 290 },
  witness2_email2: { x: 405, y: 327, maxWidth: 290 },

  witness3_name: { x: 25, y: 350, maxWidth: 280 },
  witness3_address_1: { x: 25, y: 360, maxWidth: 280 },
  witness3_address_2: { x: 25, y: 370, maxWidth: 280 },
  witness3_phone_type: { options: { HOME: { x: 353, y: 339 }, BUS: { x: 386.5, y: 339 }, CELL: { x: 415, y: 339 } } },
  witness3_phone: { x: 310, y: 420, maxWidth: 140 },
  witness3_phone2_type: { options: { HOME: { x: 497, y: 339 }, BUS: { x: 529, y: 339 }, CELL: { x: 559, y: 339 } } },
  witness3_phone2: { x: 460, y: 420, maxWidth: 140 },
  witness3_email: { x: 405, y: 435, maxWidth: 290 },
  witness3_email2: { x: 405, y: 448, maxWidth: 290 },

  // REMARKS
  remarks: { x: 30, y: 420, maxWidth: 550, multiline: true },

  // REPORTED BY / TO
  reported_by: { x: 30, y: 750, maxWidth: 280 },
  reported_to: { x: 315, y: 750, maxWidth: 280 },
}

// ACORD 3 Page 3 coords
const ACORD_3_PAGE_3 = {
  // Agency Customer ID (top-right, like date on page 1)
  agency_customer_id: { x: 425, y: 32, maxWidth: 125 },
}

// ACORD 3 Page 4 coords
const ACORD_3_PAGE_4 = {
  agency_customer_id: { x: 425, y: 32, maxWidth: 125 },
}

export async function POST(request) {
  try {
    const { formType, formData } = await request.json()
    if (!formType || !formData) {
      return NextResponse.json({ error: 'Missing formType or formData' }, { status: 400 })
    }

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

    const templatePath = path.join(
      process.cwd(),
      'public',
      'templates',
      formType === 'acord_3' ? 'acord-3-liability.pdf' : 'acord-1-property-loss.pdf'
    )

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `Template not found: ${templatePath}` }, { status: 500 })
    }

    const bytes = fs.readFileSync(templatePath)
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

    const pages = pdf.getPages()
    const page1 = pages[0]
    const { height } = page1.getSize()

    const writeText = (page, coord, value, opts = {}) => {
      if (!coord) return
      // Multi-option: pick the sub-coord matching the value, draw an X there
      if (coord.options) {
        const picked = coord.options[String(value || '').toUpperCase().trim()]
        if (picked) {
          page.drawText('X', {
            x: picked.x,
            y: height - picked.y,
            size: 9,
            font: fontBold,
            color: rgb(0, 0, 0),
          })
        }
        return
      }
      if (coord.checkbox) {
        if (value === true || value === 'true') {
          page.drawText('X', {
            x: coord.x,
            y: height - coord.y,
            size: 9,
            font: fontBold,
            color: rgb(0, 0, 0),
          })
        }
        return
      }
      if (!value && value !== 0) return
      const text = String(value)
      const size = opts.size || 7

      // coord.y is the BASELINE from top of page (the line the text sits on)
      const baselineY = height - coord.y

      if (coord.multiline) {
        const maxWidth = coord.maxWidth || 500
        // Start by splitting explicit newlines, then word-wrap each segment
        const segments = coord.splitOnNewline ? text.split(/\n/) : [text]
        const lines = []
        for (const segment of segments) {
          const words = segment.split(/\s+/).filter(Boolean)
          let currentLine = ''
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const w = font.widthOfTextAtSize(testLine, size)
            if (w > maxWidth && currentLine) {
              lines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) lines.push(currentLine)
          else if (segment === '') lines.push('')
        }
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: coord.x,
            y: baselineY - i * (size + 2),
            size,
            font,
            color: rgb(0, 0, 0),
          })
        })
      } else {
        // Truncate if needed
        let display = text
        if (coord.maxWidth) {
          let w = font.widthOfTextAtSize(display, size)
          while (w > coord.maxWidth && display.length > 1) {
            display = display.slice(0, -1)
            w = font.widthOfTextAtSize(display, size)
          }
        }
        page.drawText(display, {
          x: coord.x,
          y: baselineY,
          size,
          font,
          color: rgb(0, 0, 0),
        })
      }
    }

    // Fill Page 1
    if (formType === 'acord_1') {
      const coords = ACORD_1_COORDS

      writeText(page1, coords.form_date, formData.form_date)
      writeText(page1, coords.agency_name, formData.agency_name)
      writeText(page1, coords.agency_contact, formData.agency_contact)
      writeText(page1, coords.agency_phone, formData.agency_phone)
      writeText(page1, coords.agency_fax, formData.agency_fax)
      writeText(page1, coords.agency_email, formData.agency_email)
      writeText(page1, coords.agency_code, formData.agency_code)
      writeText(page1, coords.agency_subcode, formData.agency_subcode)
      writeText(page1, coords.agency_customer_id, formData.agency_customer_id)

      writeText(page1, coords.insured_location_code, formData.insured_location_code)
      writeText(page1, coords.date_of_loss, formData.date_of_loss)
      writeText(page1, coords.time_of_loss, formData.time_of_loss)
      writeText(page1, coords.time_of_loss_ampm, formData.time_of_loss_ampm)

      writeText(page1, coords.property_carrier, formData.property_carrier)
      writeText(page1, coords.property_naic, formData.property_naic)
      writeText(page1, coords.property_policy_number, formData.property_policy_number)
      writeText(page1, coords.property_line_of_business, formData.property_line_of_business)

      writeText(page1, coords.flood_carrier, formData.flood_carrier)
      writeText(page1, coords.flood_naic, formData.flood_naic)
      writeText(page1, coords.flood_policy_number, formData.flood_policy_number)

      writeText(page1, coords.wind_carrier, formData.wind_carrier)
      writeText(page1, coords.wind_naic, formData.wind_naic)
      writeText(page1, coords.wind_policy_number, formData.wind_policy_number)

      writeText(page1, coords.insured_name, formData.insured_name)
      // Split address by newline
      const addrLines = (formData.insured_address || '').split('\n')
      writeText(page1, coords.insured_address_line1, addrLines[0] || '')
      writeText(page1, coords.insured_address_line2, addrLines[1] || '')
      writeText(page1, coords.insured_dob, formData.insured_dob)
      writeText(page1, coords.insured_fein, formData.insured_fein)
      writeText(page1, coords.insured_marital_status, formData.insured_marital_status)
      writeText(page1, coords.insured_phone_primary_type, formData.insured_phone_primary_type)
      writeText(page1, coords.insured_phone_primary, formData.insured_phone_primary)
      writeText(page1, coords.insured_phone_secondary_type, formData.insured_phone_secondary_type)
      writeText(page1, coords.insured_phone_secondary, formData.insured_phone_secondary)
      writeText(page1, coords.insured_email_primary, formData.insured_email_primary)
      writeText(page1, coords.insured_email_secondary, formData.insured_email_secondary)

      // Spouse
      writeText(page1, coords.spouse_name, formData.spouse_name)
      const spouseAddr = (formData.spouse_address || '').split('\n')
      writeText(page1, coords.spouse_address_line1, spouseAddr[0] || '')
      writeText(page1, coords.spouse_address_line2, spouseAddr[1] || '')
      writeText(page1, coords.spouse_dob, formData.spouse_dob)
      writeText(page1, coords.spouse_fein, formData.spouse_fein)
      writeText(page1, coords.spouse_marital_status, formData.spouse_marital_status)
      writeText(page1, coords.spouse_phone_primary_type, formData.spouse_phone_primary_type)
      writeText(page1, coords.spouse_phone_primary, formData.spouse_phone_primary)
      writeText(page1, coords.spouse_phone_secondary_type, formData.spouse_phone_secondary_type)
      writeText(page1, coords.spouse_phone_secondary, formData.spouse_phone_secondary)
      writeText(page1, coords.spouse_email_primary, formData.spouse_email_primary)
      writeText(page1, coords.spouse_email_secondary, formData.spouse_email_secondary)

      writeText(page1, coords.contact_insured, formData.contact_insured)
      writeText(page1, coords.contact_name, formData.contact_name)
      const contactAddr = (formData.contact_address || '').split('\n')
      writeText(page1, coords.contact_address_line1, contactAddr[0] || '')
      writeText(page1, coords.contact_address_line2, contactAddr[1] || '')
      writeText(page1, coords.contact_phone_primary_type, formData.contact_phone_primary_type)
      writeText(page1, coords.contact_phone_primary, formData.contact_phone_primary)
      writeText(page1, coords.contact_phone_secondary_type, formData.contact_phone_secondary_type)
      writeText(page1, coords.contact_phone_secondary, formData.contact_phone_secondary)
      writeText(page1, coords.contact_when, formData.contact_when)
      writeText(page1, coords.contact_email_primary, formData.contact_email_primary)
      writeText(page1, coords.contact_email_secondary, formData.contact_email_secondary)

      writeText(page1, coords.loss_street, formData.loss_street)
      writeText(page1, coords.loss_city_state_zip, formData.loss_city_state_zip)
      writeText(page1, coords.loss_country, formData.loss_country)
      writeText(page1, coords.police_fire_contacted, formData.police_fire_contacted)
      writeText(page1, coords.report_number, formData.report_number)
      writeText(page1, coords.loss_location_description, formData.loss_location_description)

      writeText(page1, coords.kind_of_loss_fire, formData.kind_of_loss_fire)
      writeText(page1, coords.kind_of_loss_theft, formData.kind_of_loss_theft)
      writeText(page1, coords.kind_of_loss_lightning, formData.kind_of_loss_lightning)
      writeText(page1, coords.kind_of_loss_hail, formData.kind_of_loss_hail)
      writeText(page1, coords.kind_of_loss_flood, formData.kind_of_loss_flood)
      writeText(page1, coords.kind_of_loss_wind, formData.kind_of_loss_wind)
      writeText(page1, coords.kind_of_loss_other_checkbox, !!(formData.kind_of_loss_other && formData.kind_of_loss_other.trim()))
      writeText(page1, coords.kind_of_loss_other, formData.kind_of_loss_other)

      let probAmount = formData.probable_amount || ''
      if (probAmount) {
        const num = parseFloat(String(probAmount).replace(/[^0-9.]/g, ''))
        if (!isNaN(num)) probAmount = '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      writeText(page1, coords.probable_amount, probAmount)
      writeText(page1, coords.description_of_loss, formData.description_of_loss)
      writeText(page1, coords.reported_by, formData.reported_by)
      writeText(page1, coords.reported_to, formData.reported_to)

      // Page 2 — Agency Customer ID + Remarks
      if (pages[1]) {
        writeText(pages[1], ACORD_1_PAGE_2.agency_customer_id, formData.agency_customer_id)
        if (formData.remarks) {
          writeText(pages[1], ACORD_1_PAGE_2.remarks, formData.remarks)
        }
      }

      // Page 3 — Agency Customer ID
      if (pages[2]) {
        writeText(pages[2], ACORD_1_PAGE_3.agency_customer_id, formData.agency_customer_id)
      }
    }

    // ===== ACORD 3 — General Liability =====
    if (formType === 'acord_3') {
      const coords = ACORD_3_COORDS
      const page2 = pages[1]

      // Page 1 — Agency, Policy, Insured, Contact, Occurrence, Type of Liability
      writeText(page1, coords.form_date, formData.form_date)
      writeText(page1, coords.agency_name, formData.agency_name)
      writeText(page1, coords.agency_contact, formData.agency_contact)
      writeText(page1, coords.agency_phone, formData.agency_phone)
      writeText(page1, coords.agency_fax, formData.agency_fax)
      writeText(page1, coords.agency_email, formData.agency_email)
      writeText(page1, coords.agency_code, formData.agency_code)
      writeText(page1, coords.agency_subcode, formData.agency_subcode)
      writeText(page1, coords.agency_customer_id, formData.agency_customer_id)

      writeText(page1, coords.insured_location_code, formData.insured_location_code)
      writeText(page1, coords.date_of_loss, formData.date_of_loss)
      writeText(page1, coords.time_of_loss, formData.time_of_loss)
      writeText(page1, coords.time_of_loss_ampm, formData.time_of_loss_ampm)

      writeText(page1, coords.property_carrier, formData.property_carrier)
      writeText(page1, coords.property_naic, formData.property_naic)
      writeText(page1, coords.property_policy_number, formData.property_policy_number)

      // Insured
      writeText(page1, coords.insured_name, formData.insured_name)
      const addrLines3 = (formData.insured_address || '').split('\n')
      writeText(page1, coords.insured_address_line1, addrLines3[0] || '')
      writeText(page1, coords.insured_address_line2, addrLines3[1] || '')
      writeText(page1, coords.insured_dob, formData.insured_dob)
      writeText(page1, coords.insured_fein, formData.insured_fein)
      writeText(page1, coords.insured_phone_primary_type, formData.insured_phone_primary_type)
      writeText(page1, coords.insured_phone_primary, formData.insured_phone_primary)
      writeText(page1, coords.insured_phone_secondary_type, formData.insured_phone_secondary_type)
      writeText(page1, coords.insured_phone_secondary, formData.insured_phone_secondary)
      writeText(page1, coords.insured_email_primary, formData.insured_email_primary)
      writeText(page1, coords.insured_email_secondary, formData.insured_email_secondary)

      // Contact
      writeText(page1, coords.contact_insured, formData.contact_insured)
      writeText(page1, coords.contact_name, formData.contact_name)
      const contactAddr3 = (formData.contact_address || '').split('\n')
      writeText(page1, coords.contact_address_line1, contactAddr3[0] || '')
      writeText(page1, coords.contact_address_line2, contactAddr3[1] || '')
      writeText(page1, coords.contact_phone_primary_type, formData.contact_phone_primary_type)
      writeText(page1, coords.contact_phone_primary, formData.contact_phone_primary)
      writeText(page1, coords.contact_phone_secondary_type, formData.contact_phone_secondary_type)
      writeText(page1, coords.contact_phone_secondary, formData.contact_phone_secondary)
      writeText(page1, coords.contact_when, formData.contact_when)
      writeText(page1, coords.contact_email_primary, formData.contact_email_primary)
      writeText(page1, coords.contact_email_secondary, formData.contact_email_secondary)

      // Occurrence
      writeText(page1, coords.loss_street, formData.loss_street)
      writeText(page1, coords.loss_city_state_zip, formData.loss_city_state_zip)
      writeText(page1, coords.loss_country, formData.loss_country)
      writeText(page1, coords.police_fire_contacted, formData.police_fire_contacted)
      writeText(page1, coords.report_number, formData.report_number)
      writeText(page1, coords.loss_location_description, formData.loss_location_description)
      writeText(page1, coords.description_of_loss, formData.description_of_loss)

      // Type of Liability — Premises
      writeText(page1, coords.premises_owner, formData.premises_owner)
      writeText(page1, coords.premises_tenant, formData.premises_tenant)
      writeText(page1, coords.premises_other, formData.premises_other)
      writeText(page1, coords.premises_other_text, formData.premises_other_text)
      writeText(page1, coords.type_of_premises, formData.type_of_premises)
      writeText(page1, coords.owner_name, formData.owner_name)
      writeText(page1, coords.owner_address_1, formData.owner_address_1)
      writeText(page1, coords.owner_address_2, formData.owner_address_2)
      writeText(page1, coords.owner_phone_primary_type, formData.owner_phone_primary_type)
      writeText(page1, coords.owner_phone_primary, formData.owner_phone_primary)
      writeText(page1, coords.owner_phone_secondary_type, formData.owner_phone_secondary_type)
      writeText(page1, coords.owner_phone_secondary, formData.owner_phone_secondary)
      writeText(page1, coords.owner_email_primary, formData.owner_email_primary)
      writeText(page1, coords.owner_email_secondary, formData.owner_email_secondary)

      // Type of Liability — Products
      writeText(page1, coords.products_manufacturer, formData.products_manufacturer)
      writeText(page1, coords.products_vendor, formData.products_vendor)
      writeText(page1, coords.products_other, formData.products_other)
      writeText(page1, coords.products_other_text, formData.products_other_text)
      writeText(page1, coords.type_of_product, formData.type_of_product)
      writeText(page1, coords.manufacturer_name, formData.manufacturer_name)
      writeText(page1, coords.manufacturer_address_1, formData.manufacturer_address_1)
      writeText(page1, coords.manufacturer_address_2, formData.manufacturer_address_2)
      writeText(page1, coords.mfr_phone_primary_type, formData.mfr_phone_primary_type)
      writeText(page1, coords.mfr_phone_primary, formData.mfr_phone_primary)
      writeText(page1, coords.mfr_phone_secondary_type, formData.mfr_phone_secondary_type)
      writeText(page1, coords.mfr_phone_secondary, formData.mfr_phone_secondary)
      writeText(page1, coords.mfr_email_primary, formData.mfr_email_primary)
      writeText(page1, coords.mfr_email_secondary, formData.mfr_email_secondary)
      writeText(page1, coords.where_product_seen, formData.where_product_seen)

      // Page 2 — Injured, Witnesses, Remarks, Reported By/To
      if (page2) {
        const p2 = ACORD_3_PAGE_2
        writeText(page2, p2.agency_customer_id, formData.agency_customer_id)
        writeText(page2, p2.injured_name, formData.injured_name)
        writeText(page2, p2.injured_address_1, formData.injured_address_1)
        writeText(page2, p2.injured_address_2, formData.injured_address_2)
        writeText(page2, p2.employer_name, formData.employer_name)
        writeText(page2, p2.employer_address_1, formData.employer_address_1)
        writeText(page2, p2.employer_address_2, formData.employer_address_2)

        // Injured phones/emails
        writeText(page2, p2.injured_phone_primary_type, formData.injured_phone_primary_type)
        writeText(page2, p2.injured_phone_primary, formData.injured_phone_primary)
        writeText(page2, p2.injured_phone_secondary_type, formData.injured_phone_secondary_type)
        writeText(page2, p2.injured_phone_secondary, formData.injured_phone_secondary)
        writeText(page2, p2.injured_email_primary, formData.injured_email_primary)
        writeText(page2, p2.injured_email_secondary, formData.injured_email_secondary)

        // Employer phones/emails
        writeText(page2, p2.employer_phone_primary_type, formData.employer_phone_primary_type)
        writeText(page2, p2.employer_phone_primary, formData.employer_phone_primary)
        writeText(page2, p2.employer_phone_secondary_type, formData.employer_phone_secondary_type)
        writeText(page2, p2.employer_phone_secondary, formData.employer_phone_secondary)
        writeText(page2, p2.employer_email_primary, formData.employer_email_primary)
        writeText(page2, p2.employer_email_secondary, formData.employer_email_secondary)

        writeText(page2, p2.injured_age, formData.injured_age)
        writeText(page2, p2.injured_sex, formData.injured_sex)
        writeText(page2, p2.injured_occupation, formData.injured_occupation)
        writeText(page2, p2.describe_injury, formData.describe_injury)
        writeText(page2, p2.where_taken, formData.where_taken)
        writeText(page2, p2.what_injured_doing, formData.what_injured_doing)
        writeText(page2, p2.describe_property, formData.describe_property)

        // Format estimate amount as currency
        let estAmount = formData.estimate_amount || ''
        if (estAmount) {
          const num = parseFloat(String(estAmount).replace(/[^0-9.]/g, ''))
          if (!isNaN(num)) estAmount = '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
        writeText(page2, p2.estimate_amount, estAmount)
        writeText(page2, p2.where_property_seen, formData.where_property_seen)

        // Witnesses 1-3
        for (const i of [1, 2, 3]) {
          writeText(page2, p2[`witness${i}_name`], formData[`witness${i}_name`])
          writeText(page2, p2[`witness${i}_address_1`], formData[`witness${i}_address_1`])
          writeText(page2, p2[`witness${i}_address_2`], formData[`witness${i}_address_2`])
          writeText(page2, p2[`witness${i}_phone_type`], formData[`witness${i}_phone_type`])
          writeText(page2, p2[`witness${i}_phone`], formData[`witness${i}_phone`])
          writeText(page2, p2[`witness${i}_phone2_type`], formData[`witness${i}_phone2_type`])
          writeText(page2, p2[`witness${i}_phone2`], formData[`witness${i}_phone2`])
          writeText(page2, p2[`witness${i}_email`], formData[`witness${i}_email`])
          writeText(page2, p2[`witness${i}_email2`], formData[`witness${i}_email2`])
        }

        writeText(page2, p2.remarks, formData.remarks)
        writeText(page2, p2.reported_by, formData.reported_by)
        writeText(page2, p2.reported_to, formData.reported_to)
      }

      // Page 3 — Agency Customer ID (top-right)
      const page3 = pages[2]
      if (page3) {
        writeText(page3, ACORD_3_PAGE_3.agency_customer_id, formData.agency_customer_id)
      }

      // Page 4 — Agency Customer ID (top-right)
      const page4 = pages[3]
      if (page4) {
        writeText(page4, ACORD_3_PAGE_4.agency_customer_id, formData.agency_customer_id)
      }
    }

    const formLabel = formType === 'acord_3' ? 'ACORD 3' : 'ACORD 1'
    const locName = (formData.location_name || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
    const baseName = locName ? `${locName} ${formLabel}` : formLabel

    // Set PDF metadata so the browser tab + save/print dialog uses the real name
    pdf.setTitle(baseName)
    pdf.setSubject(baseName)

    const out = await pdf.save({ useObjectStreams: false })

    return new Response(out, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${baseName}.pdf"`,
      },
    })
  } catch (error) {
    console.error('ACORD PDF error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
