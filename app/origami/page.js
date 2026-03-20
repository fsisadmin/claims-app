'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-orange-100 text-orange-800',
  none: 'bg-red-100 text-red-800',
}

function getConfidenceLevel(score) {
  if (score >= 90) return 'high'
  if (score >= 70) return 'medium'
  if (score >= 50) return 'low'
  return 'none'
}

function getConfidenceLabel(score) {
  if (score >= 90) return 'High'
  if (score >= 70) return 'Medium'
  if (score >= 50) return 'Low'
  if (score > 0) return 'Weak'
  return 'No Match'
}

export default function OrigamiImportPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  const [pageMode, setPageMode] = useState('clients') // 'clients' | 'locations'

  // Client matching state
  const [status, setStatus] = useState('idle') // idle | loading | review | reverse | confirming | done
  const [matches, setMatches] = useState([])
  const [origamiClients, setOrigamiClients] = useState([])
  const [appClients, setAppClients] = useState([])
  const [selections, setSelections] = useState({})
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false)
  const [manualPickId, setManualPickId] = useState(null)
  const [manualSearch, setManualSearch] = useState('')
  const [progress, setProgress] = useState('')
  // Reverse mode: keyed by app_client_id → { origami_client_id, confirmed }
  const [reverseSelections, setReverseSelections] = useState({})
  const [reversePickId, setReversePickId] = useState(null)
  const [reverseSearch, setReverseSearch] = useState('')

  // Location matching state
  const [locStatus, setLocStatus] = useState('idle') // idle | loading | reverse | review
  const [locAppClients, setLocAppClients] = useState([]) // matched app clients for picker
  const [selectedAppClientId, setSelectedAppClientId] = useState(null)
  const [origamiLocations, setOrigamiLocations] = useState([])
  const [appLocations, setAppLocations] = useState([])
  const [locReverseSelections, setLocReverseSelections] = useState({})
  const [locPickId, setLocPickId] = useState(null)
  const [locSearch, setLocSearch] = useState('')
  const [locSearchFilter, setLocSearchFilter] = useState('')
  const [locError, setLocError] = useState(null)
  const [locMatches, setLocMatches] = useState([]) // AI match results
  const [locSelections, setLocSelections] = useState({}) // origami_location_id → { app_location_id, confidence, reasoning, confirmed }
  const [locManualPickId, setLocManualPickId] = useState(null)
  const [locManualSearch, setLocManualSearch] = useState('')

  // Filter matches for display
  const filteredMatches = useMemo(() => {
    let filtered = matches
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      filtered = filtered.filter(m => {
        const origClient = origamiClients.find(o => o.client_id === m.origami_client_id)
        return origClient?.name?.toLowerCase().includes(q)
      })
    }
    if (showOnlyUnmatched) {
      filtered = filtered.filter(m => !m.app_client_id || m.confidence < 50)
    }
    return filtered
  }, [matches, searchFilter, showOnlyUnmatched, origamiClients])

  // Filtered app clients for manual picker
  const filteredAppClients = useMemo(() => {
    if (!manualSearch) return appClients.slice(0, 20)
    const q = manualSearch.toLowerCase()
    return appClients.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 20)
  }, [appClients, manualSearch])

  // Filtered origami clients for reverse picker
  const filteredOrigamiClients = useMemo(() => {
    if (!reverseSearch) return origamiClients.slice(0, 20)
    const q = reverseSearch.toLowerCase()
    return origamiClients.filter(c => c.name?.toLowerCase().includes(q) || (c.reference_number || '').toLowerCase().includes(q)).slice(0, 20)
  }, [origamiClients, reverseSearch])

  // Filtered location matches for AI review display
  const filteredLocMatches = useMemo(() => {
    let filtered = locMatches
    if (locSearchFilter) {
      const q = locSearchFilter.toLowerCase()
      filtered = filtered.filter(m => {
        const origLoc = origamiLocations.find(o => o.location_id === m.origami_location_id)
        return (origLoc?.description || '').toLowerCase().includes(q) ||
               (origLoc?.city || '').toLowerCase().includes(q) ||
               (origLoc?.street1 || '').toLowerCase().includes(q)
      })
    }
    return filtered
  }, [locMatches, locSearchFilter, origamiLocations])

  // Filtered app locations for manual location picker in review mode
  const filteredAppLocationsForPicker = useMemo(() => {
    if (!locManualSearch) return appLocations.slice(0, 20)
    const q = locManualSearch.toLowerCase()
    return appLocations.filter(l =>
      (l.location_name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.street_address || '').toLowerCase().includes(q)
    ).slice(0, 20)
  }, [appLocations, locManualSearch])

  // Filtered origami locations for picker
  const filteredOrigamiLocations = useMemo(() => {
    if (!locSearch) return origamiLocations.slice(0, 20)
    const q = locSearch.toLowerCase()
    return origamiLocations.filter(l =>
      (l.description || '').toLowerCase().includes(q) ||
      (l.display_code || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.street1 || '').toLowerCase().includes(q)
    ).slice(0, 20)
  }, [origamiLocations, locSearch])

  // Filtered app locations for reverse mode display
  const filteredAppLocations = useMemo(() => {
    if (!locSearchFilter) return appLocations
    const q = locSearchFilter.toLowerCase()
    return appLocations.filter(l =>
      (l.location_name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.street_address || '').toLowerCase().includes(q)
    )
  }, [appLocations, locSearchFilter])

  // Filtered app clients for reverse mode display
  const filteredAppForReverse = useMemo(() => {
    if (!searchFilter) return appClients
    const q = searchFilter.toLowerCase()
    return appClients.filter(c => c.name?.toLowerCase().includes(q) || (c.ams_code || '').toLowerCase().includes(q))
  }, [appClients, searchFilter])

  // Stats
  const confirmedCount = Object.values(selections).filter(s => s.confirmed && s.app_client_id).length
  const highConfCount = matches.filter(m => m.confidence >= 90).length
  const noMatchCount = matches.filter(m => !m.app_client_id || m.confidence === 0).length
  const reverseTotalCount = Object.values(reverseSelections).reduce((sum, s) => sum + (s.picks?.length || 0), 0)
  const locConfirmedCount = Object.values(locSelections).filter(s => s.confirmed && s.app_location_id).length
  const locHighConfCount = locMatches.filter(m => m.confidence >= 90).length

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]" />
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    router.push('/login')
    return null
  }

  // Load clients for manual matching (no AI)
  const handleManualMode = async () => {
    setStatus('loading')
    setError(null)
    setProgress('Loading client lists...')

    try {
      const res = await fetch('/api/origami/list-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (!data.origamiClients?.length) {
        setResult({ success: true, message: 'All origami clients are already mapped.' })
        setStatus('done')
        return
      }

      // Create a match entry for each origami client with no AI match
      const manualMatches = data.origamiClients.map(o => ({
        origami_client_id: o.client_id,
        app_client_id: null,
        confidence: 0,
        reasoning: '',
      }))

      setMatches(manualMatches)
      setOrigamiClients(data.origamiClients)
      setAppClients(data.appClients)

      const initial = {}
      manualMatches.forEach(m => {
        initial[m.origami_client_id] = {
          app_client_id: null,
          confidence: 0,
          reasoning: '',
          confirmed: false,
        }
      })
      setSelections(initial)
      setStatus('review')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  // Run AI matching
  const handleRunMatching = async () => {
    setStatus('loading')
    setError(null)
    setProgress('Fetching clients and running AI matching...')

    try {
      const res = await fetch('/api/origami/match-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.message) {
        setResult({ success: true, message: data.message })
        setStatus('done')
        return
      }

      setMatches(data.matches)
      setOrigamiClients(data.origamiClients)
      setAppClients(data.appClients)

      // Pre-populate selections
      const initial = {}
      data.matches.forEach(m => {
        initial[m.origami_client_id] = {
          app_client_id: m.app_client_id,
          confidence: m.confidence,
          reasoning: m.reasoning,
          confirmed: false,
        }
      })
      setSelections(initial)
      setStatus('review')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  // Toggle confirm for a single row
  const toggleConfirm = (origamiClientId) => {
    setSelections(prev => ({
      ...prev,
      [origamiClientId]: {
        ...prev[origamiClientId],
        confirmed: !prev[origamiClientId]?.confirmed,
      },
    }))
  }

  // Confirm all high-confidence matches
  const confirmAllHigh = () => {
    setSelections(prev => {
      const next = { ...prev }
      Object.entries(next).forEach(([id, sel]) => {
        if (sel.confidence >= 90 && sel.app_client_id) {
          next[id] = { ...sel, confirmed: true }
        }
      })
      return next
    })
  }

  // Manual client pick
  const handleManualPick = (origamiClientId, appClient) => {
    setSelections(prev => ({
      ...prev,
      [origamiClientId]: {
        app_client_id: appClient.id,
        confidence: 100,
        reasoning: 'Manually selected by user',
        confirmed: true,
      },
    }))
    setManualPickId(null)
    setManualSearch('')
  }

  // Reverse mode: start from app clients, pick origami match
  const handleReverseMode = async () => {
    setStatus('loading')
    setError(null)
    setProgress('Loading client lists...')

    try {
      const res = await fetch('/api/origami/list-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Use unmapped origami for the picker, but keep all for display
      const allOrig = data.allOrigamiClients || data.origamiClients || []
      const unmappedOrig = data.origamiClients || []
      setOrigamiClients(unmappedOrig)
      setAppClients(data.appClients || [])

      // Pre-populate reverse selections with existing mappings
      const initial = {}
      const existingMappings = data.existingMappings || {}
      for (const [appId, origIds] of Object.entries(existingMappings)) {
        const picks = origIds.map(oid => {
          const orig = allOrig.find(o => o.client_id === oid)
          return {
            origami_client_id: oid,
            origami_name: orig?.name || `ID: ${oid}`,
            origami_ref: orig?.reference_number || '',
            existing: true, // flag so we know it's already saved
          }
        })
        initial[appId] = { picks, confirmed: false } // not confirmed = already saved, won't re-save
      }
      setReverseSelections(initial)
      setStatus('reverse')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  // Reverse pick: add origami client and auto-save immediately
  const handleReversePick = async (appClientId, origClient) => {
    const existing = reverseSelections[appClientId]?.picks || []
    if (existing.some(p => p.origami_client_id === origClient.client_id)) return

    const newPick = {
      origami_client_id: origClient.client_id,
      origami_name: origClient.name,
      origami_ref: origClient.reference_number,
      saving: true,
    }

    // Optimistic UI update
    setReverseSelections(prev => ({
      ...prev,
      [appClientId]: {
        picks: [...(prev[appClientId]?.picks || []), newPick],
        confirmed: true,
      },
    }))
    setReverseSearch('')

    // Save to DB
    try {
      const res = await fetch('/api/origami/confirm-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: [{
            origami_client_id: origClient.client_id,
            app_client_id: appClientId,
            confidence_score: 100,
            match_reasoning: 'Manually matched by user',
          }],
          organizationId: profile.organization_id,
          userId: user.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Mark as saved
      setReverseSelections(prev => {
        const picks = (prev[appClientId]?.picks || []).map(p =>
          p.origami_client_id === origClient.client_id ? { ...p, existing: true, saving: false } : p
        )
        return { ...prev, [appClientId]: { picks, confirmed: true } }
      })

      // Remove from unmapped origami list
      setOrigamiClients(prev => prev.filter(o => o.client_id !== origClient.client_id))
    } catch (err) {
      setError(`Failed to save: ${err.message}`)
      // Remove the failed pick
      setReverseSelections(prev => {
        const picks = (prev[appClientId]?.picks || []).filter(p => p.origami_client_id !== origClient.client_id)
        if (picks.length === 0) {
          const next = { ...prev }
          delete next[appClientId]
          return next
        }
        return { ...prev, [appClientId]: { picks, confirmed: true } }
      })
    }
  }

  // Remove a match and delete from DB if it was saved
  const handleReverseRemove = async (appClientId, origamiClientId) => {
    const pick = reverseSelections[appClientId]?.picks?.find(p => p.origami_client_id === origamiClientId)

    // Optimistic UI update
    setReverseSelections(prev => {
      const existing = prev[appClientId]?.picks || []
      const updated = existing.filter(p => p.origami_client_id !== origamiClientId)
      if (updated.length === 0) {
        const next = { ...prev }
        delete next[appClientId]
        return next
      }
      return { ...prev, [appClientId]: { picks: updated, confirmed: true } }
    })

    // Delete from DB if it was a saved match
    if (pick?.existing) {
      try {
        const res = await fetch('/api/origami/delete-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origamiClientId: origamiClientId,
            organizationId: profile.organization_id,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        // Add back to unmapped origami list
        // We need the full origami client object — find from the pick data
        setOrigamiClients(prev => {
          if (prev.some(o => o.client_id === origamiClientId)) return prev
          return [...prev, { client_id: origamiClientId, name: pick.origami_name, reference_number: pick.origami_ref }]
        })
      } catch (err) {
        setError(`Failed to delete: ${err.message}`)
        // Re-add the pick on failure
        setReverseSelections(prev => ({
          ...prev,
          [appClientId]: {
            picks: [...(prev[appClientId]?.picks || []), pick],
            confirmed: true,
          },
        }))
      }
    }
  }

  // ==================== LOCATION MATCHING HANDLERS ====================

  // Load matched app clients for the location picker
  const handleLocationMode = async () => {
    setLocStatus('loading')
    setLocError(null)

    try {
      // Get list of app clients that have origami mappings
      const res = await fetch('/api/origami/list-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const existingMappings = data.existingMappings || {}
      const mappedAppClientIds = Object.keys(existingMappings)
      const mappedClients = (data.appClients || []).filter(c => mappedAppClientIds.includes(c.id))

      if (mappedClients.length === 0) {
        setLocError('No clients have been matched yet. Match clients first.')
        setLocStatus('idle')
        return
      }

      setLocAppClients(mappedClients)
      setLocStatus('idle')
    } catch (err) {
      setLocError(err.message)
      setLocStatus('idle')
    }
  }

  // Load locations for a specific matched client
  const handleSelectClientForLocations = async (appClientId) => {
    setSelectedAppClientId(appClientId)
    setLocStatus('loading')
    setLocError(null)

    try {
      const res = await fetch('/api/origami/list-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id, appClientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setOrigamiLocations(data.origamiLocations || [])
      setAppLocations(data.appLocations || [])

      // Pre-populate existing mappings
      const initial = {}
      const existingMappings = data.existingMappings || {}
      const allOrig = data.allOrigamiLocations || data.origamiLocations || []
      for (const [appLocId, origIds] of Object.entries(existingMappings)) {
        const picks = origIds.map(oid => {
          const orig = allOrig.find(o => o.location_id === oid)
          return {
            origami_location_id: oid,
            origami_desc: orig?.description || `ID: ${oid}`,
            origami_code: orig?.display_code || '',
            origami_city: orig?.city || '',
            origami_state: orig?.state_id != null ? String(orig.state_id) : '',
            existing: true,
          }
        })
        initial[appLocId] = { picks, confirmed: false }
      }
      setLocReverseSelections(initial)
      setLocStatus('reverse')
    } catch (err) {
      setLocError(err.message)
      setLocStatus('idle')
    }
  }

  // Run AI matching for locations on a specific client
  const handleAILocationMatch = async (appClientId) => {
    setSelectedAppClientId(appClientId)
    setLocStatus('loading')
    setLocError(null)

    try {
      const res = await fetch('/api/origami/match-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: profile.organization_id, appClientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.message) {
        setLocError(data.message)
        setLocStatus('idle')
        return
      }

      setLocMatches(data.matches || [])
      setOrigamiLocations(data.origamiLocations || [])
      setAppLocations(data.appLocations || [])

      // Pre-populate selections from AI matches
      const initial = {}
      ;(data.matches || []).forEach(m => {
        initial[m.origami_location_id] = {
          app_location_id: m.app_location_id,
          confidence: m.confidence,
          reasoning: m.reasoning,
          confirmed: false,
        }
      })
      setLocSelections(initial)
      setLocStatus('review')
    } catch (err) {
      setLocError(err.message)
      setLocStatus('idle')
    }
  }

  // Toggle confirm for a location match
  const toggleLocConfirm = (origamiLocationId) => {
    setLocSelections(prev => ({
      ...prev,
      [origamiLocationId]: {
        ...prev[origamiLocationId],
        confirmed: !prev[origamiLocationId]?.confirmed,
      },
    }))
  }

  // Confirm all high-confidence location matches
  const confirmAllHighLoc = () => {
    setLocSelections(prev => {
      const next = { ...prev }
      Object.entries(next).forEach(([id, sel]) => {
        if (sel.confidence >= 90 && sel.app_location_id) {
          next[id] = { ...sel, confirmed: true }
        }
      })
      return next
    })
  }

  // Manual location pick in review mode
  const handleLocManualPick = (origamiLocationId, appLocation) => {
    setLocSelections(prev => ({
      ...prev,
      [origamiLocationId]: {
        app_location_id: appLocation.id,
        confidence: 100,
        reasoning: 'Manually selected by user',
        confirmed: true,
      },
    }))
    setLocManualPickId(null)
    setLocManualSearch('')
  }

  // Save confirmed location matches
  const handleSaveLocMatches = async () => {
    const confirmed = Object.entries(locSelections)
      .filter(([_, v]) => v.confirmed && v.app_location_id)
      .map(([origId, v]) => ({
        origami_location_id: parseInt(origId),
        app_location_id: v.app_location_id,
        confidence_score: v.confidence,
        match_reasoning: v.reasoning,
      }))

    if (confirmed.length === 0) {
      setLocError('No matches selected. Check at least one match to confirm.')
      return
    }

    setLocStatus('loading')
    setLocError(null)

    try {
      // Save in batches to avoid timeout on large sets
      const BATCH = 50
      let savedCount = 0
      for (let i = 0; i < confirmed.length; i += BATCH) {
        const batch = confirmed.slice(i, i + BATCH)
        const res = await fetch('/api/origami/confirm-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matches: batch,
            organizationId: profile.organization_id,
            userId: user.id,
            entityType: 'location',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || JSON.stringify(data))
        savedCount += data.count
      }

      setLocMatches([])
      setLocSelections({})
      setLocStatus('idle')
      setSelectedAppClientId(null)
      setLocError(null)
      alert(`${savedCount} location matches saved!`)
    } catch (err) {
      setLocError(err.message)
      setLocStatus('review')
    }
  }

  // Pick an origami location for an app location
  const handleLocPick = async (appLocationId, origLocation) => {
    const existing = locReverseSelections[appLocationId]?.picks || []
    if (existing.some(p => p.origami_location_id === origLocation.location_id)) return

    const newPick = {
      origami_location_id: origLocation.location_id,
      origami_desc: origLocation.description,
      origami_code: origLocation.display_code,
      origami_city: origLocation.city,
      origami_state: origLocation.state_id != null ? String(origLocation.state_id) : '',
      saving: true,
    }

    // Optimistic UI
    setLocReverseSelections(prev => ({
      ...prev,
      [appLocationId]: {
        picks: [...(prev[appLocationId]?.picks || []), newPick],
        confirmed: true,
      },
    }))
    setLocSearch('')

    // Save to DB
    try {
      const res = await fetch('/api/origami/confirm-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: [{
            origami_location_id: origLocation.location_id,
            app_location_id: appLocationId,
            confidence_score: 100,
            match_reasoning: 'Manually matched by user',
          }],
          organizationId: profile.organization_id,
          userId: user.id,
          entityType: 'location',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Mark as saved
      setLocReverseSelections(prev => {
        const picks = (prev[appLocationId]?.picks || []).map(p =>
          p.origami_location_id === origLocation.location_id ? { ...p, existing: true, saving: false } : p
        )
        return { ...prev, [appLocationId]: { picks, confirmed: true } }
      })
      // Remove from unmapped list
      setOrigamiLocations(prev => prev.filter(o => o.location_id !== origLocation.location_id))
    } catch (err) {
      setLocError(`Failed to save: ${err.message}`)
      setLocReverseSelections(prev => {
        const picks = (prev[appLocationId]?.picks || []).filter(p => p.origami_location_id !== origLocation.location_id)
        if (picks.length === 0) {
          const next = { ...prev }
          delete next[appLocationId]
          return next
        }
        return { ...prev, [appLocationId]: { picks, confirmed: true } }
      })
    }
  }

  // Remove a location match
  const handleLocRemove = async (appLocationId, origamiLocationId) => {
    const pick = locReverseSelections[appLocationId]?.picks?.find(p => p.origami_location_id === origamiLocationId)

    // Optimistic UI
    setLocReverseSelections(prev => {
      const existing = prev[appLocationId]?.picks || []
      const updated = existing.filter(p => p.origami_location_id !== origamiLocationId)
      if (updated.length === 0) {
        const next = { ...prev }
        delete next[appLocationId]
        return next
      }
      return { ...prev, [appLocationId]: { picks: updated, confirmed: true } }
    })

    if (pick?.existing) {
      try {
        const res = await fetch('/api/origami/delete-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origamiLocationId: origamiLocationId,
            organizationId: profile.organization_id,
            entityType: 'location',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setOrigamiLocations(prev => {
          if (prev.some(o => o.location_id === origamiLocationId)) return prev
          return [...prev, { location_id: origamiLocationId, description: pick.origami_desc, display_code: pick.origami_code, city: pick.origami_city, state_id: pick.origami_state }]
        })
      } catch (err) {
        setLocError(`Failed to delete: ${err.message}`)
        setLocReverseSelections(prev => ({
          ...prev,
          [appLocationId]: {
            picks: [...(prev[appLocationId]?.picks || []), pick],
            confirmed: true,
          },
        }))
      }
    }
  }

  const locTotalCount = Object.values(locReverseSelections).reduce((sum, s) => sum + (s.picks?.length || 0), 0)

  // Save confirmed matches
  const handleSaveMatches = async () => {
    const confirmed = Object.entries(selections)
      .filter(([_, v]) => v.confirmed && v.app_client_id)
      .map(([origamiId, v]) => ({
        origami_client_id: parseInt(origamiId),
        app_client_id: v.app_client_id,
        confidence_score: v.confidence,
        match_reasoning: v.reasoning,
      }))

    if (confirmed.length === 0) {
      setError('No matches selected. Check at least one match to confirm.')
      return
    }

    setStatus('confirming')
    setError(null)

    try {
      const res = await fetch('/api/origami/confirm-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: confirmed,
          organizationId: profile.organization_id,
          userId: user.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult({ success: true, count: data.count })
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('review')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Origami Matching</h1>
          <p className="text-gray-500 mt-1">
            Match Origami data to your existing database
          </p>
        </div>

        {/* Top-level tab switcher */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setPageMode('clients')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              pageMode === 'clients'
                ? 'border-[#006B7D] text-[#006B7D]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => { setPageMode('locations'); if (locAppClients.length === 0 && locStatus === 'idle') handleLocationMode() }}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              pageMode === 'locations'
                ? 'border-[#006B7D] text-[#006B7D]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Locations
          </button>
        </div>

        {/* Error Banner */}
        {(pageMode === 'clients' ? error : locError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {pageMode === 'clients' ? error : locError}
            <button onClick={() => pageMode === 'clients' ? setError(null) : setLocError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ==================== CLIENTS TAB ==================== */}
        {pageMode === 'clients' && <>

        {/* Idle State */}
        {status === 'idle' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#006B7D]/10 to-[#008BA3]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#006B7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Origami Client Matching</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Match Origami clients to your existing client database using AI or manual selection.
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRunMatching}
                  className="px-8 py-3 bg-gradient-to-r from-[#006B7D] to-[#008BA3] text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                >
                  Run AI Matching
                </button>
                <button
                  onClick={handleReverseMode}
                  className="px-8 py-3 border-2 border-[#006B7D] text-[#006B7D] rounded-xl font-medium hover:bg-[#006B7D]/5 hover:scale-[1.02] transition-all duration-200"
                >
                  Match by App Client
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                <strong>AI Matching</strong> uses Claude to auto-match. <strong>Match by App Client</strong> lets you pick origami matches for each of your clients.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D] mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Matching in Progress</h2>
            <p className="text-gray-500">{progress}</p>
            <p className="text-xs text-gray-400 mt-4">This may take 30-60 seconds depending on the number of clients</p>
          </div>
        )}

        {/* Review State */}
        {status === 'review' && (
          <div>
            {/* Stats Bar */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="text-sm font-semibold text-gray-900">{matches.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                <span className="text-sm text-green-600">High Confidence (90+):</span>
                <span className="text-sm font-semibold text-green-700">{highConfCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200">
                <span className="text-sm text-red-600">No Match:</span>
                <span className="text-sm font-semibold text-red-700">{noMatchCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#006B7D]/5 rounded-xl border border-[#006B7D]/20">
                <span className="text-sm text-[#006B7D]">Selected:</span>
                <span className="text-sm font-semibold text-[#006B7D]">{confirmedCount}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Search origami clients..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#006B7D] focus:border-transparent"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUnmatched}
                  onChange={e => setShowOnlyUnmatched(e.target.checked)}
                  className="rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D]"
                />
                Show only unmatched
              </label>
              <div className="flex-1" />
              <button
                onClick={confirmAllHigh}
                className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
              >
                Select All 90+
              </button>
              <button
                onClick={handleSaveMatches}
                disabled={confirmedCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-[#006B7D] to-[#008BA3] text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm {confirmedCount} Match{confirmedCount !== 1 ? 'es' : ''}
              </button>
            </div>

            {/* Match Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">
                        <input
                          type="checkbox"
                          onChange={e => {
                            const checked = e.target.checked
                            setSelections(prev => {
                              const next = { ...prev }
                              filteredMatches.forEach(m => {
                                if (next[m.origami_client_id]?.app_client_id) {
                                  next[m.origami_client_id] = { ...next[m.origami_client_id], confirmed: checked }
                                }
                              })
                              return next
                            })
                          }}
                          className="rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Origami Client</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Ref #</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">City / State</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Best Match (App)</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">AMS Code</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Confidence</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Reasoning</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMatches.map(m => {
                      const origClient = origamiClients.find(o => o.client_id === m.origami_client_id)
                      const sel = selections[m.origami_client_id] || {}
                      const appMatch = appClients.find(c => c.id === sel.app_client_id)
                      const level = getConfidenceLevel(sel.confidence || 0)

                      return (
                        <tr
                          key={m.origami_client_id}
                          className={`hover:bg-gray-50 transition-colors ${sel.confirmed ? 'bg-green-50/50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!sel.confirmed}
                              onChange={() => toggleConfirm(m.origami_client_id)}
                              disabled={!sel.app_client_id}
                              className="rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D] disabled:opacity-30"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{origClient?.name || `ID: ${m.origami_client_id}`}</div>
                            {origClient?.street1 && (
                              <div className="text-xs text-gray-400 mt-0.5">{origClient.street1}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                            {origClient?.reference_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {[origClient?.city, origClient?.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {appMatch ? (
                              <div>
                                <div className="font-medium text-gray-900">{appMatch.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {[appMatch.city, appMatch.state].filter(Boolean).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No match found</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                            {appMatch?.ams_code || appMatch?.client_number || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_STYLES[level]}`}>
                              {sel.confidence || 0}% — {getConfidenceLabel(sel.confidence || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={sel.reasoning}>
                            {sel.reasoning || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {manualPickId === m.origami_client_id ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search clients..."
                                  value={manualSearch}
                                  onChange={e => setManualSearch(e.target.value)}
                                  autoFocus
                                  className="w-48 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#006B7D]"
                                />
                                <div className="absolute z-20 mt-1 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
                                  {filteredAppClients.map(c => (
                                    <button
                                      key={c.id}
                                      onClick={() => handleManualPick(m.origami_client_id, c)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900">{c.name}</span>
                                        {(c.ams_code || c.client_number) && (
                                          <span className="text-gray-400 font-mono flex-shrink-0">{c.ams_code || c.client_number}</span>
                                        )}
                                      </div>
                                      <div className="text-gray-400">{[c.city, c.state].filter(Boolean).join(', ')}</div>
                                    </button>
                                  ))}
                                  {filteredAppClients.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-400">No clients found</div>
                                  )}
                                  <button
                                    onClick={() => { setManualPickId(null); setManualSearch('') }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setManualPickId(m.origami_client_id)}
                                className="text-xs text-[#006B7D] hover:text-[#008BA3] font-medium"
                              >
                                {sel.app_client_id ? 'Change' : 'Pick Client'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredMatches.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No matches found{searchFilter ? ` for "${searchFilter}"` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reverse Mode: App Clients → pick Origami match */}
        {status === 'reverse' && (
          <div>
            {/* Stats */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200">
                <span className="text-sm text-gray-500">App Clients:</span>
                <span className="text-sm font-semibold text-gray-900">{appClients.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-sm text-purple-600">Origami Available:</span>
                <span className="text-sm font-semibold text-purple-700">{origamiClients.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                <span className="text-sm text-green-600">Matched:</span>
                <span className="text-sm font-semibold text-green-700">{reverseTotalCount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Search your clients..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#006B7D] focus:border-transparent"
              />
              <div className="flex-1" />
              <p className="text-xs text-gray-400">Changes save automatically</p>
              <button
                onClick={() => { setStatus('idle'); setSearchFilter(''); setReverseSelections({}); }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Your Client</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">AMS Code</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">City / State</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Origami Matches</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 w-56">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppForReverse.map(app => {
                      const rev = reverseSelections[app.id]
                      const picks = rev?.picks || []

                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-gray-50 transition-colors ${picks.length > 0 ? 'bg-green-50/50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{app.name}</div>
                            {app.street_address && (
                              <div className="text-xs text-gray-400 mt-0.5">{app.street_address}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                            {app.ams_code || app.client_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {[app.city, app.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {picks.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {picks.map(p => {
                                  const orig = origamiClients.find(o => o.client_id === p.origami_client_id)
                                  return (
                                    <div key={p.origami_client_id} className="flex items-center gap-2 group">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium text-gray-900 text-xs truncate">{p.origami_name}</span>
                                          {p.saving && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">saving...</span>}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                          {p.origami_ref && <span className="font-mono">{p.origami_ref}</span>}
                                          {p.origami_ref && orig?.city && ' · '}
                                          {[orig?.city, orig?.state].filter(Boolean).join(', ')}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleReverseRemove(app.id, p.origami_client_id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                                        title="Remove match"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Not matched</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {reversePickId === app.id ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search origami clients..."
                                  value={reverseSearch}
                                  onChange={e => setReverseSearch(e.target.value)}
                                  autoFocus
                                  className="w-48 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-[#006B7D]"
                                />
                                <div className="absolute z-20 mt-1 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
                                  <button
                                    onClick={() => { setReversePickId(null); setReverseSearch(''); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 font-medium flex items-center justify-between sticky top-0 bg-white border-b border-gray-200 z-10"
                                  >
                                    Done
                                    <span className="text-gray-400 text-sm">✕</span>
                                  </button>
                                  {filteredOrigamiClients.map(o => {
                                    const alreadyPicked = picks.some(p => p.origami_client_id === o.client_id)
                                    return (
                                      <button
                                        key={o.client_id}
                                        onClick={() => !alreadyPicked && handleReversePick(app.id, o)}
                                        className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 last:border-0 ${alreadyPicked ? 'bg-green-50 opacity-60 cursor-default' : 'hover:bg-gray-50'}`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-gray-900">{o.name}</span>
                                          <span className="flex items-center gap-2">
                                            {o.reference_number && (
                                              <span className="text-gray-400 font-mono flex-shrink-0">{o.reference_number}</span>
                                            )}
                                            {alreadyPicked && <span className="text-green-600 text-[10px]">added</span>}
                                          </span>
                                        </div>
                                        <div className="text-gray-400">{[o.city, o.state].filter(Boolean).join(', ')}</div>
                                      </button>
                                    )
                                  })}
                                  {filteredOrigamiClients.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-400">No origami clients found</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReversePickId(app.id)}
                                className="text-xs text-[#006B7D] hover:text-[#008BA3] font-medium"
                              >
                                {picks.length > 0 ? `+ Add More` : 'Pick Origami Client'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAppForReverse.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No clients found{searchFilter ? ` for "${searchFilter}"` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirming State */}
        {status === 'confirming' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D] mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Saving Matches</h2>
            <p className="text-gray-500">Saving {confirmedCount} confirmed matches...</p>
          </div>
        )}

        {/* Done State */}
        {status === 'done' && result && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {result.message || `${result.count} Matches Confirmed`}
            </h2>
            <p className="text-gray-500 mb-8">
              {result.count
                ? 'Client mappings have been saved. You can now import locations, claims, and policies for these clients.'
                : 'All origami clients have already been mapped.'
              }
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setStatus('idle')
                  setMatches([])
                  setSelections({})
                  setReverseSelections({})
                  setResult(null)
                  setError(null)
                  setSearchFilter('')
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#006B7D] to-[#008BA3] text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Match More Clients
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        </>}

        {/* ==================== LOCATIONS TAB ==================== */}
        {pageMode === 'locations' && <>

          {/* Loading */}
          {locStatus === 'loading' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D] mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
            </div>
          )}

          {/* Client Picker (idle — no client selected yet) */}
          {locStatus === 'idle' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {locAppClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No matched clients found. Match clients first on the Clients tab.</p>
                  <button
                    onClick={() => setPageMode('clients')}
                    className="mt-4 px-6 py-2 bg-[#006B7D] text-white rounded-lg text-sm font-medium hover:bg-[#008BA3]"
                  >
                    Go to Clients
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Select a Client</h2>
                  <p className="text-sm text-gray-500 mb-6">Choose a matched client and matching mode for their locations.</p>
                  <div className="grid gap-3 max-w-2xl">
                    {locAppClients.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {[c.city, c.state].filter(Boolean).join(', ')}
                            {c.ams_code && <span className="ml-2 font-mono">{c.ams_code}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAILocationMatch(c.id)}
                            className="px-4 py-2 bg-gradient-to-r from-[#006B7D] to-[#008BA3] text-white rounded-lg text-xs font-medium hover:shadow-md transition-all"
                          >
                            AI Match
                          </button>
                          <button
                            onClick={() => handleSelectClientForLocations(c.id)}
                            className="px-4 py-2 border border-[#006B7D] text-[#006B7D] rounded-lg text-xs font-medium hover:bg-[#006B7D]/5 transition-all"
                          >
                            Manual Match
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Location AI Review */}
          {locStatus === 'review' && (
            <div className="bg-white rounded-2xl border border-gray-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setLocStatus('idle'); setSelectedAppClientId(null); setLocMatches([]); setLocSelections({}); setOrigamiLocations([]); setAppLocations([]) }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Location Match Results</h2>
                    <p className="text-xs text-gray-500">
                      Client: {locAppClients.find(c => c.id === selectedAppClientId)?.name}
                      {' — '}{locMatches.length} matches found
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{locConfirmedCount} selected</span>
                  {locHighConfCount > 0 && (
                    <button
                      onClick={confirmAllHighLoc}
                      className="px-3 py-1.5 text-xs border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
                    >
                      Select All High ({locHighConfCount})
                    </button>
                  )}
                  <button
                    onClick={handleSaveLocMatches}
                    disabled={locConfirmedCount === 0}
                    className="px-4 py-2 bg-gradient-to-r from-[#006B7D] to-[#008BA3] text-white rounded-lg text-sm font-medium hover:shadow-md disabled:opacity-50"
                  >
                    Save {locConfirmedCount} Matches
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={locSearchFilter}
                  onChange={e => setLocSearchFilter(e.target.value)}
                  className="w-64 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#006B7D]"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-10">
                        <input
                          type="checkbox"
                          checked={locConfirmedCount > 0 && locConfirmedCount === filteredLocMatches.filter(m => m.app_location_id).length}
                          onChange={(e) => {
                            setLocSelections(prev => {
                              const next = { ...prev }
                              filteredLocMatches.forEach(m => {
                                if (m.app_location_id && next[m.origami_location_id]) {
                                  next[m.origami_location_id] = { ...next[m.origami_location_id], confirmed: e.target.checked }
                                }
                              })
                              return next
                            })
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Origami Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Origami Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Best Match (App)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Confidence</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reasoning</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLocMatches.map(m => {
                      const sel = locSelections[m.origami_location_id] || {}
                      const origLoc = origamiLocations.find(o => o.location_id === m.origami_location_id)
                      const appLoc = appLocations.find(a => a.id === sel.app_location_id)
                      const level = getConfidenceLevel(sel.confidence || 0)

                      return (
                        <tr key={m.origami_location_id} className={`hover:bg-gray-50/50 ${sel.confirmed ? 'bg-green-50/30' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            {sel.app_location_id ? (
                              <input
                                type="checkbox"
                                checked={sel.confirmed || false}
                                onChange={() => toggleLocConfirm(m.origami_location_id)}
                                className="rounded border-gray-300"
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{origLoc?.description || origLoc?.display_code || `ID: ${m.origami_location_id}`}</div>
                            {origLoc?.display_code && origLoc?.description && (
                              <div className="text-xs text-gray-400 font-mono mt-0.5">{origLoc.display_code}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {origLoc?.street1 && <div>{origLoc.street1}</div>}
                            {[origLoc?.city, origLoc?.state_id != null ? String(origLoc.state_id) : '', origLoc?.postal_code].filter(Boolean).join(', ')}
                          </td>
                          <td className="px-4 py-3">
                            {appLoc ? (
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{appLoc.location_name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {appLoc.street_address && <span>{appLoc.street_address}, </span>}
                                  {[appLoc.city, appLoc.state].filter(Boolean).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-sm">No match found</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_STYLES[level]}`}>
                              {sel.confidence || 0}% — {getConfidenceLabel(sel.confidence || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={sel.reasoning}>
                            {sel.reasoning || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {locManualPickId === m.origami_location_id ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search locations..."
                                  value={locManualSearch}
                                  onChange={e => setLocManualSearch(e.target.value)}
                                  autoFocus
                                  className="w-48 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-[#006B7D]"
                                />
                                <div className="absolute z-20 mt-1 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
                                  <button
                                    onClick={() => { setLocManualPickId(null); setLocManualSearch(''); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 font-medium flex items-center justify-between sticky top-0 bg-white border-b border-gray-200 z-10"
                                  >
                                    Done
                                    <span className="text-gray-400 text-sm">✕</span>
                                  </button>
                                  {filteredAppLocationsForPicker.map(l => (
                                    <button
                                      key={l.id}
                                      onClick={() => handleLocManualPick(m.origami_location_id, l)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                    >
                                      <div className="font-medium text-gray-900">{l.location_name}</div>
                                      <div className="text-gray-400">
                                        {l.street_address && <span>{l.street_address}, </span>}
                                        {[l.city, l.state].filter(Boolean).join(', ')}
                                      </div>
                                    </button>
                                  ))}
                                  {filteredAppLocationsForPicker.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-400">No locations found</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setLocManualPickId(m.origami_location_id)}
                                className="text-xs text-[#006B7D] hover:text-[#008BA3] font-medium"
                              >
                                {sel.app_location_id ? 'Change' : 'Pick Location'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredLocMatches.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No location matches found{locSearchFilter ? ` matching "${locSearchFilter}"` : ''}
                </div>
              )}
            </div>
          )}

          {/* Location Reverse Matching */}
          {locStatus === 'reverse' && (
            <div className="bg-white rounded-2xl border border-gray-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setLocStatus('idle'); setSelectedAppClientId(null); setLocReverseSelections({}); setOrigamiLocations([]); setAppLocations([]) }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Match Locations</h2>
                      <p className="text-xs text-gray-500">
                        Client: {locAppClients.find(c => c.id === selectedAppClientId)?.name}
                        {' — '}{appLocations.length} app locations, {origamiLocations.length} unmapped origami locations
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {locTotalCount} matched — Changes save automatically
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={locSearchFilter}
                  onChange={e => setLocSearchFilter(e.target.value)}
                  className="w-64 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#006B7D]"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">App Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Matched Origami Locations</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppLocations.map(loc => {
                      const picks = locReverseSelections[loc.id]?.picks || []
                      return (
                        <tr key={loc.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{loc.location_name || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-500">
                              {loc.street_address && <div>{loc.street_address}</div>}
                              {[loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {picks.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {picks.map(p => (
                                  <div
                                    key={p.origami_location_id}
                                    className="group inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs"
                                  >
                                    <span className="text-green-800 font-medium">{p.origami_desc || p.origami_code || `ID: ${p.origami_location_id}`}</span>
                                    {p.origami_city && <span className="text-green-600">({p.origami_city})</span>}
                                    {p.saving ? (
                                      <span className="text-green-400 text-[10px]">saving...</span>
                                    ) : (
                                      <button
                                        onClick={() => handleLocRemove(loc.id, p.origami_location_id)}
                                        className="text-green-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Not matched</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {locPickId === loc.id ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search origami locations..."
                                  value={locSearch}
                                  onChange={e => setLocSearch(e.target.value)}
                                  autoFocus
                                  className="w-48 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-[#006B7D]"
                                />
                                <div className="absolute z-20 mt-1 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
                                  <button
                                    onClick={() => { setLocPickId(null); setLocSearch(''); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 font-medium flex items-center justify-between sticky top-0 bg-white border-b border-gray-200 z-10"
                                  >
                                    Done
                                    <span className="text-gray-400 text-sm">✕</span>
                                  </button>
                                  {filteredOrigamiLocations.map(o => {
                                    const alreadyPicked = picks.some(p => p.origami_location_id === o.location_id)
                                    return (
                                      <button
                                        key={o.location_id}
                                        onClick={() => !alreadyPicked && handleLocPick(loc.id, o)}
                                        className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 last:border-0 ${alreadyPicked ? 'bg-green-50 opacity-60 cursor-default' : 'hover:bg-gray-50'}`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-gray-900">{o.description || o.display_code || `Location ${o.location_id}`}</span>
                                          <span className="flex items-center gap-2">
                                            {o.display_code && (
                                              <span className="text-gray-400 font-mono flex-shrink-0">{o.display_code}</span>
                                            )}
                                            {alreadyPicked && <span className="text-green-600 text-[10px]">added</span>}
                                          </span>
                                        </div>
                                        <div className="text-gray-400">
                                          {[o.street1, o.city, o.state_id != null ? String(o.state_id) : ''].filter(Boolean).join(', ')}
                                        </div>
                                      </button>
                                    )
                                  })}
                                  {filteredOrigamiLocations.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-400">No origami locations found</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setLocPickId(loc.id)}
                                className="text-xs text-[#006B7D] hover:text-[#008BA3] font-medium"
                              >
                                {picks.length > 0 ? '+ Add More' : 'Pick Origami Location'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAppLocations.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {appLocations.length === 0
                    ? 'No app locations found for this client.'
                    : `No locations found matching "${locSearchFilter}"`
                  }
                </div>
              )}
            </div>
          )}

        </>}

      </div>
    </div>
  )
}
