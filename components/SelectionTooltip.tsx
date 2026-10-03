"use client"

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAIAssistant } from '@/contexts/AIAssistantContext'

interface SelectionTooltipProps {
  children: React.ReactNode
  className?: string
}

export const SelectionTooltip: React.FC<SelectionTooltipProps> = ({ 
  children, 
  className = "" 
}) => {
  const [selectedText, setSelectedText] = useState("")
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { openWithText } = useAIAssistant()

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length > 3 && containerRef.current) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        
        if (rect) {
          const containerRect = containerRef.current.getBoundingClientRect()
          
          // Check if selection is within our container
          const isWithinContainer = 
            rect.left >= containerRect.left &&
            rect.right <= containerRect.right &&
            rect.top >= containerRect.top &&
            rect.bottom <= containerRect.bottom

          if (isWithinContainer) {
            setSelectedText(text)
            setTooltipPosition({
              x: rect.left + (rect.width / 2),
              y: rect.top - 60 // Position above the selection with more space
            })
            setShowTooltip(true)
            return
          }
        }
      }
      
      setShowTooltip(false)
    }

    const handleClickOutside = (e: MouseEvent) => {
      // Don't hide if clicking on the tooltip itself
      const target = e.target as Element
      if (target.closest('[data-tooltip="ask-ai"]')) {
        return
      }
      setShowTooltip(false)
    }

    // Use a slight delay to ensure the selection has been made
    const handleSelectionDelayed = () => {
      setTimeout(handleSelection, 10)
    }

    document.addEventListener('mouseup', handleSelectionDelayed)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('mouseup', handleSelectionDelayed)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  const handleAskAI = () => {
    if (selectedText) {
      openWithText(selectedText, "Selected text from the page")
      setShowTooltip(false)
      
      // Clear the text selection
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
    }
  }

  return (
    <>
      <div 
        ref={containerRef} 
        className={`relative ${className}`}
        style={{ userSelect: 'text' }}
      >
        {children}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="fixed z-[60] animate-in fade-in-0 zoom-in-95 duration-200"
          data-tooltip="ask-ai"
          style={{
            left: `${Math.min(Math.max(tooltipPosition.x, 120), window.innerWidth - 120)}px`,
            top: `${Math.max(tooltipPosition.y, 10)}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            type="button"
            onClick={handleAskAI}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-semibold text-sheet shadow-lift transition-colors hover:bg-ink/90"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Ask about this
          </button>
        </div>
      )}
    </>
  )
}