"use client"

import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { Features } from "@/components/Features"
import { HowItWorks } from "@/components/HowItWorks"
import { ConnectAI } from "@/components/ConnectAI"
import { CTA } from "@/components/CTA"
import { ExampleEvaluation } from "@/components/ExampleEvaluation"
import { Audiences } from "@/components/Audiences"
import { FAQ } from "@/components/FAQ"
import { Footer } from "@/components/Footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <ExampleEvaluation />
        <HowItWorks />
        <ConnectAI />
        <Audiences />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
