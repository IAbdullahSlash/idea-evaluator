import type { LinearPlan, PlannedIssue } from '@/lib/linear/plan'

/**
 * Linear's GraphQL API, as the person who connected their workspace: the
 * OAuth steps (authorization code with PKCE), their teams, and building a
 * roadmap from a LinearPlan.
 *
 * The site registers one OAuth app (LINEAR_CLIENT_ID, LINEAR_CLIENT_SECRET).
 * Its callback URL is <site>/api/linear/callback, for each site it runs on.
 */

const API = 'https://api.linear.app/graphql'
export const AUTHORIZE_URL = 'https://linear.app/oauth/authorize'
const TOKEN_URL = 'https://api.linear.app/oauth/token'
const REVOKE_URL = 'https://api.linear.app/oauth/revoke'

/** The cookies the connection keeps, all httpOnly and scoped to /api/linear. */
export const COOKIE = { token: 'linear_token', state: 'linear_state', verifier: 'linear_verifier', returnTo: 'linear_return' } as const

export function linearConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.LINEAR_CLIENT_ID
  const clientSecret = process.env.LINEAR_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

/** A failed call, with a message fit to show the person. */
export class LinearError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

// ── OAuth ────────────────────────────────────────────────────────────────

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url')

export const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)))

/** The S256 code challenge for a PKCE verifier. */
export async function codeChallenge(verifier: string): Promise<string> {
  return base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

export async function exchangeCode(code: string, verifier: string, redirectUri: string): Promise<{ accessToken: string; expiresIn: number }> {
  const config = linearConfig()
  if (!config) throw new LinearError('Linear is not set up on this site.', 503)
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: verifier,
    }),
  })
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null
  if (!response.ok || !data?.access_token) throw new LinearError('Linear didn’t accept the sign-in. Please connect again.', 502)
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 86_399 }
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
}

// ── GraphQL ──────────────────────────────────────────────────────────────

async function gql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new LinearError('Couldn’t reach Linear. Please try again.', 502)
  }
  const body = (await response.json().catch(() => null)) as {
    data?: T
    errors?: { message: string; extensions?: { userPresentableMessage?: string; code?: string } }[]
  } | null
  if (response.status === 401 || body?.errors?.some((e) => e.extensions?.code === 'AUTHENTICATION_ERROR')) {
    throw new LinearError('The connection to Linear has expired. Please connect again.', 401)
  }
  if (!response.ok || body?.errors?.length || !body?.data) {
    const reason = body?.errors?.[0]?.extensions?.userPresentableMessage || body?.errors?.[0]?.message
    throw new LinearError(reason ? `Linear said: ${reason}` : 'Linear couldn’t do that. Please try again.', 502)
  }
  return body.data
}

export interface LinearTeam {
  id: string
  name: string
  key: string
}

/** The person's workspace and the teams they can create issues in. */
export async function workspace(token: string): Promise<{ name: string; teams: LinearTeam[] }> {
  const data = await gql<{ organization: { name: string }; teams: { nodes: LinearTeam[] } }>(
    token,
    `query { organization { name } teams(first: 50) { nodes { id name key } } }`
  )
  return { name: data.organization.name, teams: data.teams.nodes }
}

// ── building the roadmap ─────────────────────────────────────────────────

export interface PushResult {
  initiative?: { name: string; url: string }
  projects: { name: string; url: string }[]
  issues: number
}

/** A label for the roadmap's issues, reused if the team or workspace already has it. */
async function label(token: string, teamId: string, name: string, color: string): Promise<string | undefined> {
  try {
    const found = await gql<{ issueLabels: { nodes: { id: string; team: { id: string } | null }[] } }>(
      token,
      `query($name: String!) { issueLabels(filter: { name: { eq: $name } }, first: 20) { nodes { id team { id } } } }`,
      { name }
    )
    const usable = found.issueLabels.nodes.find((l) => !l.team || l.team.id === teamId)
    if (usable) return usable.id
    const made = await gql<{ issueLabelCreate: { issueLabel: { id: string } } }>(
      token,
      `mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { issueLabel { id } } }`,
      { input: { name, color, teamId } }
    )
    return made.issueLabelCreate.issueLabel.id
  } catch (error) {
    // Labels are a nicety: without one the issues are still created
    if (error instanceof LinearError && error.status === 401) throw error
    return undefined
  }
}

