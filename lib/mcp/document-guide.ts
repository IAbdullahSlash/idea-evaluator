/**
 * Guidance for the Hand-off documents, for the user's own AI: "Idea as an
 * overall" (the four questions), the product brief (vision and story map),
 * the wireframes, and the SRS. Adapted from the
 * prompts the website sends to its own model; each tool's reply carries the
 * next document's guidance and how to write the saved one up in the chat.
 */

export const DOCUMENTS_OFFER = `The Hand-off page can also hold documents written by you in this chat, which the user downloads there as PDF or Word files:
1. Idea as an overall: the idea judged against four questions (the problem and who cares, building and scaling it, maintaining it, measuring success) (save_overall)
2. The product brief: a vision statement, personas, goals, and a user story map (save_brief)
3. Wireframes of the key screens (save_wireframes)
4. A detailed software requirements specification (SRS) that traces back to the stories and screens, with the story map and wireframes printed in it (save_srs_overview, save_srs_features, save_srs_quality)
Ask the user whether they want them. Start with Idea as an overall; the other three go in order, because each builds on the one before.`

export const OVERALL_GUIDE = `Write "Idea as an overall", then call save_overall. Judge the idea frankly against four questions, from the evaluation, the research, and the plan:
1. What specific problem does this solve, and who actually cares? Many projects fail because they build a technically perfect solution to a problem nobody has. State the pain point explicitly instead of assuming it: is it urgent, frequent, or expensive enough that people already look for workarounds? How does it differ from the alternatives: a 10x improvement, or an advantage others can't easily copy? If not, adoption will stall.
2. Can it realistically be built and scaled? Architecture: can this builder deliver the availability, data security, and long-term maintainability it needs? Resources: do they have, or can they get, the skills, framework expertise, and environment to finish within the time available, with some margin?
3. Can it be sustainably maintained and lived with? Running software often costs more than building it. Operations: infrastructure, performance as usage grows, technical debt. Dependencies: for each third-party service or library it leans on, what if the provider cuts support, raises prices, or changes direction, and what is the way out?
4. How will success be defined and measured? Business measures: hard numbers that show it pays off (efficiency, growth, cost saved, users won). User value: what success means for the people using it, and the signs they are struggling or giving up.
- Each question gets an honest answer (Yes, Partly, or No) and a 2-3 sentence summary. Every other text field is a full paragraph of 4-6 sentences: specific, explained rather than asserted, with numbers from the plan and research where they exist. This is a document people read in full, so don't be brief.
- Each question also gets its evidence (3-4 facts with their numbers or sources), the assumptions it rests on with a cheap way to check each (2-3), and what would make it a Yes or keep it one (2-3).
- End with 4-5 next steps in order, the first doable this week.
- Where something is unknown, say what would need to be found out instead of inventing it.`

export const OVERALL_WRITEUP = `Now write it up for the user, in Markdown:
## Idea as an overall
> The verdict.
Then for each of the four questions, a ### heading with the question and its answer (Yes, Partly, or No), the summary, and the reasoning under it: for 1, the pain point, who cares, urgency, and what makes it different; for 2, the architecture, the people, skills, and time, and the gaps to close; for 3, running it and the dependencies with their ways out (a table); for 4, the business measures (a table), the value for users, and the warning signs. Close each question with its evidence, the assumptions to check (a table), and what would make it a Yes.
### What to do next
The steps in order, with why and how long each takes.
Tell them the Hand-off page has it as a PDF or Word download, then give the link and ask whether to go on to the product brief and story map, which the requirements document (SRS) builds on.`

