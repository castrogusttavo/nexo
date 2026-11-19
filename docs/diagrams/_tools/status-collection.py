#!/usr/bin/env python3
"""Generates docs/diagrams/status-collection.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'status-collection.svg')
d = Diagram(2000, 1030, 'Status collection and alerting',
            'Every minute eight components are probed, stored, turned into incidents, and only the useful transitions reach Slack.')
LT = '#3B37A8'
d.label(40, 130, 'PROBES · StatusService.collect(tier)')
d.node(40, 170, 230, 90, 'Scheduler', 'to confirm: outside the repo', C['dark'])
d.compute(360, 170, 300, 90, 'POST /api/status/collect', '/core and /peripheral')
d.note(510, 282, 'x-status-secret, constant-time compare', col=LT)
d.path([(270, 215), (360, 215)], 'purple')
d.pill(315, 195, '1', 'purple')

d.group(760, 130, 760, 330, 'EIGHT COMPONENTS · 2 TIERS')
core = [('app', 'GET /api/health'), ('database', 'SELECT 1'), ('cache', 'Redis PING'), ('auth', 'getSession')]
per = [('payment', 'AbacatePay list'), ('email', 'Resend domains'), ('storage', 'S3 ListBuckets'), ('jobs', 'workers + backlog')]
d.note(960, 188, 'core', col=LT)
d.note(1330, 188, 'peripheral', col=LT)
for i, (n, s) in enumerate(core):
    d.compute(790, 205 + i * 60, 340, 50, n, s)
for i, (n, s) in enumerate(per):
    d.compute(1150, 205 + i * 60, 340, 50, n, s)
d.path([(660, 215), (790, 215)], 'purple')
d.note(1140, 482, 'per-component budgets · timeout 5 to 8 s · one retry', col=LT)

d.compute(1620, 205, 340, 90, 'Smoothing', '3 slow samples in a row: DEGRADED')
d.path([(1520, 250), (1620, 250)], 'purple')
d.pill(1570, 225, '2', 'purple')
d.node(1620, 400, 340, 90, 'HealthCheck', 'one row per component per run', C['red'])
d.path([(1790, 295), (1790, 400)], 'purple')
d.pill(1790, 348, '3', 'purple')

d.label(40, 540, 'PERSIST AND INCIDENTS')
d.node(1620, 560, 340, 90, 'ComponentDaily', 'upsert day aggregate · prune 7 d', C['red'])
d.path([(1790, 490), (1790, 560)], 'purple')
d.node(1250, 560, 280, 90, 'Incident', 'open · raise severity · resolve', C['red'])
d.compute(850, 560, 300, 90, 'evaluateIncidentFor', 'compare with previous check')
d.path([(1250, 605), (1150, 605)], 'orange')
d.path([(1620, 475), (1390, 475), (1390, 560)], 'orange')
d.pill(1390, 518, '4', 'orange')
d.node(1250, 700, 280, 80, 'StatusCache', 'read by /status · reset each run', C['orange'])
d.path([(1790, 650), (1790, 740), (1530, 740)], 'orange')

d.label(40, 700, 'ALERTS')
d.compute(40, 810, 300, 90, 'decideComponentAlert', 'replays 3 h of HealthCheck')
d.path([(1000, 650), (1000, 700), (190, 700), (190, 810)], 'orange')
d.pill(600, 700, '5 transition', 'orange')
d.compute(440, 810, 330, 90, 'Flap suppression', '4th change in 30 min: unstable')
d.path([(340, 855), (440, 855)], 'orange')
d.compute(870, 810, 330, 90, 'Outage reminder', 'every 6 h while incident is open')
d.path([(770, 855), (870, 855)], 'orange')
d.node(1330, 810, 280, 90, 'Slack', 'webhook, 3 s timeout, never throws', C['dark'])
d.path([(1200, 855), (1330, 855)], 'red')
d.pill(1265, 835, '6', 'red')
d.path([(605, 900), (605, 990), (1470, 990), (1470, 900)], 'red')
d.pill(1000, 990, 'unstable / stabilized', 'red')
d.note(40, 930, '"stabilized" after 15 min in one state', anchor='start', col=LT)
d.note(40, 950, 'at most five messages per flapping episode', anchor='start', col=LT)
d.note(1960, 860, 'a failed collect (DB down) also alerts', anchor='end', col=LT)
d.save(OUT)
