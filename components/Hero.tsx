import Link from "next/link"
import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Underline } from "@/components/script/marks"

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 pt-12 sm:px-6 sm:pt-20 lg:pb-8">
      <h1 className="max-w-[16ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.75rem] lg:text-[4.5rem]">
        Is your project idea{" "}
        <span className="relative inline-block whitespace-nowrap">
          worth building?
          <Underline className="absolute -bottom-2 left-0 h-3 w-full text-marker sm:-bottom-3 sm:h-4" />
        </span>
      </h1>
      <p className="mt-8 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-soft sm:text-lg">
        Add the Idea Evaluator to the AI you already use, and it marks your idea like an exam answer instead of cheering
        it on: a score out of ten, the real risks noted in the margin, live research on who is already doing it, and, if
        it holds up, a plan and the documents to start building.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button asChild size="lg" className="h-11 px-5 text-[0.9375rem]">
          <Link href="#connect">
            Connect your AI <ArrowDown />
          </Link>
        </Button>
        <p className="text-meta text-pencil">Works in Claude, ChatGPT and Gemini. No account needed.</p>
      </div>
    </section>
  )
}
