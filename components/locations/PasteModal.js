'use client'

export default function PasteModal({ pasteData, setPasteData, onPaste, onClose, saving }) {
  const getPreviewStats = () => {
    if (!pasteData.trim()) return null
    const normalizedData = pasteData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rows = normalizedData.split('\n').filter(row => row.trim())
    if (rows.length === 0) return null

    const firstRowCells = rows[0].split('\t')
    const hasHeaders = rows.length > 1 && firstRowCells.length > 2

    return {
      totalRows: rows.length,
      dataRows: hasHeaders ? rows.length - 1 : rows.length,
      columns: firstRowCells.length,
      firstFewHeaders: firstRowCells.slice(0, 5).map(h => h.replace(/"/g, '').trim()).filter(Boolean)
    }
  }

  const stats = getPreviewStats()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Paste from Excel</h3>
          <p className="text-sm text-gray-600 mt-1">
            Copy rows from Excel and paste them below. Include headers in the first row for best results.
          </p>
        </div>
        <div className="p-6 flex-1 overflow-auto">
          <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="1. Open your Excel file&#10;2. Select the rows you want to import (include header row)&#10;3. Press Ctrl+C (or Cmd+C on Mac) to copy&#10;4. Click here and press Ctrl+V (or Cmd+V) to paste"
            className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
            autoFocus
          />

          {stats && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Data Detected
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>{stats.dataRows}</strong> row(s) of data found with <strong>{stats.columns}</strong> columns</p>
                {stats.firstFewHeaders.length > 0 && (
                  <p className="text-xs text-green-600">
                    Columns: {stats.firstFewHeaders.join(', ')}{stats.columns > 5 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Supported Excel Headers:</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Location Name, Street Address, City, State, Zip, County, # of Bldgs, # of Units,
              Square Footage, Real Property Value, Personal Property Value, Total TIV,
              Construction Description, Orig Year Built, Occupancy, Flood Zone, Entity Name,
              and many more...
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {stats ? `Ready to import ${stats.dataRows} location(s)` : 'Paste your Excel data above'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onPaste}
              disabled={saving || !pasteData.trim()}
              className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import {stats ? `${stats.dataRows} Rows` : 'Data'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
