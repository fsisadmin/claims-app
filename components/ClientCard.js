import { memo } from 'react'
import Link from 'next/link'

const ClientCard = memo(function ClientCard({ client }) {
  return (
    <Link href={`/clients/${client.id}`}>
      <div className="group bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#006B7D]/30">
        {/* Client Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-[#006B7D] transition-colors">
          {client.name}
        </h3>

        {/* Producer & Account Manager */}
        <div className="space-y-2 text-sm">
          {client.producer_name && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Producer:</span>
              <span className="text-gray-900">{client.producer_name}</span>
            </div>
          )}

          {client.account_manager && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Account Manager:</span>
              <span className="text-gray-900">{client.account_manager}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})

export default ClientCard
