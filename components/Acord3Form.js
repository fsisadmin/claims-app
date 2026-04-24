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
        body: JSON.stringify({ formType: 'acord_3', formData: data }),
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
          <h2 className="text-lg font-semibold">ACORD 3 — General Liability Notice of Occurrence / Claim</h2>
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
              <div className="text-lg font-black text-gray-900 tracking-wide">GENERAL LIABILITY NOTICE OF OCCURRENCE / CLAIM</div>
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

              {/* GL Policy */}
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
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Policy Number</div>
                <Field value={data.property_policy_number} onChange={v => update('property_policy_number', v)} />
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

          {/* Occurrence */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Occurrence</div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Location of Occurrence — Street</div>
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
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Describe Location if Not at Specific Street Address</div>
              <Field value={data.loss_location_description} onChange={v => update('loss_location_description', v)} />
            </div>
            <div className="px-1 border-b border-black">
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Description of Occurrence</div>
              <Field type="textarea" rows={5} value={data.description_of_loss} onChange={v => update('description_of_loss', v)} />
            </div>
          </div>

          {/* Type of Liability */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Type of Liability</div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Premises: Insured Is</div>
                <div className="flex items-center gap-3 py-1">
                  <Check label="Owner" checked={data.premises_owner} onChange={v => update('premises_owner', v)} />
                  <Check label="Tenant" checked={data.premises_tenant} onChange={v => update('premises_tenant', v)} />
                  <Check label="Other" checked={data.premises_other} onChange={v => update('premises_other', v)} />
                  <div className="flex-1"><Field value={data.premises_other_text} onChange={v => { update('premises_other_text', v); if (v) update('premises_other', true) }} /></div>
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Type of Premises</div>
                <Field value={data.type_of_premises} onChange={v => update('type_of_premises', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Owner&apos;s Name &amp; Address (if not insured)</div>
                <Field value={data.owner_name} onChange={v => update('owner_name', v)} />
                <Field value={data.owner_address_1} onChange={v => update('owner_address_1', v)} />
                <Field value={data.owner_address_2} onChange={v => update('owner_address_2', v)} />
              </div>
              <div className="px-1">
                <div className="grid grid-cols-2 border-b border-gray-200 pb-1">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.owner_phone_primary_type || ''} onChange={e => update('owner_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.owner_phone_primary} onChange={v => update('owner_phone_primary', v)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.owner_phone_secondary_type || ''} onChange={e => update('owner_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.owner_phone_secondary} onChange={v => update('owner_phone_secondary', v)} /></div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Primary Email</div>
                <Field value={data.owner_email_primary} onChange={v => update('owner_email_primary', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Secondary Email</div>
                <Field value={data.owner_email_secondary} onChange={v => update('owner_email_secondary', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Products: Insured Is</div>
                <div className="flex items-center gap-3 py-1">
                  <Check label="Manufacturer" checked={data.products_manufacturer} onChange={v => update('products_manufacturer', v)} />
                  <Check label="Vendor" checked={data.products_vendor} onChange={v => update('products_vendor', v)} />
                  <Check label="Other" checked={data.products_other} onChange={v => update('products_other', v)} />
                  <div className="flex-1"><Field value={data.products_other_text} onChange={v => { update('products_other_text', v); if (v) update('products_other', true) }} /></div>
                </div>
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Type of Product</div>
                <Field value={data.type_of_product} onChange={v => update('type_of_product', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Manufacturer&apos;s Name &amp; Address (if not insured)</div>
                <Field value={data.manufacturer_name} onChange={v => update('manufacturer_name', v)} />
                <Field value={data.manufacturer_address_1} onChange={v => update('manufacturer_address_1', v)} />
                <Field value={data.manufacturer_address_2} onChange={v => update('manufacturer_address_2', v)} />
              </div>
              <div className="px-1">
                <div className="grid grid-cols-2 border-b border-gray-200 pb-1">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.mfr_phone_primary_type || ''} onChange={e => update('mfr_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.mfr_phone_primary} onChange={v => update('mfr_phone_primary', v)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.mfr_phone_secondary_type || ''} onChange={e => update('mfr_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.mfr_phone_secondary} onChange={v => update('mfr_phone_secondary', v)} /></div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Primary Email</div>
                <Field value={data.mfr_email_primary} onChange={v => update('mfr_email_primary', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Secondary Email</div>
                <Field value={data.mfr_email_secondary} onChange={v => update('mfr_email_secondary', v)} />
              </div>
            </div>
            <div className="px-1">
              <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Where Can Product Be Seen?</div>
              <Field value={data.where_product_seen} onChange={v => update('where_product_seen', v)} />
            </div>
          </div>

          {/* Page 2 divider */}
          <div className="mt-6 mb-4 flex items-center gap-4">
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Page 2</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
          </div>

          {/* Injured / Property Damaged */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Injured / Property Damaged</div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Name (Injured/Owner)</div>
                <Field value={data.injured_name} onChange={v => update('injured_name', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Address</div>
                <Field value={data.injured_address_1} onChange={v => update('injured_address_1', v)} />
                <Field value={data.injured_address_2} onChange={v => update('injured_address_2', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Employer&apos;s Name</div>
                <Field value={data.employer_name} onChange={v => update('employer_name', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Address</div>
                <Field value={data.employer_address_1} onChange={v => update('employer_address_1', v)} />
                <Field value={data.employer_address_2} onChange={v => update('employer_address_2', v)} />
              </div>
            </div>
            {/* Injured + Employer phones/emails */}
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="grid grid-cols-2 border-b border-gray-200 pb-1">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.injured_phone_primary_type || ''} onChange={e => update('injured_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.injured_phone_primary} onChange={v => update('injured_phone_primary', v)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.injured_phone_secondary_type || ''} onChange={e => update('injured_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.injured_phone_secondary} onChange={v => update('injured_phone_secondary', v)} /></div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Primary Email</div>
                <Field value={data.injured_email_primary} onChange={v => update('injured_email_primary', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Secondary Email</div>
                <Field value={data.injured_email_secondary} onChange={v => update('injured_email_secondary', v)} />
              </div>
              <div className="px-1">
                <div className="grid grid-cols-2 border-b border-gray-200 pb-1">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.employer_phone_primary_type || ''} onChange={e => update('employer_phone_primary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.employer_phone_primary} onChange={v => update('employer_phone_primary', v)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                    <div className="flex items-center gap-1">
                      <select value={data.employer_phone_secondary_type || ''} onChange={e => update('employer_phone_secondary_type', e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                        <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                      </select>
                      <div className="flex-1"><Field value={data.employer_phone_secondary} onChange={v => update('employer_phone_secondary', v)} /></div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Primary Email</div>
                <Field value={data.employer_email_primary} onChange={v => update('employer_email_primary', v)} />
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Secondary Email</div>
                <Field value={data.employer_email_secondary} onChange={v => update('employer_email_secondary', v)} />
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Age</div>
                <Field value={data.injured_age} onChange={v => update('injured_age', v)} />
              </div>
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Sex</div>
                <Field value={data.injured_sex} onChange={v => update('injured_sex', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Occupation</div>
                <Field value={data.injured_occupation} onChange={v => update('injured_occupation', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Describe Injury</div>
                <Field type="textarea" rows={2} value={data.describe_injury} onChange={v => update('describe_injury', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">What Was Injured Doing?</div>
                <Field type="textarea" rows={2} value={data.what_injured_doing} onChange={v => update('what_injured_doing', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Where Taken</div>
                <Field value={data.where_taken} onChange={v => update('where_taken', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Estimate Amount</div>
                <Field value={data.estimate_amount} onChange={v => update('estimate_amount', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-1 border-r border-black">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Describe Property (Type, model, etc.)</div>
                <Field type="textarea" rows={2} value={data.describe_property} onChange={v => update('describe_property', v)} />
              </div>
              <div className="px-1">
                <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Where Can Property Be Seen?</div>
                <Field value={data.where_property_seen} onChange={v => update('where_property_seen', v)} />
              </div>
            </div>
          </div>

          {/* Witnesses */}
          <div className="mt-2 border-2 border-black">
            <div className="bg-gray-100 px-1 text-[11px] font-bold uppercase text-[#005570] border-b border-black">Witnesses</div>
            {[1, 2, 3].map(i => (
              <div key={i} className={`grid grid-cols-2 ${i < 3 ? 'border-b border-black' : ''}`}>
                <div className="px-1 border-r border-black">
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Witness {i} — Name and Address</div>
                  <Field value={data[`witness${i}_name`]} onChange={v => update(`witness${i}_name`, v)} />
                  <Field value={data[`witness${i}_address_1`]} onChange={v => update(`witness${i}_address_1`, v)} />
                  <Field value={data[`witness${i}_address_2`]} onChange={v => update(`witness${i}_address_2`, v)} />
                </div>
                <div className="px-1">
                  <div className="grid grid-cols-2 border-b border-gray-200 pb-1">
                    <div>
                      <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Primary Phone</div>
                      <div className="flex items-center gap-1">
                        <select value={data[`witness${i}_phone_type`] || ''} onChange={e => update(`witness${i}_phone_type`, e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                          <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                        </select>
                        <div className="flex-1"><Field value={data[`witness${i}_phone`]} onChange={v => update(`witness${i}_phone`, v)} /></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide">Secondary Phone</div>
                      <div className="flex items-center gap-1">
                        <select value={data[`witness${i}_phone2_type`] || ''} onChange={e => update(`witness${i}_phone2_type`, e.target.value)} className="text-[10px] border-0 bg-blue-50 text-gray-900 focus:outline-none focus:bg-yellow-50 print:bg-transparent rounded-sm px-1 py-0.5">
                          <option value="">—</option><option>HOME</option><option>BUS</option><option>CELL</option>
                        </select>
                        <div className="flex-1"><Field value={data[`witness${i}_phone2`]} onChange={v => update(`witness${i}_phone2`, v)} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Primary Email</div>
                  <Field value={data[`witness${i}_email`]} onChange={v => update(`witness${i}_email`, v)} />
                  <div className="text-[9px] font-bold uppercase text-[#006B7D] tracking-wide mt-1">Secondary Email</div>
                  <Field value={data[`witness${i}_email2`]} onChange={v => update(`witness${i}_email2`, v)} />
                </div>
              </div>
            ))}
          </div>

          {/* Reported By / To */}
          <div className="mt-2 border-2 border-black">
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
            ACORD 3 (2013/01) &copy; 1986-2013 ACORD CORPORATION. All rights reserved. The ACORD name and logo are registered marks of ACORD.
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
