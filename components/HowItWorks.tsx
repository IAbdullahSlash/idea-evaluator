/*
 * The contents page: five pages, each producing something you keep.
 * The numbering carries information here: the pages unlock in order.
 */
const contents = [
  { n: 1, page: "Snapshot", gives: "A feasibility score out of 10, your odds of finishing, difficulty, and an honest reality check." },
  { n: 2, page: "Summary", gives: "Strengths, risks, scope, a suggested stack, research papers, and existing projects like yours." },
  { n: 3, page: "Roadmap", gives: "Phases with deliverables, the team you need, and how to test it." },
  { n: 4, page: "Tech plan", gives: "Technology layers and readiness, versions, security, and a cost estimate." },
  { n: 5, page: "Hand-off", gives: "A printable report and links to people who can help you build it." },
]

export function HowItWorks() {
  return (
    <section className="border-y border-rule bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <div>
          <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
            Five pages, one plan
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            Each page builds on the one before it. You choose whether to turn the page, so you never plan an idea that
            failed the first question.
          </p>
        </div>

        <ol>
          {contents.map((c) => (
            <li key={c.n} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-b border-rule py-5 first:pt-0 last:border-b-0">
              <span className="font-hand text-[1.75rem] font-bold leading-none text-marker tabular">{c.n}</span>
              <div>
                <h3 className="text-[1.125rem] font-semibold text-ink">{c.page}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{c.gives}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
