'use client'

import { useState, useRef, useEffect } from 'react'

function FormattedMessage({ content }) {
  // Simple markdown-like rendering
  const lines = content.split('\n')
  const elements = []
  let inList = false
  let listItems = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1 my-1.5 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-1.5 text-sm">
              <span className="text-[#006B7D] mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
    inList = false
  }

  const renderInline = (text) => {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headers: #, ##, ###
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h4 key={i} className="text-xs font-bold text-[#006B7D] mt-2.5 mb-1 uppercase tracking-wide">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={i} className="text-sm font-bold text-gray-900 mt-2.5 mb-1">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h2 key={i} className="text-sm font-bold text-[#006B7D] mt-2 mb-1 border-b border-gray-200 pb-1">
          {line.slice(2)}
        </h2>
      )
    } else if (/^[-•*]\s/.test(line)) {
      // Bullet point
      inList = true
      listItems.push(line.replace(/^[-•*]\s+/, ''))
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      flushList()
      elements.push(
        <div key={i} className="flex gap-1.5 text-sm my-0.5 ml-1">
          <span className="text-[#006B7D] font-medium flex-shrink-0">{line.match(/^\d+/)[0]}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s+/, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      flushList()
      elements.push(<div key={i} className="h-1.5" />)
    } else {
      flushList()
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }
  flushList()

  return <div className="space-y-0.5">{elements}</div>
}

export default function ClaimInsightsChat({ claimId, claimNumber }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    const userMsg = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Build conversation history (exclude the current message)
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/origami/claim-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          question,
          conversationHistory: history,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to get response')

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`,
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = [
    'Summarize this claim',
    'What are the key concerns?',
    'Summarize the notes and communications',
    'What is the financial exposure?',
  ]

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-6 bottom-6 z-40 bg-[#006B7D] text-white w-14 h-14 rounded-full shadow-xl hover:bg-[#008BA3] transition-all hover:scale-105 flex items-center justify-center"
        title="Ask AI about this claim"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-6">
          <div className="absolute inset-0 bg-black/10" onClick={() => setIsOpen(false)} />
          <div className="relative w-[440px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#006B7D] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Claim Insights</h3>
                  <p className="text-[11px] text-white/70">{claimNumber ? `Claim ${claimNumber}` : 'AI Assistant'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([])}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-[#006B7D]/10 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-[#006B7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Ask about this claim</h4>
                  <p className="text-xs text-gray-500 mb-4">
                    I have access to all notes, files, financials, and claim details.
                  </p>
                  <div className="space-y-2 w-full">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-[#006B7D]/30 hover:bg-[#006B7D]/5 hover:text-[#006B7D] transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#006B7D] text-white rounded-br-md'
                            : msg.isError
                              ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <FormattedMessage content={msg.content} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#006B7D]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#006B7D]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#006B7D]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this claim..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006B7D]/30 focus:border-[#006B7D] max-h-24 bg-white"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-[#006B7D] text-white flex items-center justify-center hover:bg-[#008BA3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