/** Issues in batches, so a plan with many deliverables stays within Linear's request limits. */
async function createIssues(token: string, issues: Record<string, unknown>[]): Promise<number> {
  let made = 0
  for (let i = 0; i < issues.length; i += 25) {
    const data = await gql<{ issueBatchCreate: { issues: { id: string }[] } }>(
      token,
      `mutation($input: IssueBatchCreateInput!) { issueBatchCreate(input: $input) { issues { id } } }`,
      { input: { issues: issues.slice(i, i + 25) } }
    )
    made += data.issueBatchCreate.issues.length
  }
  return made
}

/**
 * Create the roadmap in a team. Each step builds on the one before; if one
 * fails part-way, the error says what was already created.
 */
export async function pushPlan(token: string, teamId: string, plan: LinearPlan): Promise<PushResult> {
  const result: PushResult = { projects: [], issues: 0 }
  try {
    const [storyLabel, deliverableLabel] = await Promise.all([label(token, teamId, 'User story', '#4ea7fc'), label(token, teamId, 'Deliverable', '#bec2c8')])
    const labelsFor = (issue: PlannedIssue) => {
      const id = issue.kind === 'story' ? storyLabel : deliverableLabel
      return id ? [id] : undefined
    }
    const asInput = (issue: PlannedIssue, extra: Record<string, unknown>) => ({
      teamId,
      title: issue.title,
      description: issue.description,
      ...(issue.dueDate ? { dueDate: issue.dueDate } : {}),
      ...(labelsFor(issue) ? { labelIds: labelsFor(issue) } : {}),
      ...extra,
    })

    // The initiative groups the versions on the roadmap; a workspace that can't make one still gets the projects
    let initiativeId: string | undefined
    try {
      const made = await gql<{ initiativeCreate: { initiative: { id: string; name: string; url: string } } }>(
        token,
        `mutation($input: InitiativeCreateInput!) { initiativeCreate(input: $input) { initiative { id name url } } }`,
        { input: plan.initiative }
      )
      initiativeId = made.initiativeCreate.initiative.id
      result.initiative = { name: made.initiativeCreate.initiative.name, url: made.initiativeCreate.initiative.url }
    } catch (error) {
      if (error instanceof LinearError && error.status === 401) throw error
    }

    for (const p of plan.projects) {
      const made = await gql<{ projectCreate: { project: { id: string; name: string; url: string } } }>(
        token,
        `mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { project { id name url } } }`,
        { input: { name: p.name, description: p.description, content: p.content, startDate: p.startDate, targetDate: p.targetDate, teamIds: [teamId] } }
      )
      const project = made.projectCreate.project
      result.projects.push({ name: project.name, url: project.url })
      if (initiativeId) {
        await gql(
          token,
          `mutation($input: InitiativeToProjectCreateInput!) { initiativeToProjectCreate(input: $input) { success } }`,
          { input: { initiativeId, projectId: project.id } }
        ).catch(() => undefined)
      }

      const issues: Record<string, unknown>[] = []
      for (const m of p.milestones) {
        const milestone = await gql<{ projectMilestoneCreate: { projectMilestone: { id: string } } }>(
          token,
          `mutation($input: ProjectMilestoneCreateInput!) { projectMilestoneCreate(input: $input) { projectMilestone { id } } }`,
          { input: { projectId: project.id, name: m.name, description: m.description, targetDate: m.targetDate } }
        )
        issues.push(...m.issues.map((i) => asInput(i, { projectId: project.id, projectMilestoneId: milestone.projectMilestoneCreate.projectMilestone.id })))
      }
      issues.push(...p.issues.map((i) => asInput(i, { projectId: project.id })))
      result.issues += await createIssues(token, issues)
    }

    result.issues += await createIssues(token, plan.later.map((i) => asInput(i, {})))
    return result
  } catch (error) {
    const done = result.projects.length
      ? ` Already created: ${[result.initiative?.name, ...result.projects.map((p) => p.name)].filter(Boolean).join(', ')} and ${result.issues} issues.`
      : ''
    if (error instanceof LinearError) throw new LinearError(`${error.message}${done}`, error.status)
    throw new LinearError(`Something went wrong while building the roadmap.${done}`, 500)
  }
}
