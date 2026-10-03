import { Cross, Query, Tick } from "@/components/script/marks"
import { MarginNote, Sheet, SheetRow } from "@/components/script/sheet"

/*
 * The marking scheme: the questions every idea is marked against,
 * taken from the product's own evaluation notes.
 */
const criteria = [
  { name: "A real problem", asks: "Does it solve a clear problem that someone actually has?", fails: "Nobody you ask recognises the problem." },
  { name: "Worth solving", asks: "Is the pain big enough that people would change what they do today?", fails: "People shrug and keep their workaround." },
  { name: "Already done", asks: "Is it a common project, or does something like it already exist?", fails: "A free tool already does it well." },
  { name: "Something new", asks: "What does it do that the alternatives don't?", fails: "You can't name one difference." },
  { name: "Within reach", asks: "Can you build it with your skills and time, or does it need an expert?", fails: "The core part needs research you haven't done." },
  { name: "Someone wants it", asks: "Who are the users, and is there demand for it?", fails: "The only user you can name is you." },
]

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="max-w-2xl">
        <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
          The marking scheme
        </h2>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
          Every idea is marked against the same questions. A clever idea that nobody needs still loses marks.
        </p>
      </div>

      <Sheet className="mt-10">
        <SheetRow
          bodyClassName="py-4 sm:py-4"
          marginLabel="Key"
          margin={
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-meta text-ink-soft lg:flex-col">
              <li className="flex items-center gap-2"><Tick className="size-4 text-marker" /> Holds up</li>
              <li className="flex items-center gap-2"><Query className="size-4 text-marker" /> Needs evidence</li>
              <li className="flex items-center gap-2"><Cross className="size-4 text-marker" /> A problem for the idea</li>
            </ul>
          }
        >
          <div className="hidden gap-6 sm:grid sm:grid-cols-[14rem_minmax(0,1fr)]">
            <p className="label-caps">Criterion</p>
            <p className="label-caps">What it asks</p>
          </div>
          <p className="label-caps sm:hidden">Criteria</p>
        </SheetRow>
        {criteria.map((c) => (
          <SheetRow
            key={c.name}
            bodyClassName="py-5 sm:py-5"
            marginLabel="Loses marks if"
            marginDesktopOnly
            margin={<MarginNote mark={<Cross className="size-4" />}>{c.fails}</MarginNote>}
          >
            <div className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
              <h3 className="text-[1.0625rem] font-semibold text-ink">{c.name}</h3>
              <p className="text-[1.0625rem] leading-relaxed text-ink-soft">{c.asks}</p>
            </div>
            <MarginNote className="mt-3 lg:hidden" mark={<Cross className="size-4" />}>{c.fails}</MarginNote>
          </SheetRow>
        ))}
      </Sheet>
    </section>
  )
}
