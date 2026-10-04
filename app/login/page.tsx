"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet } from "@/components/script/sheet"
import { Wordmark } from "@/components/script/marks"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login - redirect to analysis page
    router.push("/analysis?new")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8 rounded-sm">
        <Wordmark />
      </Link>

      <Sheet className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="space-y-5 p-6 sm:p-8">
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
            <p className="mt-1 text-sm text-ink-soft">Accounts aren&apos;t available yet. You can evaluate an idea without one.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-meta font-medium text-ink-soft">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-meta font-medium text-ink-soft">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full justify-between px-4">
            Continue <ArrowRight />
          </Button>
        </form>
      </Sheet>

      <Link href="/analysis?new" className="mt-6 text-sm font-medium text-ink-soft underline decoration-rule hover:text-ink hover:decoration-marker">
        Evaluate an idea without signing in
      </Link>
    </div>
  )
}
