import type { ComponentStatus } from '@prisma/client'
import {
  formatAlertDuration,
  formatAlertTime,
  sanitizeAlertText,
  sendSlackAlert,
} from '@/src/lib/alerts/slack'
import { COMPONENTS_BY_KEY, type ComponentKey, STATUS_RANK } from './components'

/**
 * Slack alerts for status components.
 *
 * TRIGGER. `evaluateIncidentFor` (status.service.ts) reports a transition
 * whenever the incident lifecycle moves: incident opened, severity raised,
 * severity lowered, incident resolved. The lifecycle has no hysteresis -- one
 * bad probe opens an incident, one good probe closes it -- so without a filter
 * a component whose latency hovers around the 1500ms DEGRADED threshold would
 * open and close an incident, and post a message, every minute.
 *
 * FLAPPING RULE. Decided per component from its own recent checks
 * (`health_checks`, which the collector already writes), so it survives
 * restarts and needs no extra table or Redis key -- Redis being one of the
 * components that can go down:
 *
 *   - Every state change is a transition. The first
 *     `FLAP_TRANSITION_THRESHOLD - 1` (3) transitions inside a sliding
 *     `FLAP_WINDOW_MS` (30 min) are announced normally.
 *   - The 4th transition inside the window is announced once as "instável"
 *     instead, and the component goes quiet: further transitions (and the
 *     incidents they still open and close on the status page) post nothing.
 *   - Once the component has held a single state for `STABLE_PERIOD_MS`
 *     (15 min), one "estabilizou" message says where it settled (recovered, or
 *     stuck degraded/down) and normal alerting resumes.
 *
 * So one episode of flapping costs at most five messages, however long it
 * lasts. The decision replays the last `ALERT_HISTORY_LOOKBACK_MS` of checks;
 * flapping that has lasted longer than that is replayed from a partial
 * history, which re-derives "unstable" early in the replay and so still stays
 * quiet at the current step.
 */

export const FLAP_TRANSITION_THRESHOLD = 4
export const FLAP_WINDOW_MS = 30 * 60_000
export const STABLE_PERIOD_MS = 15 * 60_000
export const ALERT_HISTORY_LOOKBACK_MS = 3 * 60 * 60_000

export const STATUS_PAGE_URL = 'https://nexopm.com/status'

export interface StatusPoint {
  status: ComponentStatus
  at: Date
}

export type AlertDecision =
  | { action: 'none' }
  | { action: 'transition' }
  | { action: 'unstable'; transitions: number }
  | { action: 'suppressed' }
  | { action: 'stabilized'; since: Date }

/**
 * What to post for the newest point, given the component's checks in time
 * order (oldest first, the current check last). Pure: replays the whole
 * series and returns the decision taken at its final step.
 */
export function decideComponentAlert(points: StatusPoint[]): AlertDecision {
  let decision: AlertDecision = { action: 'none' }
  if (points.length < 2) return decision

  let unstable = false
  let recent: number[] = []
  let lastChangeAt = points[0]?.at.getTime() ?? 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    if (!prev || !cur) continue
    const at = cur.at.getTime()

    if (cur.status !== prev.status) {
      lastChangeAt = at
      recent = recent.filter((t) => t > at - FLAP_WINDOW_MS)
      recent.push(at)
      if (unstable) {
        decision = { action: 'suppressed' }
      } else if (recent.length >= FLAP_TRANSITION_THRESHOLD) {
        unstable = true
        decision = { action: 'unstable', transitions: recent.length }
      } else {
        decision = { action: 'transition' }
      }
    } else if (unstable && at - lastChangeAt >= STABLE_PERIOD_MS) {
      unstable = false
      recent = []
      decision = { action: 'stabilized', since: new Date(lastChangeAt) }
    } else {
      decision = { action: 'none' }
    }
  }

  return decision
}

export interface ComponentAlertContext {
  componentKey: ComponentKey
  /** Status at the previous check. */
  from: ComponentStatus
  /** Status now. */
  to: ComponentStatus
  /** When this check ran. */
  at: Date
  /** Start of the open (or just-resolved) incident, when there is one. */
  incidentStartedAt: Date | null
  /** The probe's error text, if it reported one. */
  error: string | null
}

// Owner-facing wording, deliberately plainer than the status page labels.
const STATE_WORDS: Record<ComponentStatus, string> = {
  OPERATIONAL: 'operacional',
  DEGRADED: 'oscilando (desempenho degradado)',
  PARTIAL_OUTAGE: 'com interrupção parcial',
  MAJOR_OUTAGE: 'fora do ar',
  MAINTENANCE: 'em manutenção',
}

const STATE_EMOJI: Record<ComponentStatus, string> = {
  OPERATIONAL: ':large_green_circle:',
  DEGRADED: ':large_yellow_circle:',
  PARTIAL_OUTAGE: ':large_orange_circle:',
  MAJOR_OUTAGE: ':red_circle:',
  MAINTENANCE: ':large_blue_circle:',
}

function componentName(key: ComponentKey): string {
  return COMPONENTS_BY_KEY[key]?.name ?? key
}

