'use client'

import { useState } from 'react'

function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getFileIcon(mimeType, fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase()
  if (mimeType?.startsWith('image/')) return { icon: '🖼️', color: 'bg-purple-50 text-purple-600' }
  if (mimeType?.includes('pdf') || ext === 'pdf') return { icon: '📄', color: 'bg-red-50 text-red-600' }
  if (mimeType?.includes('word') || ext === 'doc' || ext === 'docx') return { icon: '📝', color: 'bg-blue-50 text-blue-600' }
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || ext === 'xls' || ext === 'xlsx') return { icon: '📊', color: 'bg-green-50 text-green-600' }
  if (mimeType?.includes('outlook') || ext === 'msg' || ext === 'eml') return { icon: '✉️', color: 'bg-orange-50 text-orange-600' }
  return { icon: '📎', color: 'bg-gray-50 text-gray-600' }
}

function FileAttachment({ file }) {
  const [loading, setLoading] = useState(false)
  const { icon, color } = getFileIcon(file.mime_type, file.file_name)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/origami/file-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: file.storage_path }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 hover:border-[#006B7D]/30 hover:bg-[#006B7D]/5 transition-colors text-left w-full group ${loading ? 'opacity-50' : ''}`}
    >
      <span className={`w-7 h-7 rounded flex items-center justify-center text-sm flex-shrink-0 ${color}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-[#006B7D]">
          {file.file_name}
        </p>
        <p className="text-[10px] text-gray-400">
          {formatFileSize(file.file_size)}
        </p>
      </div>
      {loading ? (
        <svg className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#006B7D] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
    </button>
  )
}

export default function OrigamiNotesSidebar({
  notes = [],
  files = [],
  entityName = '',
  parentDomainId,
  parentId,
  clientId,
  authorName,
  authorEmail,
  onNoteAdded,
  onFilesAdded,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('notes')
  const [composerBody, setComposerBody] = useState('')
  const [composerSubject, setComposerSubject] = useState('')
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [composerFiles, setComposerFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const totalCount = notes.length + files.length
  const canAdd = !!(parentDomainId && parentId)

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length) setComposerFiles(prev => [...prev, ...picked])
    e.target.value = ''
  }

  const removeFile = (idx) => {
    setComposerFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const submitNote = async () => {
    if (!composerBody.trim() || submitting) return
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('parentDomainId', String(parentDomainId))
      form.append('parentId', String(parentId))
      form.append('body', composerBody)
      if (composerSubject) form.append('subject', composerSubject)
      if (authorName) form.append('authorName', authorName)
      if (authorEmail) form.append('authorEmail', authorEmail)
      if (clientId) form.append('clientId', String(clientId))
      composerFiles.forEach(f => form.append('files', f))

      const res = await fetch('/api/origami/add-note', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add note')
      setComposerBody('')
      setComposerSubject('')
      setComposerFiles([])
      setComposerExpanded(false)
      if (onNoteAdded) onNoteAdded(json.note)
      if (onFilesAdded && json.files?.length) onFilesAdded(json.files)
    } catch (err) {
      alert('Failed to add note: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#006B7D] text-white px-2 py-4 rounded-l-lg shadow-lg hover:bg-[#008BA3] transition-colors"
        title="View Notes & Files"
      >
        <div className="flex flex-col items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {totalCount > 0 && (
            <span className="text-[10px] font-bold bg-white text-[#006B7D] rounded-full w-5 h-5 flex items-center justify-center">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)} />
          <div className="relative w-[420px] bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#006B7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Notes & Files
                  {entityName && <span className="text-gray-500 font-normal ml-1">- {entityName}</span>}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'notes'
                    ? 'text-[#006B7D] border-b-2 border-[#006B7D] bg-[#006B7D]/5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notes ({notes.length})
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'files'
                    ? 'text-[#006B7D] border-b-2 border-[#006B7D] bg-[#006B7D]/5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Files ({files.length})
              </button>
            </div>

            {/* Composer (notes tab only) */}
            {activeTab === 'notes' && canAdd && (
              <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                {!composerExpanded ? (
                  <button
                    onClick={() => setComposerExpanded(true)}
                    className="w-full text-left text-sm text-gray-500 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-[#006B7D]/40 hover:text-gray-700 transition-colors"
                  >
                    + Add a note...
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={composerSubject}
                      onChange={e => setComposerSubject(e.target.value)}
                      placeholder="Subject (optional)"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#006B7D] focus:ring-1 focus:ring-[#006B7D]/20 text-gray-900 placeholder:text-gray-400 bg-white"
                    />
                    <textarea
                      value={composerBody}
                      onChange={e => setComposerBody(e.target.value)}
                      placeholder="Write a note..."
                      rows={4}
                      autoFocus
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#006B7D] focus:ring-1 focus:ring-[#006B7D]/20 text-gray-900 placeholder:text-gray-400 bg-white resize-none"
                    />
                    {/* Selected files */}
                    {composerFiles.length > 0 && (
                      <div className="space-y-1">
                        {composerFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs">
                            <span className="flex-1 truncate text-gray-700">{f.name}</span>
                            <span className="text-gray-400">{formatFileSize(f.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              disabled={submitting}
                              className="text-gray-400 hover:text-red-500"
                              title="Remove"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <label className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-[#006B7D] hover:bg-[#006B7D]/5 border border-gray-200 hover:border-[#006B7D]/30 rounded-lg cursor-pointer flex items-center gap-1 font-medium transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attach
                        <input type="file" multiple className="hidden" onChange={handleFilePick} disabled={submitting} />
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setComposerExpanded(false)
                            setComposerBody('')
                            setComposerSubject('')
                            setComposerFiles([])
                          }}
                          disabled={submitting}
                          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitNote}
                          disabled={submitting || !composerBody.trim()}
                          className="px-3 py-1.5 text-xs bg-[#006B7D] hover:bg-[#008BA3] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? 'Posting…' : 'Post note'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {activeTab === 'notes' ? (
                /* Notes Tab */
                notes.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="text-sm font-medium">No notes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.note_id} className="group">
                        <div className="flex items-start gap-2.5">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-[#006B7D]/10 text-[#006B7D] flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                            {getInitials(note.user_name || note.author_name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Author & Time */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900">
                                {note.user_name || note.author_name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(note.entry_date)}
                              </span>
                            </div>

                            {/* User details */}
                            {(note.user_title || note.user_email) && (
                              <div className="text-[11px] text-gray-400 mb-0.5">
                                {note.user_title && <span>{note.user_title}</span>}
                                {note.user_title && note.user_email && <span> · </span>}
                                {note.user_email && <span>{note.user_email}</span>}
                              </div>
                            )}

                            {/* Subject */}
                            {note.subject && (
                              <p className="text-xs font-medium text-[#006B7D] mb-0.5">{note.subject}</p>
                            )}

                            {/* Body */}
                            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                              {note.body}
                            </div>

                            {/* Attached Files */}
                            {note.files && note.files.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {note.files.map(f => (
                                  <FileAttachment key={f.file_id} file={f} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="mt-3 border-b border-gray-100" />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Files Tab */
                files.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <p className="text-sm font-medium">No files</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map(f => (
                      <FileAttachment key={f.file_id} file={f} />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
