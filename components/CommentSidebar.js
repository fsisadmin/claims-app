'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Format relative time
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Get file icon based on type
function getFileIcon(fileType, size = 'w-5 h-5') {
  if (fileType?.startsWith('image/')) {
    return (
      <svg className={`${size} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (fileType?.includes('pdf')) {
    return (
      <svg className={`${size} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel') || fileType?.includes('csv')) {
    return (
      <svg className={`${size} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  return (
    <svg className={`${size} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export default function CommentSidebar({ entityType, entityId, organizationId }) {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [commentAttachments, setCommentAttachments] = useState({}) // Map of commentId -> attachments
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [pendingFiles, setPendingFiles] = useState([]) // Files to attach to comment
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('comments')
  const fileInputRef = useRef(null)
  const commentFileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Fetch comments and attachments when sidebar opens
  useEffect(() => {
    if (isOpen && entityId && organizationId) {
      fetchComments()
      fetchAttachments()
    }
  }, [isOpen, entityId, organizationId])

  async function fetchComments() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])

      // Fetch attachments for all comments
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: attachData, error: attachError } = await supabase
          .from('comment_attachments')
          .select('*')
          .in('comment_id', commentIds)

        if (!attachError && attachData) {
          // Group attachments by comment_id
          const grouped = {}
          attachData.forEach(a => {
            if (!grouped[a.comment_id]) grouped[a.comment_id] = []
            grouped[a.comment_id].push(a)
          })
          setCommentAttachments(grouped)
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAttachments() {
    try {
      // Fetch standalone entity attachments
      const { data: entityData, error: entityError } = await supabase
        .from('entity_attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (entityError) throw entityError

      // Also fetch all comment attachments for this entity
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', organizationId)

      let allCommentAttachments = []
      if (!commentError && commentData && commentData.length > 0) {
        const commentIds = commentData.map(c => c.id)
        const { data: attachData, error: attachError } = await supabase
          .from('comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: false })

        if (!attachError && attachData) {
          // Add a source field to distinguish comment attachments
          allCommentAttachments = attachData.map(a => ({ ...a, source: 'comment' }))
        }
      }

      // Combine both types of attachments, mark entity attachments
      const entityAttachments = (entityData || []).map(a => ({ ...a, source: 'entity' }))
      const allFiles = [...entityAttachments, ...allCommentAttachments]

      // Sort by created_at descending
      allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setAttachments(allFiles)
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  // Download all files as individual downloads
  async function handleDownloadAll() {
    if (attachments.length === 0) return

    for (const attachment of attachments) {
      const link = document.createElement('a')
      link.href = attachment.file_url
      link.download = attachment.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Small delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  // Handle adding files to pending list for comment
  function handleCommentFileSelect(e) {
    const files = Array.from(e.target.files || [])
    console.log('Files selected:', files.map(f => f.name))
    if (files.length > 0) {
      setPendingFiles(prev => {
        const updated = [...prev, ...files]
        console.log('Pending files updated:', updated.map(f => f.name))
        return updated
      })
    }
    if (commentFileInputRef.current) commentFileInputRef.current.value = ''
  }

  // Remove file from pending list
  function removePendingFile(index) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmitComment(e) {
    e.preventDefault()
    if ((!newComment.trim() && pendingFiles.length === 0) || !user || !profile) return

    setSubmitting(true)
    try {
      // Create the comment
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          organization_id: organizationId,
          content: newComment.trim() || '(Attached files)',
          author_id: user.id,
          author_name: profile.full_name || profile.email,
          author_email: profile.email,
        })
        .select()
        .single()

      if (commentError) throw commentError

      // Upload any pending files and attach to comment
      const uploadedAttachments = []
      const failedUploads = []
      for (const file of pendingFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `comments/${commentData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        console.log('Uploading file:', file.name, 'to path:', fileName)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error for', file.name, ':', uploadError)
          failedUploads.push(file.name)
          continue
        }
        console.log('File uploaded successfully:', file.name)

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName)

        // Save attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('comment_attachments')
          .insert({
            comment_id: commentData.id,
            organization_id: organizationId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: urlData.publicUrl,
            storage_path: fileName,
            uploaded_by: user.id,
          })
          .select()
          .single()

        if (!attachmentError && attachmentData) {
          uploadedAttachments.push(attachmentData)
        }
      }

      // Update state
      setComments(prev => [commentData, ...prev])
      if (uploadedAttachments.length > 0) {
        setCommentAttachments(prev => ({
          ...prev,
          [commentData.id]: uploadedAttachments
        }))
      }
      setNewComment('')
      setPendingFiles([])
      textareaRef.current?.focus()

      // Alert if some files failed to upload
      if (failedUploads.length > 0) {
        alert(`Failed to upload: ${failedUploads.join(', ')}\n\nMake sure the "attachments" storage bucket exists in Supabase.`)
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Delete this comment and its attachments?')) return

    try {
      // Delete attachments from storage first
      const attachs = commentAttachments[commentId] || []
      for (const attach of attachs) {
        await supabase.storage.from('attachments').remove([attach.storage_path])
      }

      // Delete comment (cascades to comment_attachments)
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentAttachments(prev => {
        const newMap = { ...prev }
        delete newMap[commentId]
        return newMap
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  async function handleFileUpload(e) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName)

        const { data: attachmentData, error: attachmentError } = await supabase
          .from('entity_attachments')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            organization_id: organizationId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: urlData.publicUrl,
            storage_path: fileName,
            uploaded_by: user.id,
            uploaded_by_name: profile.full_name || profile.email,
          })
          .select()
          .single()

        if (attachmentError) throw attachmentError
        setAttachments(prev => [{ ...attachmentData, source: 'entity' }, ...prev])
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAttachment(attachment) {
    if (!confirm(`Delete "${attachment.file_name}"?`)) return

    try {
      await supabase.storage.from('attachments').remove([attachment.storage_path])

      // Delete from the appropriate table based on source
      const tableName = attachment.source === 'comment' ? 'comment_attachments' : 'entity_attachments'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', attachment.id)

      if (error) throw error
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))

      // Also update commentAttachments state if it was a comment attachment
      if (attachment.source === 'comment' && attachment.comment_id) {
        setCommentAttachments(prev => {
          const updated = { ...prev }
          if (updated[attachment.comment_id]) {
            updated[attachment.comment_id] = updated[attachment.comment_id].filter(a => a.id !== attachment.id)
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete file')
    }
  }

  return (
    <>
      {/* Toggle Button - Fixed on RIGHT side */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-[#006B7D] hover:bg-[#008BA3] text-white p-2 shadow-lg transition-all ${isOpen ? 'right-80 rounded-l-lg' : 'right-0 rounded-l-lg'}`}
        title={isOpen ? 'Close sidebar' : 'Open comments & files'}
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Sidebar - Fixed on RIGHT side, below header */}
      <div
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white shadow-xl z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="bg-[#006B7D] text-white p-4">
          <h2 className="font-semibold text-lg">Activity</h2>
          <p className="text-sm text-white/70">Comments & Files</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-[#006B7D] border-b-2 border-[#006B7D]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-[#006B7D] border-b-2 border-[#006B7D]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Files ({attachments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-140px)]">
          {activeTab === 'comments' && (
            <>
              {/* Comment Input with File Attachment */}
              <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-200">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900 placeholder-gray-500"
                />

                {/* Pending Files Preview */}
                {pendingFiles.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <p className="text-xs font-medium text-blue-700 mb-1">Files to attach ({pendingFiles.length}):</p>
                    {pendingFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 text-sm">
                        {getFileIcon(file.type, 'w-4 h-4')}
                        <span className="flex-1 truncate text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removePendingFile(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  {/* Attach File Button */}
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    multiple
                    onChange={handleCommentFileSelect}
                    className="hidden"
                    accept="*/*"
                  />
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#006B7D] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attach
                  </button>

                  <button
                    type="submit"
                    disabled={(!newComment.trim() && pendingFiles.length === 0) || submitting}
                    className="px-4 py-1.5 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#006B7D] mx-auto"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">No comments yet</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="group">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#006B7D] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {getInitials(comment.author_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {comment.author_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                            {comment.content}
                          </p>

                          {/* Comment Attachments */}
                          {commentAttachments[comment.id]?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {commentAttachments[comment.id].map(attach => (
                                <a
                                  key={attach.id}
                                  href={attach.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                >
                                  {getFileIcon(attach.file_type, 'w-4 h-4')}
                                  <span className="flex-1 text-xs text-gray-700 truncate">{attach.file_name}</span>
                                  <span className="text-xs text-gray-400">{formatFileSize(attach.file_size)}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        {comment.author_id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'files' && (
            <>
              {/* Upload and Download All Buttons */}
              <div className="p-4 border-b border-gray-200 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#006B7D] hover:text-[#006B7D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Files
                    </>
                  )}
                </button>

                {/* Download All Button */}
                {attachments.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="w-full px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All ({attachments.length} files)
                  </button>
                )}
              </div>

              {/* Files List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No files uploaded</p>
                  </div>
                ) : (
                  attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="group flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {getFileIcon(attachment.file_type)}
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-[#006B7D] truncate block"
                        >
                          {attachment.file_name}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(attachment.created_at)}</span>
                          {attachment.source === 'comment' && (
                            <>
                              <span>•</span>
                              <span className="text-blue-500">from comment</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={attachment.file_url}
                          download={attachment.file_name}
                          className="p-1.5 text-gray-400 hover:text-[#006B7D] transition-colors"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        {attachment.uploaded_by === user?.id && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
