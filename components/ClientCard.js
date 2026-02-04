import { memo } from 'react'
import Link from 'next/link'

// Generate initials from client name
function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

// Generate consistent neutral color from name
function getColorFromName(name) {
  const colors = [
    'bg-slate-400', 'bg-gray-400', 'bg-zinc-400', 'bg-neutral-400',
    'bg-stone-400', 'bg-slate-500', 'bg-gray-500', 'bg-zinc-500'
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const ClientCard = memo(function ClientCard({ client }) {
  return (
    <Link href={`/clients/${client.id}`}>
      <div className="group bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#006B7D]/30 h-60 flex flex-col">
        {/* Logo */}
        <div className="flex justify-center mb-3">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={`${client.name} logo`}
              className="w-24 h-24 rounded-xl object-contain"
            />
          ) : (
            <div className={`w-24 h-24 rounded-xl ${getColorFromName(client.name)} flex items-center justify-center text-white font-bold text-2xl`}>
              {getInitials(client.name)}
            </div>
          )}
        </div>

        {/* Client Name */}
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#006B7D] transition-colors text-center line-clamp-1 mb-2">
          {client.name}
        </h3>

        {/* Producer & Account Manager */}
        <div className="space-y-1 text-xs flex-1">
          {client.producer_name && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Producer:</span>
              <span className="text-gray-900 truncate">{client.producer_name}</span>
            </div>
          )}
          {client.account_manager && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">AM:</span>
              <span className="text-gray-900 truncate">{client.account_manager}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})

export default ClientCard
