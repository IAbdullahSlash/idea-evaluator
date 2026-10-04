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
            <Link href="/analysis?new">
              Evaluate<span className="hidden sm:inline"> an idea</span>
            </Link>
          </Button>
        </>
      }
    />
  )
}
