"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAIAssistant } from "@/contexts/AIAssistantContext"
import { Markdown } from "@/components/script/markdown"
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIAssistantChatProps {
  // No props needed - we'll use context
}

export function AIAssistantChat() {
  const { isOpen, closeAssistant, selectedText, projectContext } = useAIAssistant()
 const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello, how can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isThinking, setIsThinking] = React.useState(false)
  const [streamingMessage, setStreamingMessage] = React.useState("")
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [abortController, setAbortController] = React.useState<AbortController | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Suggested questions based on the project context
  const suggestedQuestions = [
    "What are the main technical challenges I should expect with this project?",
    "How can I validate my project idea before investing significant time?",
    "What technologies would be best suited for this type of project?",
    "What is the recommended development approach for a beginner vs experienced developer?",
  ]

  // Auto-populate input with selected text
  React.useEffect(() => {
    if (selectedText && isOpen) {
      setInput(`Please explain this: "${selectedText}"`)
    }
  }, [selectedText, isOpen])
React.useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
      if (atBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [messages, isThinking, streamingMessage])

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort()
    }
    setIsLoading(false)
    setIsThinking(false)
    setIsStreaming(false)
    setStreamingMessage("")
    setAbortController(null)
  }

 const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsThinking(true)
    setStreamingMessage("")

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    try {
     
      // Call the Gemini API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          projectContext: projectContext,
        }),
        signal: controller.signal,
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      const fullMessage = data.message || "I apologize, but I couldn't generate a response. Please try again."
      
      // Stop thinking and start streaming
      setIsThinking(false)
      setIsStreaming(true)
      
      // Stream the message word by word (handles emojis/multi-byte via grapheme clusters)
      const words = fullMessage.match(/\S+/g) || []
      let currentText = ''
      
      for (let i = 0; i < words.length; i++) {
        // Check if generation was stopped
        if (controller.signal.aborted) {
          return
        }
        
        currentText += (i === 0 ? '' : ' ') + words[i]
        setStreamingMessage(currentText)
        await new Promise(resolve => setTimeout(resolve, 50)) // 50ms delay between words
      }

      // Check once more before finalizing
      if (controller.signal.aborted) {
        return
      }

      // Add the complete message to messages array
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullMessage,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setStreamingMessage("")
      setIsStreaming(false)
    } catch (error) {
      // Handle abort error silently
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      console.error("Error sending message:", error)
      
      setIsThinking(false)
      setIsStreaming(false)
      setStreamingMessage("")
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderAnswer = (content: string) => (
    <Markdown className="text-[0.9375rem]" rehypePlugins={[rehypeHighlight, rehypeRaw]}>
      {content}
    </Markdown>
  )

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/25 transition-opacity"
          onClick={closeAssistant}
          aria-hidden
        />
      )}

      {/* Panel: a tutor's sheet slid in from the right, its margin rule on the left */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Project assistant"
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full bg-sheet shadow-lift transition-transform duration-500 ease-out-expo md:w-[30rem]",
          isOpen ? "visible translate-x-0" : "pointer-events-none invisible translate-x-full"
        )}
      >
        <div aria-hidden className="absolute inset-y-0 left-0 w-[5px] border-x border-marker/80" />
        <div className="flex h-full flex-col pl-[5px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Ask about your project</h2>
              <p className="text-meta text-pencil">
                {projectContext ? "Answers use your evaluation as context." : "General project advice."}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeAssistant} aria-label="Close assistant" className="size-8">
              <X />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5" ref={scrollRef}>
            <ol className="space-y-5">
              {messages.map((message) => (
                <li key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  {message.role === "assistant" ? (
                    <div className="min-w-0 max-w-full border-l border-marker/70 pl-4">
                      {renderAnswer(message.content)}
                    </div>
                  ) : (
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-md bg-muted px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-ink">
                      {message.content}
                    </p>
                  )}
                </li>
              ))}
              {isThinking && (
                <li className="border-l border-marker/70 pl-4">
                  <p className="font-hand text-lg text-marker">Thinking…</p>
                </li>
              )}
              {streamingMessage && (
                <li className="min-w-0 border-l border-marker/70 pl-4">{renderAnswer(streamingMessage)}</li>
              )}
            </ol>
          </div>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="border-t border-rule px-5 py-4">
              <p className="label-caps mb-2">Try asking</p>
              <ul className="divide-y divide-rule">
                {suggestedQuestions.map((question, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="w-full py-2.5 text-left text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-rule px-5 py-4">
            <div className="flex items-end gap-2">
              <Label htmlFor="assistant-input" className="sr-only">Your question</Label>
              <Textarea
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your project…"
                className="max-h-[120px] min-h-[52px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={isLoading ? stopGeneration : handleSendMessage}
                disabled={!isLoading && !input.trim()}
                size="icon"
                className="size-[52px] shrink-0"
                variant={isLoading ? "outline" : "default"}
                aria-label={isLoading ? "Stop" : "Send"}
              >
                {isLoading ? <Square /> : <Send />}
              </Button>
            </div>
            <p className="mt-2 text-meta text-pencil">Enter to send, Shift+Enter for a new line.</p>
          </div>
        </div>
      </div>
    </>
  )
}
