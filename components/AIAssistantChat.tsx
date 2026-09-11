"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, X, Send, Loader2, Bot, User, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAIAssistant } from "@/contexts/AIAssistantContext"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css' // Choose your preferred theme

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

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeAssistant}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[500px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">AI Instructor</h2>
                <p className="text-xs text-muted-foreground">
                  Ask me anything about your project
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeAssistant}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* Replace this plain text with ReactMarkdown */}
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeRaw]}
                          components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold mb-3 text-foreground">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-semibold mb-2 mt-4 text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-md font-medium mb-2 mt-3 text-foreground">
                              {children}
                            </h3>
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => (
                            inline ? (
                              <code className="bg-primary/20 px-1 py-0.5 rounded text-sm font-mono text-primary">
                                {children}
                              </code>
                            ) : (
                              <code {...props} className="block bg-secondary p-3 rounded-md overflow-x-auto text-sm">
                                {children}
                              </code>
                            )
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary pl-4 italic bg-primary/5 py-2 my-3">
                              {children}
                            </blockquote>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 mb-3">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 mb-3">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground">
                              {children}
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 text-foreground leading-relaxed">
                              {children}
                            </p>
                          ),
                          hr: () => (
                            <hr className="my-4 border-border" />
                          )
                        }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground italic">Thinking...</p>
                  </div>
                </div>
              )}
              {streamingMessage && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        components={{
                        // Same styling components as above
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold mb-2 mt-4 text-foreground">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-md font-medium mb-2 mt-3 text-foreground">
                            {children}
                          </h3>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-foreground">
                            {children}
                          </strong>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 text-foreground leading-relaxed">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 mb-3">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-foreground">
                            {children}
                          </li>
                        ),
                      }}
                      >
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="p-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">
                Some questions you might have about this project:
              </p>
              <div className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left text-sm p-3 rounded-lg bg-background hover:bg-accent transition-colors border border-border"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI anything about your project..."
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={isLoading ? stopGeneration : handleSendMessage}
                disabled={!isLoading && !input.trim()}
                size="icon"
                className="h-[60px] w-[60px] flex-shrink-0"
                variant={isLoading ? "destructive" : "default"}
              >
                {isLoading ? (
                  <Square className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
