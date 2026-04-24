import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch all columns
  let allColumns = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, ordinal_position')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position')
      .range(from, from + PAGE - 1)
    if (error) {
      // Fallback: raw SQL
      const { data: sqlData, error: sqlErr } = await supabaseAdmin.rpc('exec_sql', {
        query: `SELECT table_name, column_name, data_type, is_nullable, ordinal_position
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position`
      })
      if (sqlErr) break
      allColumns = sqlData || []
      break
    }
    allColumns = allColumns.concat(data || [])
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  // Group by table
  const tables = {}
  allColumns.forEach(col => {
    if (!tables[col.table_name]) tables[col.table_name] = []
    tables[col.table_name].push(col)
  })

  // Categorize
  const categories = {
    'Origami Tables': { color: '#006B7D', tables: {} },
    'AMS Tables': { color: '#2563EB', tables: {} },
    'Airtable/Whalesync': { color: '#7C3AED', tables: {} },
    'App Tables': { color: '#4B5563', tables: {} },
  }

  const airtableTables = ['COI', 'EPI', 'Lenders', 'Account Manager', 'Producers', 'Team', 'Employees']

  Object.entries(tables).forEach(([name, cols]) => {
    if (name.startsWith('origami_')) categories['Origami Tables'].tables[name] = cols
    else if (name.startsWith('ams_')) categories['AMS Tables'].tables[name] = cols
    else if (airtableTables.includes(name)) categories['Airtable/Whalesync'].tables[name] = cols
    else categories['App Tables'].tables[name] = cols
  })

  const totalTables = Object.keys(tables).length
  const totalColumns = allColumns.length
  const now = new Date().toLocaleString()

  // Build HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Database Schema - Franklin Street</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
  .header { background: #005570; color: white; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 24px; font-weight: 600; }
  .header .stats { font-size: 14px; opacity: 0.8; }
  .controls { padding: 16px 32px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; align-items: center; position: sticky; top: 0; z-index: 10; }
  .search { padding: 10px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; width: 400px; outline: none; }
  .search:focus { border-color: #006B7D; box-shadow: 0 0 0 2px rgba(0,107,125,0.1); }
  .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 13px; font-weight: 500; }
  .btn:hover { background: #f1f5f9; }
  .btn-teal { background: #006B7D; color: white; border-color: #006B7D; }
  .btn-teal:hover { background: #008BA3; }
  .container { padding: 24px 32px; }
  .category { margin-bottom: 32px; }
  .category-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; cursor: pointer; }
  .category-header h2 { font-size: 18px; font-weight: 600; }
  .category-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; border-top: 3px solid; }
  .card-header { padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
  .card-header:hover { background: #f8fafc; }
  .card-title { font-size: 14px; font-weight: 600; }
  .card-count { font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; }
  .card-body { border-top: 1px solid #f1f5f9; max-height: 400px; overflow-y: auto; }
  .col-row { display: flex; justify-content: space-between; padding: 6px 16px; font-size: 12px; border-bottom: 1px solid #f8fafc; }
  .col-row:hover { background: #f8fafc; }
  .col-name { font-weight: 500; color: #1e293b; }
  .col-type { color: #64748b; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; }
  .col-type.uuid { color: #7c3aed; background: #f5f3ff; }
  .col-type.timestamp { color: #0891b2; background: #ecfeff; }
  .col-type.integer, .col-type.numeric, .col-type.smallint, .col-type.real { color: #059669; background: #ecfdf5; }
  .col-type.boolean { color: #d97706; background: #fffbeb; }
  .col-type.text, .col-type.character { color: #2563eb; background: #eff6ff; }
  .hidden { display: none; }
  .highlight { background: #fef9c3 !important; }
  @media print { .controls { position: static; } .card-body { max-height: none; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Database Schema</h1>
    <div class="stats">Generated ${now} | ${totalTables} tables | ${totalColumns} columns</div>
  </div>
</div>
<div class="controls">
  <input type="text" class="search" id="search" placeholder="Search tables or columns..." oninput="filterTables(this.value)">
  <button class="btn" onclick="toggleAll(true)">Expand All</button>
  <button class="btn" onclick="toggleAll(false)">Collapse All</button>
  <button class="btn btn-teal" onclick="window.print()">Print / Save PDF</button>
</div>
<div class="container" id="container">
${Object.entries(categories).map(([catName, cat]) => {
  const tableEntries = Object.entries(cat.tables)
  if (tableEntries.length === 0) return ''
  return `
  <div class="category" data-category="${catName}">
    <div class="category-header" onclick="toggleCategory(this)">
      <h2>${catName}</h2>
      <span class="category-badge" style="background:${cat.color}">${tableEntries.length} tables</span>
    </div>
    <div class="grid">
      ${tableEntries.map(([tName, cols]) => `
      <div class="card" style="border-top-color:${cat.color}" data-table="${tName.toLowerCase()}">
        <div class="card-header" onclick="toggleCard(this)">
          <span class="card-title">${tName}</span>
          <span class="card-count">${cols.length} cols</span>
        </div>
        <div class="card-body hidden">
          ${cols.map(c => `
          <div class="col-row" data-col="${c.column_name.toLowerCase()}">
            <span class="col-name">${c.column_name}</span>
            <span class="col-type ${c.data_type.split(' ')[0]}">${c.data_type}</span>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
  </div>`
}).join('')}
</div>
<script>
function toggleCard(header) {
  const body = header.nextElementSibling;
  body.classList.toggle('hidden');
}
function toggleAll(expand) {
  document.querySelectorAll('.card-body').forEach(b => {
    if (expand) b.classList.remove('hidden');
    else b.classList.add('hidden');
  });
}
function toggleCategory(header) {
  const grid = header.nextElementSibling;
  grid.classList.toggle('hidden');
}
function filterTables(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.card').forEach(card => {
    const tableName = card.dataset.table;
    const cols = card.querySelectorAll('.col-row');
    let tableMatch = tableName.includes(q);
    let colMatch = false;
    cols.forEach(row => {
      const cn = row.dataset.col;
      if (cn.includes(q)) { colMatch = true; row.classList.add('highlight'); }
      else row.classList.remove('highlight');
    });
    if (!q || tableMatch || colMatch) {
      card.style.display = '';
      if (colMatch && q) card.querySelector('.card-body').classList.remove('hidden');
    } else {
      card.style.display = 'none';
    }
  });
  document.querySelectorAll('.category').forEach(cat => {
    const visible = cat.querySelectorAll('.card[style=""],.card:not([style])').length;
    const grid = cat.querySelector('.grid');
    if (!q) { grid.classList.remove('hidden'); cat.style.display = ''; }
    else if (visible === 0) cat.style.display = 'none';
    else { cat.style.display = ''; grid.classList.remove('hidden'); }
  });
}
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
