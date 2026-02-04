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
      <div className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#006B7D]/30 h-64 flex flex-col">
        {/* Logo */}
        <div className="flex justify-center mb-3 flex-1 items-center">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={`${client.name} logo`}
              className="w-32 h-32 rounded-xl object-contain"
            />
          ) : (
            <div className={`w-32 h-32 rounded-xl ${getColorFromName(client.name)} flex items-center justify-center text-white font-bold text-4xl`}>
              {getInitials(client.name)}
            </div>
          )}
        </div>

        {/* Client Name */}
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#006B7D] transition-colors text-center line-clamp-2 leading-tight">
          {client.name}
        </h3>
      </div>
    </Link>
  )
})

export default ClientCard
