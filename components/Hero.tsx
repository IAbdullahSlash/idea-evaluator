"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Brain, Zap } from "lucide-react"
import { SelectionTooltip } from "@/components/SelectionTooltip"

export function Hero() {
  return (
    <SelectionTooltip>
      <section className="relative overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      <div className="relative container mx-auto px-4 py-20 sm:py-24 lg:py-32">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-background/50 backdrop-blur-sm">
            <Zap className="w-4 h-4 mr-2 text-yellow-400" />
            <span className="text-sm font-medium">AI-Powered Project Analysis</span>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl animate-fade-in-up">
              Transform Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Ideas
              </span>{" "}
              Into Reality
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-up animate-delay-200">
              Get brutally honest AI analysis of your project ideas. Discover feasibility, timeline, 
              tech stack recommendations, and roadmaps to turn concepts into successful products.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-400">
            <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6">
              <Link href="/analysis">
                Analyze Your Idea
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 transition-all duration-300">
              <Brain className="mr-2 w-5 h-5" />
              See Example Analysis
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-16 animate-fade-in-up animate-delay-400">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Analysis Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10k+</div>
              <div className="text-sm text-muted-foreground">Ideas Evaluated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">30s</div>
              <div className="text-sm text-muted-foreground">Average Analysis Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-10 sm:left-20 w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
    </section>
    </SelectionTooltip>
  )
}