import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Query information_schema.columns for all public tables
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default, ordinal_position')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position')

    // If the above doesn't work (information_schema not exposed via PostgREST),
    // fall back to a raw SQL query
    if (error) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_schema_info')

      if (rpcError) {
        // Last resort: use raw SQL via the REST API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_schema_info`,
          {
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          // Try direct SQL approach
          const sqlResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
            {
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              }
            }
          )

          // If we can at least get the table list from the REST API, use that
          // and query each table's columns individually
          if (sqlResponse.ok) {
            const definitions = await sqlResponse.json()
            // The root endpoint returns OpenAPI spec with all table definitions
            const tables = {}
            if (definitions.definitions) {
              for (const [tableName, def] of Object.entries(definitions.definitions)) {
                if (tableName.startsWith('_') || tableName === 'rpc') continue
                tables[tableName] = Object.entries(def.properties || {}).map(([colName, colDef], idx) => ({
                  column_name: colName,
                  data_type: colDef.format || colDef.type || 'unknown',
                  is_nullable: 'YES',
                  column_default: colDef.default || null,
                  ordinal_position: idx + 1
                }))
              }
            }
            return NextResponse.json({ tables })
          }

          return NextResponse.json({ error: 'Unable to fetch schema information' }, { status: 500 })
        }

        const rpcResult = await response.json()
        return NextResponse.json({ tables: groupByTable(rpcResult) })
      }

      return NextResponse.json({ tables: groupByTable(rpcData) })
    }

    return NextResponse.json({ tables: groupByTable(data) })
  } catch (err) {
    console.error('Schema fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function groupByTable(rows) {
  const tables = {}
  for (const row of rows) {
    if (!tables[row.table_name]) {
      tables[row.table_name] = []
    }
    tables[row.table_name].push({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
      column_default: row.column_default,
      ordinal_position: row.ordinal_position
    })
  }
  return tables
}