function lines(...parts: Array<string | null | false>): string {
  return parts.filter(Boolean).join('\n')
}

function errorLine(error: string | null): string | null {
  return error ? `Erro: \`${sanitizeAlertText(error)}\`` : null
}

const LINK_LINE = `<${STATUS_PAGE_URL}|Abrir página de status>`

function transitionText(ctx: ComponentAlertContext): string {
  const name = `*${componentName(ctx.componentKey)}*`
  const when = formatAlertTime(ctx.at)

  if (ctx.to === 'OPERATIONAL') {
    const started = ctx.incidentStartedAt
    return lines(
      `:white_check_mark: ${name} voltou ao normal`,
      started
        ? `Ficou ${STATE_WORDS[ctx.from]} por ${formatAlertDuration(
            ctx.at.getTime() - started.getTime(),
          )} (de ${formatAlertTime(started)} a ${when})`
        : `Resolvido em ${when}`,
      LINK_LINE,
    )
  }

  const emoji = STATE_EMOJI[ctx.to]
  if (ctx.from === 'OPERATIONAL') {
    return lines(
      `${emoji} ${name} está ${STATE_WORDS[ctx.to]}`,
      `Desde: ${when}`,
      errorLine(ctx.error),
      LINK_LINE,
    )
  }

  const worse = STATUS_RANK[ctx.to] > STATUS_RANK[ctx.from]
  return lines(
    `${emoji} ${name} ${worse ? 'piorou' : 'melhorou, mas ainda não normalizou'}: ${STATE_WORDS[ctx.from]} → ${STATE_WORDS[ctx.to]}`,
    `Mudou às ${when}${
      ctx.incidentStartedAt
        ? ` (incidente aberto desde ${formatAlertTime(ctx.incidentStartedAt)})`
        : ''
    }`,
    errorLine(ctx.error),
    LINK_LINE,
  )
}

/** The message for a decision, or null when nothing should be posted. */
export function componentAlertText(
  decision: AlertDecision,
  ctx: ComponentAlertContext,
): string | null {
  const name = `*${componentName(ctx.componentKey)}*`
  switch (decision.action) {
    case 'none':
    case 'suppressed':
      return null
    case 'transition':
      return transitionText(ctx)
    case 'unstable':
      return lines(
        `:warning: ${name} está instável: ${decision.transitions} mudanças de estado em ${FLAP_WINDOW_MS / 60_000} min`,
        `Agora: ${STATE_WORDS[ctx.to]} (${formatAlertTime(ctx.at)})`,
        errorLine(ctx.error),
        `Alertas deste componente pausados até ficar estável por ${STABLE_PERIOD_MS / 60_000} min.`,
        LINK_LINE,
      )
    case 'stabilized':
      return lines(
        ctx.to === 'OPERATIONAL'
          ? `:white_check_mark: ${name} estabilizou e está operacional`
          : `${STATE_EMOJI[ctx.to]} ${name} estabilizou ${STATE_WORDS[ctx.to]}`,
        `Estável desde ${formatAlertTime(decision.since)}. Alertas retomados.`,
        errorLine(ctx.error),
        LINK_LINE,
      )
  }
}

/** Posts the alert for one component, if the decision calls for one. */
export async function alertComponent(
  decision: AlertDecision,
  ctx: ComponentAlertContext,
): Promise<void> {
  const text = componentAlertText(decision, ctx)
  if (!text) return
  await sendSlackAlert({ event: `status.${decision.action}`, text })
}

/**
 * When the checks themselves cannot be written (the database is down, or the
 * collector cannot reach it) no incident can open, so the lifecycle above
 * never fires -- for the outage that matters most. This covers that gap with
 * one message when collection starts failing and one when it works again.
 *
 * The state is per process (the Next server, or a `status:watch` loop): the
 * database is exactly what is unavailable, and Redis may be too. A restart
 * during the outage costs at most one repeated message.
 */
let collectFailing = false

export function resetCollectFailureAlert(): void {
  collectFailing = false
}

export async function alertCollectFailed(
  reason: string,
  databaseProbeError: string | null,
): Promise<void> {
  if (collectFailing) return
  collectFailing = true
  await sendSlackAlert({
    event: 'status.collect_failed',
    text: lines(
      ':rotating_light: A coleta de status falhou: não foi possível gravar os resultados no banco',
      `Desde: ${formatAlertTime(new Date())}`,
      `Motivo: \`${sanitizeAlertText(reason)}\``,
      databaseProbeError
        ? `Sonda do banco: \`${sanitizeAlertText(databaseProbeError)}\``
        : null,
      'A página de status não será atualizada até isso voltar.',
    ),
  })
}

export async function alertCollectRecovered(): Promise<void> {
  if (!collectFailing) return
  collectFailing = false
  await sendSlackAlert({
    event: 'status.collect_recovered',
    text: lines(
      `:white_check_mark: A coleta de status voltou a funcionar (${formatAlertTime(new Date())})`,
      LINK_LINE,
    ),
  })
}
