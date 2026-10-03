/*
 * Who it is for. The three situations from the product notes, each with the
 * question that matters most in it. No claims beyond what the product does.
 */
const audiences = [
  {
    who: "Hackathon teams",
    when: "At kickoff, before anyone opens an editor.",
    asks: "Can we build something that works by the demo, or are we about to spend the night on the hard part?",
  },
  {
    who: "Final-year projects",
    when: "When you are choosing a topic or defending one to a supervisor.",
    asks: "Is this big enough to earn the marks, and small enough to finish by the deadline?",
  },
  {
    who: "Side projects",
    when: "Before you give it your weekends.",
    asks: "Does anyone besides me need this, and has someone already built it?",
  },
]

export function Audiences() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="max-w-[22ch] text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        Made for the moment you have to choose
      </h2>
      <ul className="mt-10 grid gap-x-10 gap-y-10 border-t border-rule pt-8 md:grid-cols-3">
        {audiences.map((a) => (
          <li key={a.who}>
            <h3 className="text-[1.125rem] font-semibold text-ink">{a.who}</h3>
            <p className="mt-1 text-meta text-pencil">{a.when}</p>
            <p className="mt-4 text-[1.125rem] font-medium leading-snug text-ink">&ldquo;{a.asks}&rdquo;</p>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-soft">
        Before it is marked, tell it what the project is for, your experience, and the time you have. The snapshot
        takes those into account.
      </p>
    </section>
  )
}
