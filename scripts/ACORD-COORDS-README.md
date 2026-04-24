# ACORD Coordinate Tuning

This folder has tools to tune where form data lands on the real ACORD PDF templates.

## Files

- **`acord-coords.json`** — the editable coordinate map for all ACORD forms
- **`acord-preview.cjs`** — script that renders the form with sample data using the current coordinates
- **`acord-grid.pdf`** / **`acord_1-preview.pdf`** — output preview (open in any PDF viewer)
- **`acord_1-preview.png`** — rendered preview image (fast to look at)

## How to tune coordinates

1. **Run the preview**:
   ```
   node scripts/acord-preview.cjs acord_1
   ```
   This reads `acord-coords.json`, overlays sample data on the real template, and writes:
   - `scripts/acord_1-preview.pdf`
   - `scripts/acord_1-preview.png`

2. **With coordinate grid** (shows red lines every 25 points):
   ```
   node scripts/acord-preview.cjs acord_1 --grid
   ```

3. **With field labels** (shows `[field_name]` for empty fields so you can see where they'd land):
   ```
   node scripts/acord-preview.cjs acord_1 --labels
   ```

4. **Open the preview** (PDF or PNG) and see what's misaligned.

5. **Edit `acord-coords.json`** — find the field you want to move, change its `x` and/or `y`:
   - `x` = horizontal position in PDF points (0 = left edge, 612 = right edge)
   - `y` = BASELINE of the text from the TOP of the page (0 = top edge, 792 = bottom edge)
   - Smaller `y` = text appears HIGHER on the page
   - Larger `y` = text appears LOWER on the page
   - 1 PDF point ≈ 1/72 of an inch. Most text rows on the form are 13-15 points tall.

6. **Re-run the preview** and check again.

7. **When it looks good**, copy the coords from `acord-coords.json` into the live API at:
   ```
   app/api/origami/acord-pdf/route.js
   ```
   Look for the `ACORD_1_COORDS` constant and replace it with your tuned values.

## Notes

- `checkbox: true` means draw an "X" at that point (for Kind of Loss boxes)
- `multiline: true` + `maxWidth: N` means word-wrap the text to multiple lines
- `splitOnNewline: true` means split the text on `\n` characters first (used for agency address block)
- `maxWidth` also truncates long single-line fields so they don't run off the edge

## Page reference

- Both ACORD forms are letter size: **612 × 792 points** (8.5 × 11 inches)
- Origin in this tool is **top-left** (my convention — helper converts to pdf-lib bottom-left)
- 1 inch = 72 points
- 1 row of form cells ≈ 13-15 points tall
