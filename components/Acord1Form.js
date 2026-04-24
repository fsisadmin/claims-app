'use client'

import { useState, useEffect, useRef } from 'react'

function Field({ label, value, onChange, type = 'text', rows }) {
  const common = {
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    className: 'w-full border-0 bg-blue-50 px-1.5 py-1 text-sm text-gray-900 focus:outline-none focus:bg-yellow-50 rounded-sm print:bg-transparent print:focus:bg-transparent',
  }
  return (
    <div className="flex flex-col">
      {label && <label className="text-[9px] font-bold uppercase text-[#005570] leading-tight tracking-wide mb-0.5">{label}</label>}
      {type === 'textarea' ? (
        <textarea {...common} rows={rows || 2} />
      ) : (
        <input type="text" {...common} />
      )}
    </div>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1 text-[9px] cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3 h-3 accent-black"
      />
      <span className="uppercase font-semibold text-gray-800">{label}</span>
    </label>
  )
}

export default function Acord1Form({ claimId, claimNumber, onClose }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({})
  const [hasSavedData, setHasSavedData] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/origami/acord-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setData(json.formData || {})
        setHasSavedData(!!json.hasSavedData)
      } catch (err) {
        alert('Failed to load: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [claimId])

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/origami/acord-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'save', formData: data }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setHasSavedData(true)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    await save()
    try {
      const res = await fetch('/api/origami/acord-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: 'acord_1', formData: data }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'PDF generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      // Open in new tab for print
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      alert('Print failed: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="acord-print-root fixed inset-0 bg-black/50 z-50 overflow-auto print:bg-white print:static print:overflow-visible">
      {/* Toolbar (hidden on print) */}
      <div className="sticky top-0 bg-[#006B7D] text-white px-6 py-3 flex items-center justify-between shadow-lg print:hidden z-10">
        <div>
          <h2 className="text-lg font-semibold">ACORD 1 — Property Loss Notice</h2>
          <p className="text-xs opacity-80">Claim {claimNumber} · {hasSavedData ? 'Edits saved' : 'Using prefilled data'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-white text-[#006B7D] hover:bg-gray-100 rounded-lg text-sm font-semibold">
            Save &amp; Print
          </button>
          <button onClick={onClose} className="px-3 py-2 text-white/80 hover:text-white">✕</button>
        </div>
      </div>

      {/* Form */}
      <div className="acord-sheet max-w-[8.5in] mx-auto my-6 bg-white shadow-xl print:shadow-none print:my-0 print:max-w-none">
        <div ref={printRef} className="p-6 print:p-4" id="acord-form-print">
          {/* Top header row */}
          <div className="flex items-start gap-4 mb-2">
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#000] tracking-wider">ACORD</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-xl font-black text-gray-900 tracking-wide">PROPERTY LOSS NOTICE</div>
            </div>
            <div className="flex-1 border border-black">
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide px-1 border-b border-black bg-gray-100">Date (MM/DD/YYYY)</div>
              <div className="px-1">
                <Field value={data.form_date} onChange={v => update('form_date', v)} />
              </div>
            </div>
          </div>

          {/* Agency + Policy block */}
          <div className="grid grid-cols-2 gap-0 border-2 border-black">
            {/* Agency */}
            <div className="border-r border-black">
              <div className="border-b border-black px-1 bg-gray-100">
                <div className="text-[9px] font-bold uppercase">Agency</div>
                <Field type="textarea" rows={3} value={data.agency_name} onChange={v => update('agency_name', v)} />
              </div>
              <div className="px-1 border-b border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Contact Name</div>
                <Field value={data.agency_contact} onChange={v => update('agency_contact', v)} />
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Phone (A/C, No, Ext)</div>
                  <Field value={data.agency_phone} onChange={v => update('agency_phone', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Fax (A/C, No)</div>
                  <Field value={data.agency_fax} onChange={v => update('agency_fax', v)} />
                </div>
              </div>
              <div className="px-1 border-b border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Email Address</div>
                <Field value={data.agency_email} onChange={v => update('agency_email', v)} />
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Code</div>
                  <Field value={data.agency_code} onChange={v => update('agency_code', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Subcode</div>
                  <Field value={data.agency_subcode} onChange={v => update('agency_subcode', v)} />
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Agency Customer ID</div>
                <Field value={data.agency_customer_id} onChange={v => update('agency_customer_id', v)} />
              </div>
            </div>

            {/* Policy */}
            <div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Insured Location Code</div>
                  <Field value={data.insured_location_code} onChange={v => update('insured_location_code', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Date of Loss</div>
                  <Field value={data.date_of_loss} onChange={v => update('date_of_loss', v)} />
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1">
                      <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Time</div>
                      <Field value={data.time_of_loss} onChange={v => update('time_of_loss', v)} />
                    </div>
                    <select value={data.time_of_loss_ampm || ''} onChange={e => update('time_of_loss_ampm', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5 mt-3">
                      <option value="">—</option><option>AM</option><option>PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Property/Home Policy */}
              <div className="bg-gray-200 text-center text-[10px] font-bold uppercase border-b border-gray-300 py-1 text-[#006B7D]">Property / Home Policy</div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Carrier</div>
                  <Field value={data.property_carrier} onChange={v => update('property_carrier', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">NAIC Code</div>
                  <Field value={data.property_naic} onChange={v => update('property_naic', v)} />
                </div>
              </div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Policy Number</div>
                  <Field value={data.property_policy_number} onChange={v => update('property_policy_number', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Line of Business</div>
                  <Field value={data.property_line_of_business} onChange={v => update('property_line_of_business', v)} />
                </div>
              </div>

              {/* Flood Policy */}
              <div className="bg-gray-200 text-center text-[10px] font-bold uppercase border-b border-gray-300 py-1 text-[#006B7D]">Flood Policy</div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Carrier</div>
                  <Field value={data.flood_carrier} onChange={v => update('flood_carrier', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">NAIC Code</div>
                  <Field value={data.flood_naic} onChange={v => update('flood_naic', v)} />
                </div>
              </div>
              <div className="px-1 border-b border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Policy Number</div>
                <Field value={data.flood_policy_number} onChange={v => update('flood_policy_number', v)} />
              </div>

              {/* Wind Policy */}
              <div className="bg-gray-200 text-center text-[10px] font-bold uppercase border-b border-gray-300 py-1 text-[#006B7D]">Wind Policy</div>
              <div className="grid grid-cols-[2fr_1fr] border-b border-black">
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Carrier</div>
                  <Field value={data.wind_carrier} onChange={v => update('wind_carrier', v)} />
                </div>
                <div className="px-1">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">NAIC Code</div>
                  <Field value={data.wind_naic} onChange={v => update('wind_naic', v)} />
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Policy Number</div>
                <Field value={data.wind_policy_number} onChange={v => update('wind_policy_number', v)} />
              </div>
            </div>
          </div>

          {/* Insured */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Insured</div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Name of Insured (First, Middle, Last)</div>
                <Field value={data.insured_name} onChange={v => update('insured_name', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Insured&apos;s Mailing Address</div>
                <Field type="textarea" rows={2} value={data.insured_address} onChange={v => update('insured_address', v)} />
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Date of Birth</div>
                <Field value={data.insured_dob} onChange={v => update('insured_dob', v)} />
              </div>
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">FEIN (if applicable)</div>
                <Field value={data.insured_fein} onChange={v => update('insured_fein', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Marital Status / Civil Union</div>
                <Field value={data.insured_marital_status} onChange={v => update('insured_marital_status', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.insured_phone_primary_type || ''} onChange={e => update('insured_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.insured_phone_primary} onChange={v => update('insured_phone_primary', v)} /></div>
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.insured_phone_secondary_type || ''} onChange={e => update('insured_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.insured_phone_secondary} onChange={v => update('insured_phone_secondary', v)} /></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Email</div>
                <Field value={data.insured_email_primary} onChange={v => update('insured_email_primary', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Email</div>
                <Field value={data.insured_email_secondary} onChange={v => update('insured_email_secondary', v)} />
              </div>
            </div>
          </div>

          {/* Spouse */}
          <div className="mt-2 border-2 border-black">
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Name of Spouse (First, Middle, Last) (if applicable)</div>
                <Field value={data.spouse_name} onChange={v => update('spouse_name', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Spouse&apos;s Mailing Address (if applicable)</div>
                <Field type="textarea" rows={2} value={data.spouse_address} onChange={v => update('spouse_address', v)} />
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Date of Birth</div>
                <Field value={data.spouse_dob} onChange={v => update('spouse_dob', v)} />
              </div>
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">FEIN (if applicable)</div>
                <Field value={data.spouse_fein} onChange={v => update('spouse_fein', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Marital Status / Civil Union</div>
                <Field value={data.spouse_marital_status} onChange={v => update('spouse_marital_status', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.spouse_phone_primary_type || ''} onChange={e => update('spouse_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.spouse_phone_primary} onChange={v => update('spouse_phone_primary', v)} /></div>
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.spouse_phone_secondary_type || ''} onChange={e => update('spouse_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.spouse_phone_secondary} onChange={v => update('spouse_phone_secondary', v)} /></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Email</div>
                <Field value={data.spouse_email_primary} onChange={v => update('spouse_email_primary', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Email</div>
                <Field value={data.spouse_email_secondary} onChange={v => update('spouse_email_secondary', v)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black flex items-center gap-4">
              <span>Contact</span>
              <Check label="Contact Insured" checked={data.contact_insured} onChange={v => update('contact_insured', v)} />
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Name of Contact</div>
                <Field value={data.contact_name} onChange={v => update('contact_name', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Contact&apos;s Mailing Address</div>
                <Field type="textarea" rows={2} value={data.contact_address} onChange={v => update('contact_address', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.contact_phone_primary_type || ''} onChange={e => update('contact_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.contact_phone_primary} onChange={v => update('contact_phone_primary', v)} /></div>
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                <div className="flex items-center gap-2">
                  <select value={data.contact_phone_secondary_type || ''} onChange={e => update('contact_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                    <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                  </select>
                  <div className="flex-1"><Field value={data.contact_phone_secondary} onChange={v => update('contact_phone_secondary', v)} /></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">When to Contact</div>
                <Field value={data.contact_when} onChange={v => update('contact_when', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Email</div>
                <Field value={data.contact_email_primary} onChange={v => update('contact_email_primary', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Email</div>
                <Field value={data.contact_email_secondary} onChange={v => update('contact_email_secondary', v)} />
              </div>
              <div className="px-1"></div>
            </div>
          </div>

          {/* Loss */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Loss</div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Location of Loss — Street</div>
                <Field value={data.loss_street} onChange={v => update('loss_street', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">City, State, Zip</div>
                <Field value={data.loss_city_state_zip} onChange={v => update('loss_city_state_zip', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Country</div>
                <Field value={data.loss_country} onChange={v => update('loss_country', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Police or Fire Department Contacted</div>
                <Field value={data.police_fire_contacted} onChange={v => update('police_fire_contacted', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Report Number</div>
                <Field value={data.report_number} onChange={v => update('report_number', v)} />
              </div>
            </div>
            <div className="px-1 border-b border-black">
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Describe Location of Loss if Not at Specific Street Address</div>
              <Field value={data.loss_location_description} onChange={v => update('loss_location_description', v)} />
            </div>
            <div className="grid grid-cols-[1fr_2fr] border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Kind of Loss</div>
                <div className="grid grid-cols-2 gap-x-2 py-1">
                  <Check label="Fire" checked={data.kind_of_loss_fire} onChange={v => update('kind_of_loss_fire', v)} />
                  <Check label="Lightning" checked={data.kind_of_loss_lightning} onChange={v => update('kind_of_loss_lightning', v)} />
                  <Check label="Flood" checked={data.kind_of_loss_flood} onChange={v => update('kind_of_loss_flood', v)} />
                  <Check label="Theft" checked={data.kind_of_loss_theft} onChange={v => update('kind_of_loss_theft', v)} />
                  <Check label="Hail" checked={data.kind_of_loss_hail} onChange={v => update('kind_of_loss_hail', v)} />
                  <Check label="Wind" checked={data.kind_of_loss_wind} onChange={v => update('kind_of_loss_wind', v)} />
                </div>
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Other</div>
                <Field value={data.kind_of_loss_other} onChange={v => update('kind_of_loss_other', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Probable Amount Entire Loss</div>
                <Field value={data.probable_amount} onChange={v => update('probable_amount', v)} />
              </div>
            </div>
            <div className="px-1 border-b border-black">
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Description of Loss &amp; Damage</div>
              <Field type="textarea" rows={5} value={data.description_of_loss} onChange={v => update('description_of_loss', v)} />
            </div>
            <div className="grid grid-cols-2">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Reported By</div>
                <Field value={data.reported_by} onChange={v => update('reported_by', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Reported To</div>
                <Field value={data.reported_to} onChange={v => update('reported_to', v)} />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Remarks</div>
            <div className="px-1">
              <Field type="textarea" rows={4} value={data.remarks} onChange={v => update('remarks', v)} />
            </div>
          </div>

          <div className="mt-2 text-[7px] text-gray-600 text-center">
            ACORD 1 (2019/07) &copy; 1988-2019 ACORD CORPORATION. All rights reserved. The ACORD name and logo are registered marks of ACORD.
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.25in;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide everything */
          body * {
            visibility: hidden !important;
          }
          /* Show only the print area */
          #acord-form-print, #acord-form-print * {
            visibility: visible !important;
          }
          /* Position the form at top of page */
          #acord-form-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
          }
          #acord-form-print label,
          #acord-form-print .text-\\[8px\\],
          #acord-form-print .text-\\[9px\\],
          #acord-form-print .text-\\[10px\\] {
            font-size: 6.5px !important;
          }
          #acord-form-print input,
          #acord-form-print textarea,
          #acord-form-print select {
            background: transparent !important;
            color: black !important;
            -webkit-text-fill-color: black !important;
            font-size: 8px !important;
            padding: 0 !important;
            border: none !important;
          }
          #acord-form-print textarea {
            resize: none !important;
          }
          /* Don't split sections across pages */
          #acord-form-print > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          #acord-form-print .border-2 {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
