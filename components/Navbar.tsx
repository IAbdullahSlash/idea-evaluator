"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { AppBar } from "@/components/script/app-bar"

export function Navbar() {
  return (
    <AppBar
      actions={
        <>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/#connect">
              Connect<span className="hidden sm:inline"> your AI</span>
            </Link>
          </Button>
        </>
      }
    />
  )
}