export const BRIEF_GUIDE = `Write the product brief, then call save_brief.
- Vision: one sentence in the form "For <users> who <need>, <product> is a <category> that <benefit>. Unlike <alternative>, it <difference>." Use the Summary's existing solutions for the alternative.
- Personas: 2-3, the people who use the product. Goals: 3-5. Non-goals: 2-4, including what the plan cuts. Success measures: 3-4, each with a number.
- Story map: 3-5 activities in the order a user goes through them, each with 1-3 tasks, each with 1-3 stories written "As a <persona>, I want <something> so that <benefit>". At most 10 tasks and 24 stories.
- Release: each story goes in the plan version that delivers it (the plan's version names exactly), or "Later" if no version does, such as features the plan cuts. Every must-have feature is in the first release.
- Base everything on the evaluation so far; don't invent features.`

export const BRIEF_WRITEUP = `Now write the product brief up for the user, in Markdown:
## Product brief: <product name>
> The vision statement.
### The problem
### Who it is for
Each persona with what they want.
### Goals, non-goals, and how to measure success
### User story map
A table per release (columns: ID, story, activity), using the server's story ids above.
Then give the link and ask whether to go on to the wireframes.`

export const WIREFRAMES_GUIDE = `Sketch the key screens, then call save_wireframes. You describe each screen as a stack of standard parts; the website draws them as grey-box wireframes.
- 4-7 screens: the ones needed for the first release's stories, in the order a user meets them, starting with sign-in or the first screen they see if there is one.
- Use real labels from this product (field names, button text, column names), not placeholders.
- device "mobile" for screens used on a phone (e.g. staff on the move, or a mobile app); otherwise "desktop". sidebar only on desktop screens that need app navigation.
- 3-10 parts per screen. Start with a "header" unless the screen is a full-screen view like a camera scanner. Use "row" to put 2-3 parts side by side.
- stories: the story ids each screen serves. leadsTo: other screen names from your list.
- Don't add screens for features the plan cuts.`

export const WIREFRAMES_WRITEUP = `Now describe the screens for the user, in Markdown:
## Wireframes
A table of the screens (screen, device, what the user does, stories, leads to), then for each screen a short paragraph on what is on it and why, with its design notes.
Mention that the drawn wireframes are printed in the SRS, then give the link and ask whether to go on to the SRS.`

export const SRS_GUIDE = `Write the software requirements specification (IEEE 830 / ISO/IEC/IEEE 29148 style) in three parts, calling save_srs_overview, save_srs_features, and save_srs_quality. Each saves on its own; the document is complete when all three are saved.
- Requirements are single, testable "The system shall …" statements.
- Overview: purpose, scope in and out, definitions a reviewer might not know, perspective, 4-8 product functions, 2-4 user classes, operating environment, constraints, documentation, assumptions, dependencies, UI principles, and the hardware, software, and communications interfaces.
- Features: 4-8 features covering every user story, each with 2-4 stimulus/response pairs and 2-5 requirements with 2-3 acceptance criteria, each a concrete pass/fail check with its numbers. Each requirement cites the story ids it fulfils and the screen names (exactly as in the wireframes) where it shows up. Priority: Must = must-have features; Should = other features the planned versions include; Could = nice-to-haves and anything the plan cuts.
- Quality: 2-4 performance, security, and quality-attribute requirements, each with a number in its measure; safety and business rules only where they apply. Include the plan's security work and any regulation that applies to the data. 3-7 data entities with their key fields and relations (each "<Entity> has many <Entity>", "has one", or "belongs to", with the entity names exactly, so they can be drawn as a diagram), data retention, and 3-6 open questions.
- Base everything on the evaluation, the plan, the story map, and the wireframes. Put anything undecided in an open question instead of inventing it.`

export const SRS_WRITEUP = `Now write the SRS up for the user, in Markdown:
## Requirements specification
### Scope
In and out of scope.
### Features
Each feature with its priority and its requirements (FR ids from the server, as listed above), each with its acceptance criteria.
### Quality requirements
The non-functional requirements with their measures.
### Data
The entities and their key fields.
### Traceability and open questions
Which stories each feature covers (and any the server says are uncovered), then the open questions.
Then give the link: the full document, laid out as a printable SRS, opens from the Hand-off page.`
