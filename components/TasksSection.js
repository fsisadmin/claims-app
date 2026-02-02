'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      case 'open': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (dueDate, status) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !['completed', 'closed', 'cancelled'].includes(status)
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
                        {task.status === 'in_progress' ? 'In Progress' : task.status}
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
    status: task?.status || 'open',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      const taskData = {
        ...formData,
        client_id: clientId,
        client_name: clientName,
        linked_entity_type: linkedEntityType || null,
        linked_entity_id: linkedEntityId || null,
        linked_entity_name: linkedEntityName || null,
      }

      if (task) {
        await updateTask(task.id, taskData, organizationId, userId)
      } else {
        await createTask(taskData, organizationId, userId)
      }
      onSave()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task')
    } finally {
      setSaving(false)
    }
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
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
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
