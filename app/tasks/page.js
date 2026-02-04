'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import { useTasks, createTask, updateTask, closeTask, deleteTask } from '@/hooks'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [statusFilter, setStatusFilter] = useState('assigned')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [autoOpenTaskId, setAutoOpenTaskId] = useState(null)

  const { tasks, isLoading, mutate } = useTasks(profile?.organization_id, {
    status: statusFilter === 'all' ? null : statusFilter,
    assignedTo: assigneeFilter === 'all' ? null : assigneeFilter === 'unassigned' ? 'unassigned' : assigneeFilter
  })

  // Fetch users and clients for dropdowns
  useEffect(() => {
    async function fetchData() {
      if (!profile?.organization_id) return

      const [usersRes, clientsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .order('full_name'),
        supabase
          .from('clients')
          .select('id, name')
          .eq('organization_id', profile.organization_id)
          .order('name')
      ])

      setUsers(usersRes.data || [])
      setClients(clientsRes.data || [])
    }
    fetchData()
  }, [profile?.organization_id])

  // Check for task ID in URL query param to auto-open
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId) {
      setAutoOpenTaskId(taskId)
      // Clear the URL param without reloading
      router.replace('/tasks', { scroll: false })
    }
  }, [searchParams, router])

  // Auto-open task modal when task ID is set and tasks are loaded
  useEffect(() => {
    if (autoOpenTaskId && tasks.length > 0) {
      const taskToOpen = tasks.find(t => t.id === autoOpenTaskId)
      if (taskToOpen) {
        setEditingTask(taskToOpen)
        setShowCreateModal(true)
      }
      setAutoOpenTaskId(null)
    }
  }, [autoOpenTaskId, tasks])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#006B7D]">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage and track your tasks</p>
          </div>
          <button
            onClick={() => { setEditingTask(null); setShowCreateModal(true) }}
            className="px-5 py-2.5 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex gap-2">
                {['all', 'assigned', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-[#006B7D] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Assigned To:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-[#006B7D] focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value={user.id}>My Tasks</option>
                <option value="unassigned">Unassigned</option>
                {users.filter(u => u.id !== user.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
              <p className="mt-2 text-gray-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500">No tasks found</p>
              <button
                onClick={() => { setEditingTask(null); setShowCreateModal(true) }}
                className="mt-4 text-[#006B7D] hover:text-[#008BA3] font-medium"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => { setEditingTask(task); setShowCreateModal(true) }}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="text-[#006B7D] font-medium">
                        {task.client_name || 'Unknown Client'}
                      </div>
                      {task.linked_entity_type && task.linked_entity_name && (
                        <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium w-fit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="capitalize">{task.linked_entity_type}:</span>
                          <span className="text-gray-900">{task.linked_entity_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.assignee?.full_name || task.assignee?.email || '-'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : <span className="text-gray-400">Pending</span>}
                      {isOverdue(task.due_date, task.status) && <span className="ml-1 text-xs">(Overdue)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status === 'in_progress' ? 'In Progress' : task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <TaskModal
          task={editingTask}
          users={users}
          clients={clients}
          organizationId={profile.organization_id}
          userId={profile.id}
          onClose={() => { setShowCreateModal(false); setEditingTask(null) }}
          onSave={() => { mutate(); setShowCreateModal(false); setEditingTask(null) }}
          onDelete={async () => {
            if (editingTask) {
              await deleteTask(editingTask.id, profile.organization_id)
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

function TaskModal({ task, users, clients, organizationId, userId, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    content_url: task?.content_url || '',
    client_id: task?.client_id || '',
    client_name: task?.client_name || '',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date || '',
    priority: task?.priority || 'normal',
    status: task?.status || 'assigned',
    linked_entity_type: task?.linked_entity_type || '',
    linked_entity_id: task?.linked_entity_id || '',
    linked_entity_name: task?.linked_entity_name || '',
    is_shared: task?.is_shared || false,
  })
  const [saving, setSaving] = useState(false)
  const [entityOptions, setEntityOptions] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([]) // Files to upload on new task creation

  // Load entity options for a category (without clearing form values)
  async function loadEntityOptions(category, clientId) {
    if (!category || !clientId) return []

    let options = []

    if (category === 'location') {
      const { data } = await supabase
        .from('locations')
        .select('id, location_name, street_address')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('location_name')
        .limit(100)
      options = (data || []).map(l => ({
        id: l.id,
        name: l.location_name || l.street_address || 'Unnamed Location'
      }))
    } else if (category === 'claim') {
      const { data } = await supabase
        .from('claims')
        .select('id, claim_number, loss_description, loss_date')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('loss_date', { ascending: false })
        .limit(100)
      options = (data || []).map(c => ({
        id: c.id,
        name: c.claim_number || c.loss_description?.slice(0, 50) || 'Unnamed Claim'
      }))
    } else if (category === 'incident') {
      const { data } = await supabase
        .from('incidents')
        .select('id, incident_number, description, incident_date')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('incident_date', { ascending: false })
        .limit(100)
      options = (data || []).map(i => ({
        id: i.id,
        name: i.incident_number || i.description?.slice(0, 50) || 'Unnamed Incident'
      }))
    } else if (category === 'policy') {
      const { data } = await supabase
        .from('policies')
        .select('id, policy_number, policy_type, effective_date')
        .eq('organization_id', organizationId)
        .eq('client_id', clientId)
        .order('effective_date', { ascending: false })
        .limit(100)
      options = (data || []).map(p => ({
        id: p.id,
        name: p.policy_number || p.policy_type || 'Unnamed Policy'
      }))
    }

    return options
  }

  // Load entity options when editing a task with existing linked entity
  useEffect(() => {
    async function loadExistingOptions() {
      if (task?.linked_entity_type && task?.client_id) {
        setLoadingEntities(true)
        const options = await loadEntityOptions(task.linked_entity_type, task.client_id)
        setEntityOptions(options)
        setLoadingEntities(false)
      }
    }
    loadExistingOptions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load attachments when editing a task
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

  // Upload attachment (or stage for new task)
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (task?.id) {
      // Existing task - upload immediately
      setUploading(true)
      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${task.id}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`
          const storagePath = `task-attachments/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(storagePath, file)

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
              file_url: null,
              storage_path: storagePath,
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

  // Upload staged files after task creation
  async function uploadStagedFiles(taskId) {
    for (const file of stagedFiles) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`
        const storagePath = `task-attachments/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storagePath, file)

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
            storage_path: storagePath,
            uploaded_by: userId,
          })
      } catch (error) {
        console.error('Error uploading staged file:', error)
      }
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Get signed URL for private file download (valid for 1 hour)
  async function getSignedUrl(storagePath) {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry
    if (error) throw error
    return data.signedUrl
  }

  // Download single attachment
  async function handleDownload(attachment) {
    try {
      const url = await getSignedUrl(attachment.storage_path)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file')
    }
  }

  // Download all attachments as ZIP
  const [downloadingAll, setDownloadingAll] = useState(false)

  async function handleDownloadAll() {
    if (attachments.length === 0) return

    setDownloadingAll(true)
    try {
      const zip = new JSZip()

      // Fetch each file and add to ZIP
      for (const attachment of attachments) {
        try {
          const url = await getSignedUrl(attachment.storage_path)
          const response = await fetch(url)
          const blob = await response.blob()
          zip.file(attachment.file_name, blob)
        } catch (error) {
          console.error('Error fetching file:', attachment.file_name, error)
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const taskTitle = task?.title?.replace(/[^a-z0-9]/gi, '_') || 'task'
      saveAs(zipBlob, `${taskTitle}_documents.zip`)
    } catch (error) {
      console.error('Error creating ZIP:', error)
      alert('Failed to download files')
    } finally {
      setDownloadingAll(false)
    }
  }

  // Delete attachment
  async function handleDeleteAttachment(attachment) {
    if (!confirm('Delete this attachment?')) return

    try {
      // Delete from storage
      await supabase.storage
        .from('attachments')
        .remove([attachment.storage_path])

      // Delete record
      await supabase
        .from('entity_attachments')
        .delete()
        .eq('id', attachment.id)

      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete attachment')
    }
  }

  // Update client_name when client_id changes
  function handleClientChange(clientId) {
    const client = clients.find(c => c.id === clientId)
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      client_name: client?.name || '',
      // Clear linked entity if client changes
      linked_entity_type: '',
      linked_entity_id: '',
      linked_entity_name: ''
    }))
    setEntityOptions([])
  }

  // Handle category change - load items for that category
  async function handleCategoryChange(category) {
    setFormData(prev => ({
      ...prev,
      linked_entity_type: category,
      linked_entity_id: '',
      linked_entity_name: ''
    }))
    setEntityOptions([])

    if (!category || !formData.client_id) return

    setLoadingEntities(true)
    try {
      const options = await loadEntityOptions(category, formData.client_id)
      setEntityOptions(options)
    } catch (error) {
      console.error('Error loading entities:', error)
    } finally {
      setLoadingEntities(false)
    }
  }

  // Handle specific item selection
  function handleEntitySelect(entityId) {
    const entity = entityOptions.find(e => e.id === entityId)
    setFormData(prev => ({
      ...prev,
      linked_entity_id: entityId,
      linked_entity_name: entity?.name || ''
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.client_id) return

    setSaving(true)
    try {
      if (task) {
        await updateTask(task.id, formData, organizationId, userId)
      } else {
        // Create task and get the new task ID
        const newTask = await createTask(formData, organizationId, userId)
        // Upload any staged files
        if (stagedFiles.length > 0 && newTask?.id) {
          await uploadStagedFiles(newTask.id)
        }
      }
      onSave()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task: ' + (error?.message || error?.code || JSON.stringify(error)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client & Link To Selection - Grouped Together */}
          <div className="bg-[#006B7D]/5 border border-[#006B7D]/20 rounded-lg p-4 space-y-4">
            {/* Client Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-[#006B7D] mb-2">Client *</label>
              <select
                value={formData.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900 bg-white"
                required
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category & Item Dropdowns - Only show when client is selected */}
            {formData.client_id && (
              <div className="grid grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-[#006B7D]/70 mb-1">Category (optional)</label>
                  <select
                    value={formData.linked_entity_type}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="">Select category...</option>
                    <option value="location">Location</option>
                    <option value="policy">Policy</option>
                    <option value="claim">Claim</option>
                    <option value="incident">Incident</option>
                  </select>
                </div>

                {/* Specific Item Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-[#006B7D]/70 mb-1">Select Item</label>
                  <div className="relative">
                    <select
                      value={formData.linked_entity_id}
                      onChange={(e) => handleEntitySelect(e.target.value)}
                      disabled={!formData.linked_entity_type || loadingEntities}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">
                        {loadingEntities ? 'Loading...' : !formData.linked_entity_type ? 'Select category first' : `Select ${formData.linked_entity_type}...`}
                      </option>
                      {entityOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {loadingEntities && (
                      <div className="absolute right-8 top-2.5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#006B7D]"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show selected item summary */}
            {formData.linked_entity_id && formData.linked_entity_name && (
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-[#006B7D]/20">
                <span className="px-2 py-0.5 bg-[#006B7D]/10 text-[#006B7D] text-xs font-medium rounded capitalize">
                  {formData.linked_entity_type}
                </span>
                <span className="text-sm text-gray-900 flex-1 truncate">{formData.linked_entity_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      linked_entity_type: '',
                      linked_entity_id: '',
                      linked_entity_name: ''
                    }))
                    setEntityOptions([])
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

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
              rows={3}
            />
          </div>

          {/* Content URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content URL</label>
            <input
              type="url"
              value={formData.content_url}
              onChange={(e) => setFormData(prev => ({ ...prev, content_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
              placeholder="https://..."
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

          {/* Shared */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_shared"
              checked={formData.is_shared}
              onChange={(e) => setFormData(prev => ({ ...prev, is_shared: e.target.checked }))}
              className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
            />
            <label htmlFor="is_shared" className="text-sm text-gray-700">Share with team</label>
          </div>

          {/* Supporting Documents */}
          {task ? (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Supporting Documents</label>
                <div className="flex items-center gap-2">
                  {attachments.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {downloadingAll ? (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          Creating ZIP...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download All
                        </>
                      )}
                    </button>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#006B7D] bg-[#006B7D]/10 hover:bg-[#006B7D]/20 rounded-lg transition-colors">
                      {uploading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-[#006B7D] border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add File
                        </>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      <button
                        type="button"
                        onClick={() => handleDownload(attachment)}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#006B7D] flex-1 min-w-0 text-left"
                      >
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{attachment.file_name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(0)} KB` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(attachment)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">No documents attached</p>
              )}
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Supporting Documents {stagedFiles.length > 0 && `(${stagedFiles.length})`}
                </label>
                <label className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-[#006B7D]/10 text-[#006B7D] hover:bg-[#006B7D]/20">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  + Add Files
                </label>
              </div>

              {stagedFiles.length > 0 ? (
                <div className="space-y-2">
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
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">No files attached</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {/* Delete - only show when editing existing task */}
            {task && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to permanently delete this task? This cannot be undone.')) {
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
                disabled={saving || !formData.title.trim() || !formData.client_id}
                className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
