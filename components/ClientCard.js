import { memo } from 'react'
import Link from 'next/link'

// Function to generate initials from company name
function getInitials(name) {
  if (!name) return '?'

  const words = name.split(' ')
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }

  return words
    .slice(0, 3)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

// Function to generate a color based on the name
function getColorFromName(name) {
  const colors = [
    'bg-teal-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-green-600',
    'bg-red-600',
    'bg-orange-600',
    'bg-pink-600',
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

const ClientCard = memo(function ClientCard({ client }) {
  const initials = getInitials(client.name)
  const bgColor = getColorFromName(client.name)

  return (
    <Link href={`/clients/${client.id}`}>
      <div className="group bg-white border border-gray-200/50 rounded-3xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] shadow-md">
        {/* Logo/Initials */}
        <div className="flex justify-center mb-5">
          {client.logo_url ? (
            <div className="w-32 h-32 flex items-center justify-center bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
              <img
                src={client.logo_url}
                alt={`${client.name} logo`}
                className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className={`${bgColor} w-32 h-32 flex items-center justify-center text-white text-3xl font-bold rounded-2xl shadow-md group-hover:shadow-lg transition-all`}>
              {initials}
            </div>
          )}
        </div>

        {/* Client Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center min-h-[3.5rem] group-hover:text-[#006B7D] transition-colors">
          {client.name}
        </h3>

        {/* Client Details */}
        <div className="space-y-2.5 text-sm">
          {client.state && (
            <div className="inline-flex items-center px-3 py-1.5 bg-[#006B7D]/10 text-[#006B7D] font-semibold rounded-full text-xs">
              {client.state}
            </div>
          )}

          {client.ams_code && (
            <div className="text-gray-600 font-medium">{client.ams_code}</div>
          )}

          {client.client_number && (
            <div className="text-gray-600">{client.client_number}</div>
          )}

          {client.producer_name && (
            <>
              <div className="text-[#006B7D] font-semibold mt-4 text-xs uppercase tracking-wide">Producer</div>
              <div className="text-gray-900 font-medium">{client.producer_name}</div>
            </>
          )}

          {client.account_manager && (
            <>
              <div className="text-[#006B7D] font-semibold mt-4 text-xs uppercase tracking-wide">Account Manager</div>
              <div className="text-gray-900 font-medium">{client.account_manager}</div>
            </>
          )}
        </div>
      </div>
    </Link>
  )
})

export default ClientCard
