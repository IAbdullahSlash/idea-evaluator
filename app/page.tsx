"use client"

import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { Features } from "@/components/Features"
import { HowItWorks } from "@/components/HowItWorks"
import { CTA } from "@/components/CTA"
import { ExampleEvaluation } from "@/components/ExampleEvaluation"
import { Audiences } from "@/components/Audiences"
import { FAQ } from "@/components/FAQ"
import { Footer } from "@/components/Footer"
import { SelectionTooltip } from "@/components/SelectionTooltip"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SelectionTooltip>
        <main>
          <Hero />
          <ExampleEvaluation />
          <HowItWorks />
          <Audiences />
          <Features />
          <FAQ />
          <CTA />
        </main>
      </SelectionTooltip>
      <Footer />
    </div>
  )
}
