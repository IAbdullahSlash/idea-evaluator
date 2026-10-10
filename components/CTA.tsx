import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h2 className="max-w-[20ch] text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3rem]">
            Find out before you spend the semester on it.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            Your AI asks the time you have and your experience, and the idea is marked with that in mind. No account needed.
          </p>
        </div>
        <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
          <Link href="#connect">
            Add the connector <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  )
}
