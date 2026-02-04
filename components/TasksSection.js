'use client'

import { useState, useEffect } from 'react'
import { useTasks, createTask, updateTask, deleteTask } from '@/hooks'
import { supabase } from '@/lib/supabase'

export default function TasksSection({
  clientId,
  clientName,
  linkedEntityType,
  linkedEntityId,
  linkedEntityName,
  organizationId,
  userId,
  users = []
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  // Fetch tasks for this specific entity
  const { tasks, isLoading, mutate } = useTasks(organizationId, {
    clientId: linkedEntityType ? null : clientId, // If linked to entity, don't filter by client
    linkedEntityType: linkedEntityType || null,
    linkedEntityId: linkedEntityId || null
  })

  // Filter tasks - if no linked entity, show all client tasks
  const filteredTasks = linkedEntityType
    ? tasks
    : tasks.filter(t => t.client_id === clientId)

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (dueDate, status) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#006B7D]">Tasks</h2>
        <button
          onClick={() => { setEditingTask(null); setShowCreateModal(true) }}
          className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#006B7D]"></div>
            <p className="mt-2 text-sm text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-sm text-gray-500">No tasks yet</p>
            <button
              onClick={() => { setEditingTask(null); setShowCreateModal(true) }}
              className="mt-2 text-sm text-[#006B7D] hover:text-[#008BA3] font-medium"
            >
              Create the first task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => { setEditingTask(task); setShowCreateModal(true) }}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status === 'in_progress' ? 'In Progress' : task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {task.assignee?.full_name && (
                        <span>Assigned to: {task.assignee.full_name}</span>
                      )}
                      {task.due_date && (
                        <span className={isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : ''}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                          {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                        </span>
                      )}
                      {!task.due_date && (
                        <span>Due: Pending</span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Create/Edit Modal */}
      {showCreateModal && (
        <QuickTaskModal
          task={editingTask}
          clientId={clientId}
          clientName={clientName}
          linkedEntityType={linkedEntityType}
          linkedEntityId={linkedEntityId}
          linkedEntityName={linkedEntityName}
          organizationId={organizationId}
          userId={userId}
          users={users}
          onClose={() => { setShowCreateModal(false); setEditingTask(null) }}
          onSave={() => { mutate(); setShowCreateModal(false); setEditingTask(null) }}
          onDelete={async () => {
            if (editingTask) {
              await deleteTask(editingTask.id, organizationId)
              mutate()
              setShowCreateModal(false)
              setEditingTask(null)
            }
          }}
        />
      )}
    </div>
  )
}

function QuickTaskModal({
  task,
  clientId,
  clientName,
  linkedEntityType,
  linkedEntityId,
  linkedEntityName,
  organizationId,
  userId,
  users,
  onClose,
  onSave,
  onDelete
}) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date || '',
    priority: task?.priority || 'normal',
    status: task?.status || 'assigned',
  })
  const [saving, setSaving] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([]) // Files to upload on new task
  const [attachments, setAttachments] = useState([]) // Existing attachments for edit
  const [uploading, setUploading] = useState(false)

  // Load existing attachments when editing
  useEffect(() => {
    async function loadAttachments() {
      if (task?.id) {
        const { data } = await supabase
          .from('entity_attachments')
          .select('*')
          .eq('entity_type', 'task')
          .eq('entity_id', task.id)
          .order('created_at', { ascending: false })
        setAttachments(data || [])
      }
    }
    loadAttachments()
  }, [task?.id])

  // Stage files for upload (new task) or upload immediately (existing task)
  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (task?.id) {
      // Existing task - upload immediately
      setUploading(true)
      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `task-attachments/${task.id}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data, error } = await supabase
            .from('entity_attachments')
            .insert({
              organization_id: organizationId,
              entity_type: 'task',
              entity_id: task.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_path: fileName,
              uploaded_by: userId,
            })
            .select()
            .single()

          if (error) throw error
          setAttachments(prev => [data, ...prev])
        } catch (error) {
          console.error('Error uploading file:', error)
          alert(`Failed to upload ${file.name}`)
        }
      }
      setUploading(false)
    } else {
      // New task - stage files for later upload
      setStagedFiles(prev => [...prev, ...files])
    }
    e.target.value = ''
  }

  // Remove staged file
  function removeStagedFile(index) {
    setStagedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Delete existing attachment
  async function handleDeleteAttachment(attachment) {
    if (!confirm('Delete this file?')) return
    try {
      await supabase.storage.from('attachments').remove([attachment.storage_path])
      await supabase.from('entity_attachments').delete().eq('id', attachment.id)
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete file')
    }
  }

  // Download attachment
  async function handleDownload(attachment) {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.storage_path, 3600)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file')
    }
  }

  // Upload staged files after task creation
  async function uploadStagedFiles(taskId) {
    for (const file of stagedFiles) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `task-attachments/${taskId}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        await supabase
          .from('entity_attachments')
          .insert({
            organization_id: organizationId,
            entity_type: 'task',
            entity_id: taskId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: fileName,
            uploaded_by: userId,
          })
      } catch (error) {
        console.error('Error uploading staged file:', error)
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      const taskData = {
        ...formData,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        client_id: clientId,
        client_name: clientName,
        linked_entity_type: linkedEntityType || null,
        linked_entity_id: linkedEntityId || null,
        linked_entity_name: linkedEntityName || null,
      }

      if (task) {
        await updateTask(task.id, taskData, organizationId, userId)
      } else {
        // Create task and get the new task ID
        const newTask = await createTask(taskData, organizationId, userId)
        // Upload any staged files
        if (stagedFiles.length > 0 && newTask?.id) {
          await uploadStagedFiles(newTask.id)
        }
      }
      onSave()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {linkedEntityType && linkedEntityName && (
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#006B7D]/10 text-[#006B7D] text-xs font-medium rounded capitalize">
                {linkedEntityType}
              </span>
              <span className="text-sm text-gray-600">{linkedEntityName}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              placeholder="Enter task title"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              placeholder="Enter task description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              >
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* File Attachments */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Attachments {(stagedFiles.length > 0 || attachments.length > 0) &&
                  `(${task ? attachments.length : stagedFiles.length})`}
              </label>
              <label className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                uploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#006B7D]/10 text-[#006B7D] hover:bg-[#006B7D]/20'
              }`}>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? 'Uploading...' : '+ Add Files'}
              </label>
            </div>

            {/* Staged files for new task */}
            {!task && stagedFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {stagedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate text-gray-700">{file.name}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedFile(index)}
                      className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-500">Files will be uploaded when the task is created.</p>
              </div>
            )}

            {/* Existing attachments for edit */}
            {task && attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm group">
                    <button
                      type="button"
                      onClick={() => handleDownload(attachment)}
                      className="flex items-center gap-2 min-w-0 text-left hover:text-[#006B7D]"
                    >
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate text-gray-700">{attachment.file_name}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">({formatFileSize(attachment.file_size)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(attachment)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!task && stagedFiles.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No files attached</p>
            )}
            {task && attachments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No files attached</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {task && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this task?')) {
                    onDelete()
                  }
                }}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors"
              >
                Delete task
              </button>
            )}
            {!task && <div />}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.title.trim()}
                className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : task ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
