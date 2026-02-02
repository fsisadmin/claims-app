'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import TasksSection from '@/components/TasksSection'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Format date
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

// Detail row component
function DetailRow({ label, value, isLink, href }) {
  return (
    <div className="flex py-1">
      <div className="w-32 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <div className="flex-1 text-sm text-gray-900">
        {isLink && href ? (
          <Link href={href} className="text-[#006B7D] hover:underline">
            {value || ''}
          </Link>
        ) : (
          value || ''
        )}
      </div>
    </div>
  )
}

export default function IncidentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const fileInputRef = useRef(null)

  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Users for task assignment
  const [users, setUsers] = useState([])

  // Sidebar data
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [files, setFiles] = useState([])

  // Sidebar collapsed states
  const [tasksOpen, setTasksOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [contactsOpen, setContactsOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(true)

  // New note input
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Fetch incident data
  const fetchIncident = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          clients:client_id(id, name),
          locations:location_id(id, location_name, company)
        `)
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error) throw error
      setIncident(data)
    } catch (error) {
      console.error('Error fetching incident:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [params.id, profile?.organization_id])

  // Fetch sidebar data
  const fetchSidebarData = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    // Fetch tasks
    const { data: tasksData } = await supabase
      .from('entity_tasks')
      .select('*, assigned_user:assigned_to(id, email)')
      .eq('entity_type', 'incident')
      .eq('entity_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    setTasks(tasksData || [])

    // Fetch notes (comments)
    const { data: notesData } = await supabase
      .from('comments')
      .select('*, user:created_by(id, email)')
      .eq('entity_type', 'incident')
      .eq('entity_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(5)

    setNotes(notesData || [])

    // Fetch contacts
    const { data: contactsData } = await supabase
      .from('entity_contacts')
      .select('*')
      .eq('entity_type', 'incident')
      .eq('entity_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    setContacts(contactsData || [])

    // Fetch files
    const { data: filesData } = await supabase
      .from('entity_attachments')
      .select('*')
      .eq('entity_type', 'incident')
      .eq('entity_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    setFiles(filesData || [])
  }, [params.id, profile?.organization_id])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      fetchIncident()
      fetchSidebarData()
    }
  }, [user, profile, fetchIncident, fetchSidebarData])

  // Fetch users for task assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!profile?.organization_id) return
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name')
      setUsers(data || [])
    }
    fetchUsers()
  }, [profile?.organization_id])

  // Handle create claim from incident
  const handleCreateClaim = () => {
    router.push(`/clients/${incident.client_id}/claims/add?from_incident=${params.id}`)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this incident? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', params.id)

      if (error) throw error
      router.push('/')
    } catch (error) {
      console.error('Error deleting incident:', error)
      alert('Failed to delete incident: ' + error.message)
    }
  }

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setAddingNote(true)
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          organization_id: profile.organization_id,
          entity_type: 'incident',
          entity_id: params.id,
          content: newNote.trim(),
          created_by: user.id,
        })

      if (error) throw error
      setNewNote('')
      fetchSidebarData()
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note: ' + error.message)
    } finally {
      setAddingNote(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${params.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Create signed URL
      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365)

      // Save attachment record
      const { error: dbError } = await supabase
        .from('entity_attachments')
        .insert({
          organization_id: profile.organization_id,
          entity_type: 'incident',
          entity_id: params.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          url: urlData?.signedUrl,
          uploaded_by: user.id,
        })

      if (dbError) throw dbError
      fetchSidebarData()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file: ' + error.message)
    }

    e.target.value = ''
  }

  // Get user name from notes
  const getUserName = (note) => {
    if (!note.user) return 'Unknown'
    const email = note.user.email || ''
    return email.split('@')[0].replace('.', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading incident...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">{error || 'Incident not found'}</p>
            <button onClick={() => router.push('/')} className="mt-4 text-[#006B7D] hover:underline">
              Back to Clients
            </button>
          </div>
        </main>
      </div>
    )
  }

  const openTasks = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb and Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/" className="text-[#006B7D] hover:underline">Incidents</Link>
              <span>&gt;</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {incident.claimant || 'Unknown Person'} ({incident.incident_number})
              </h1>
              <button className="text-gray-400 hover:text-yellow-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateClaim}
              className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded text-sm font-medium transition-colors"
            >
              Create Claim
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <Link
                      href={`/incidents/${params.id}/edit`}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit Incident
                    </Link>
                    <button
                      onClick={() => { handleDelete(); setShowMoreMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Incident
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-4">
          <TasksSection
            clientId={incident.client_id}
            clientName={incident.clients?.name}
            linkedEntityType="incident"
            linkedEntityId={params.id}
            linkedEntityName={incident.incident_number ? `Incident ${incident.incident_number}` : 'Incident'}
            organizationId={profile.organization_id}
            userId={user.id}
            users={users}
          />
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Incident Type Header */}
              <h2 className="text-lg font-semibold text-[#006B7D] mb-4">
                {incident.incident_type || 'Incident'}
              </h2>

              <DetailRow label="Claimant" value={incident.claimant || 'Unknown Person'} />

              {/* Loss Location Section */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Loss Location</h3>
                <DetailRow label="Property Name" value={incident.property_name} />
                <DetailRow label="Loss Street 1" value={incident.loss_street_1} />
                {incident.loss_street_2 && <DetailRow label="Loss Street 2" value={incident.loss_street_2} />}
                <DetailRow label="Loss City" value={incident.loss_city} />
                <DetailRow label="Loss State" value={incident.loss_state} />
                <DetailRow label="Loss Postal Code" value={incident.loss_postal_code} />
              </div>

              {/* Right column info (displayed below on this layout) */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-8">
                <div>
                  <DetailRow
                    label="Policy"
                    value={incident.policy}
                    isLink={!!incident.policy}
                    href="#"
                  />
                  <DetailRow label="Report Date" value={formatDate(incident.report_date || incident.created_at)} />
                  <DetailRow label="Accident Description" value={incident.accident_description || incident.event_description} />
                </div>
                <div>
                  <DetailRow
                    label="Location"
                    value={incident.locations ? `${incident.locations.location_name || incident.locations.company}` : ''}
                    isLink={!!incident.location_id}
                    href={incident.location_id ? `/clients/${incident.client_id}/locations/${incident.location_id}` : ''}
                  />
                  <DetailRow label="Cause" value={incident.cause_of_loss} />
                  <DetailRow label="Loss Date" value={formatDate(incident.loss_date)} />
                  <DetailRow label="Accident State" value={incident.accident_state || incident.loss_state} />
                  <DetailRow label="Loss Description" value={incident.event_description} />
                </div>
              </div>

              {/* Full Details Toggle */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="text-[#006B7D] hover:text-[#008BA3] text-sm font-medium flex items-center gap-1 mx-auto"
                >
                  <svg className={`w-4 h-4 transition-transform ${showFullDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Full Details
                </button>

                {showFullDetails && (
                  <div className="mt-4 text-left grid grid-cols-2 gap-8">
                    <div>
                      <DetailRow label="Incident Number" value={`#${incident.incident_number}`} />
                      <DetailRow label="Status" value={incident.status} />
                      <DetailRow label="Incident Only" value={incident.incident_only ? 'Yes' : 'No'} />
                      <DetailRow label="Reported By" value={incident.reported_by} />
                      <DetailRow label="Reported By Email" value={incident.reported_by_email} />
                      <DetailRow label="Reported By Phone" value={incident.reported_by_phone} />
                    </div>
                    <div>
                      <DetailRow label="Injuries Reported" value={incident.injuries_reported ? 'Yes' : 'No'} />
                      <DetailRow label="Police Report Filed" value={incident.police_report_filed ? 'Yes' : 'No'} />
                      <DetailRow label="Police Report Number" value={incident.police_report_number} />
                      {incident.clients && (
                        <DetailRow
                          label="Client"
                          value={incident.clients.name}
                          isLink
                          href={`/clients/${incident.client_id}`}
                        />
                      )}
                    </div>
                    {incident.notes && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Notes:</div>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{incident.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Open Tasks */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setTasksOpen(!tasksOpen)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Open Tasks</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${tasksOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tasksOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  {openTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No open tasks yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {openTasks.map(task => (
                        <li key={task.id} className="py-2 text-sm text-gray-700">{task.title}</li>
                      ))}
                    </ul>
                  )}
                  <button className="text-[#006B7D] hover:underline text-sm mt-2">+ Create New</button>
                </div>
              )}
            </div>

            {/* All Notes */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setNotesOpen(!notesOpen)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">All Notes</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${notesOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {notesOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <button className="text-[#006B7D] hover:underline text-xs">View All Notes</button>
                    <button className="text-[#006B7D] hover:underline text-xs">+ Create New</button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No notes yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {notes.map(note => (
                        <div key={note.id} className="text-xs">
                          <p className="text-gray-700 line-clamp-2">{note.content}</p>
                          <p className="text-gray-400 mt-1">
                            <span className="text-[#006B7D]">{getUserName(note)}</span> on {formatDate(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Quick add note */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a quick note..."
                      rows={2}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-[#006B7D] focus:border-[#006B7D] text-gray-900"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !newNote.trim()}
                      className="mt-1 text-xs text-[#006B7D] hover:underline disabled:opacity-50"
                    >
                      {addingNote ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setContactsOpen(!contactsOpen)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Contacts</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${contactsOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {contactsOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No contacts. <button className="text-[#006B7D] hover:underline">Click here</button> to add one.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {contacts.map(contact => (
                        <li key={contact.id} className="py-2 text-sm">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          {contact.role && <p className="text-gray-500 text-xs">{contact.role}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Files */}
            <div className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => setFilesOpen(!filesOpen)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">Files</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${filesOpen ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filesOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <button className="text-[#006B7D] hover:underline text-xs">New</button>
                    <button className="text-[#006B7D] hover:underline text-xs">All Files</button>
                  </div>
                  {files.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No files attached.</p>
                  ) : (
                    <ul className="space-y-1">
                      {files.map(file => (
                        <li key={file.id}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#006B7D] hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {file.file_name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 border-2 border-dashed border-gray-200 rounded p-3 text-center cursor-pointer hover:border-[#006B7D] transition-colors"
                  >
                    <p className="text-xs text-gray-500">Drop files to attach</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
