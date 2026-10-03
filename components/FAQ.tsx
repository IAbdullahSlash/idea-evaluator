import { ChevronDown } from "lucide-react"

/*
 * Questions people ask before trying it. Every answer describes how the
 * product works today; nothing here is a promise about the future.
 */
const faqs = [
  {
    q: "Do I need an account?",
    a: "No. Write your idea and it is marked straight away.",
  },
  {
    q: "Where does my idea go?",
    a: "It is sent to Google's Gemini model to be marked, and the result is kept in your own browser. It is not saved to an account or a database.",
  },
  {
    q: "How much should I trust the score?",
    a: "Treat it as a second opinion from a strict examiner, not a guarantee. It is an AI's judgement, so check the risks it raises with real users and your supervisor.",
  },
  {
    q: "Where do the research papers and similar projects come from?",
    a: "Papers come from Semantic Scholar and OpenAlex, and similar projects from GitHub search. Each one links to its source so you can read it yourself.",
  },
  {
    q: "Can I change my idea after it is marked?",
    a: "Yes. Edit it or refine the description and mark it again as many times as you like.",
  },
]

export function FAQ() {
  return (
    <section className="border-y border-rule bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
          Questions before you start
        </h2>
        <div className="divide-y divide-rule border-y border-rule">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[1.0625rem] font-semibold text-ink transition-colors hover:text-marker [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown aria-hidden className="size-4 shrink-0 text-pencil transition-transform duration-300 ease-out-expo group-open:rotate-180" />
              </summary>
              <p className="max-w-[62ch] pb-5 text-[0.9375rem] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
