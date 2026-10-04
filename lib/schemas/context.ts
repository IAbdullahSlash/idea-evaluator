/**
 * The four questions asked alongside the idea. All are required: the marking,
 * the plan's timeline, and its sizing all depend on them. Shared by the form
 * and the API so both accept the same answers.
 */

export interface ContextQuestion {
  id: 'projectType' | 'domain' | 'experience' | 'timeline'
  label: string
  options: { value: string; label: string }[]
}

export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: 'projectType',
    label: 'What is it for?',
    options: [
      { value: 'MVP', label: 'MVP' },
      { value: 'Full Product', label: 'Full product' },
      { value: 'Prototype', label: 'Prototype' },
      { value: 'API/Service', label: 'API / service' },
      { value: 'Mobile App', label: 'Mobile app' },
      { value: 'Web App', label: 'Web app' },
    ],
  },
  {
    id: 'domain',
    label: 'Domain',
    options: [
      { value: 'AI/ML', label: 'AI / machine learning' },
      { value: 'FinTech', label: 'FinTech' },
      { value: 'EdTech', label: 'EdTech' },
      { value: 'HealthTech', label: 'HealthTech' },
      { value: 'E-commerce', label: 'E-commerce' },
      { value: 'SaaS', label: 'SaaS' },
      { value: 'Social', label: 'Social' },
      { value: 'Gaming', label: 'Gaming' },
      { value: 'Productivity', label: 'Productivity' },
      { value: 'IoT', label: 'IoT' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    id: 'experience',
    label: 'Your experience',
    options: [
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Intermediate', label: 'Intermediate' },
      { value: 'Advanced', label: 'Advanced' },
    ],
  },
  {
    id: 'timeline',
    label: 'Time you have',
    options: [
      { value: '1-2 weeks', label: '1–2 weeks' },
      { value: '1-2 months', label: '1–2 months' },
      { value: '3-6 months', label: '3–6 months' },
      { value: '6+ months', label: '6+ months' },
    ],
  },
]

/** The questions whose answer is missing or not one of the options. */
export function missingContext(answers: Partial<Record<ContextQuestion['id'], unknown>>): ContextQuestion[] {
  return CONTEXT_QUESTIONS.filter((q) => !q.options.some((o) => o.value === answers[q.id]))
}
