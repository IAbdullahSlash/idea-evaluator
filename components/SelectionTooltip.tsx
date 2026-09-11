"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Sparkles } from 'lucide-react'
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

      console.log('Selection detected:', text) // Debug log

      if (text && text.length > 3 && containerRef.current) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        
        if (rect) {
          const containerRect = containerRef.current.getBoundingClientRect()
          
          console.log('Container rect:', containerRect) // Debug log
          console.log('Selection rect:', rect) // Debug log
          
          // Check if selection is within our container
          const isWithinContainer = 
            rect.left >= containerRect.left &&
            rect.right <= containerRect.right &&
            rect.top >= containerRect.top &&
            rect.bottom <= containerRect.bottom

          console.log('Is within container:', isWithinContainer) // Debug log

          if (isWithinContainer) {
            setSelectedText(text)
            setTooltipPosition({
              x: rect.left + (rect.width / 2),
              y: rect.top - 60 // Position above the selection with more space
            })
            setShowTooltip(true)
            console.log('Showing tooltip') // Debug log
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
      console.log('Ask AI clicked with text:', selectedText) // Debug log
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
          <div className="bg-background border border-border shadow-lg rounded-lg p-2 backdrop-blur-sm bg-background/95 max-w-[280px]">
            <Button
              onClick={handleAskAI}
              size="sm"
              className="h-8 px-3 gap-2 text-xs font-medium"
              variant="default"
            >
              <Sparkles className="w-3 h-3" />
              Ask AI Assistant
            </Button>
          </div>
          
          {/* Arrow pointing down */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2"
            style={{ 
              width: 0, 
              height: 0, 
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid hsl(var(--border))'
            }}
          />
        </div>
      )}
    </>
  )
}