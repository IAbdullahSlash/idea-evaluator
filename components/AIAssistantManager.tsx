"use client"

import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { AIAssistantChat } from '@/components/AIAssistantChat'
import { useAIAssistant } from '@/contexts/AIAssistantContext'

export function AIAssistantManager() {
  const { isOpen, openAssistant } = useAIAssistant()
  const pathname = usePathname()
  // The analysis workspace has its own "Ask" button in the top bar.
  const showLauncher = !isOpen && pathname !== '/analysis'

  return (
    <>
      {showLauncher && (
        <button
          type="button"
          onClick={openAssistant}
          aria-label="Ask the assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex h-11 items-center gap-2 rounded-md border border-rule bg-sheet px-3.5 sm:px-4 text-sm font-semibold text-ink shadow-lift transition-colors hover:border-pencil"
        >
          <MessageCircle className="size-4 text-marker" aria-hidden />
          <span className="hidden sm:inline">Ask the assistant</span>
        </button>
      )}

      <AIAssistantChat />
    </>
  )
}
