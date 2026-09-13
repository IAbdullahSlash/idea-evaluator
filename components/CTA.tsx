import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function CTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl cta-gradient p-8 md:p-16">
          <div className="relative z-10 text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Ready to validate your next big idea?</span>
              </div>
              
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Turn Your Ideas Into
                <br />
                Successful Products
              </h2>
              
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Join thousands of entrepreneurs and developers who've used our AI analysis 
                to validate their ideas and build better products.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6">
                <Link href="/analysis">
                  Start Your Analysis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/analysis">
                  View Sample Report
                </Link>
              </Button>
            </div>

            <div className="pt-8 text-white/80 text-sm">
              <p>✨ Free analysis • ⚡ Results in 30 seconds • 🔒 No signup required</p>
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  )
}