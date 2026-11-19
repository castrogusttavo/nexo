#!/usr/bin/env python3
"""Generates docs/diagrams/deploy-pipeline.svg (from .husky, ci.yml and cd.yml)."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'deploy-pipeline.svg')
d = Diagram(2000, 900, 'From commit to production',
            'Trunk-based: hooks fail fast on the machine, CI is the gate on main, and CD only runs after a green CI.')

# local
d.group(20, 125, 340, 620, 'LOCAL · HUSKY HOOKS')
d.node(40, 170, 300, 70, 'git commit', 'straight on main', C['dark'])
d.compute(40, 310, 300, 90, 'pre-commit', 'biome check:staged · tsc x2')
d.compute(40, 470, 300, 80, 'commit-msg', 'commitlint')
d.node(40, 620, 300, 70, 'git push origin main', 'a pull request also runs CI', C['dark'])
d.path([(190, 240), (190, 310)], 'purple')
d.pill(190, 275, '1. hook', 'purple')
d.path([(190, 400), (190, 470)], 'purple')
d.pill(190, 435, '2. hook', 'purple')
d.path([(190, 550), (190, 620)], 'purple')
d.pill(190, 585, '3. passed', 'purple')

# CI
d.group(420, 125, 870, 720, 'CI · CI.YML · PUSH TO MAIN AND PULL REQUEST')
jobs = [('Lint & Type Check', 'tsc x2 · biome lint'), ('OpenAPI Contract Tests', 'reads files only'),
        ('E2E Tests', 'api and browser suites'), ('Unit & Integration', 'test:coverage'),
        ('Component Tests', '3 shards'), ('Redis TLS Smoke', 'vitest redis-tls project'),
        ('Semgrep SAST', 'static analysis'), ('Secret Scan', 'gitleaks')]
ys = [185 + 66 * i for i in range(len(jobs))]
for (t, s), y in zip(jobs, ys):
    d.compute(480, y, 250, 54, t, s)
    d.path([(455, y + 27), (480, y + 27)], 'purple')
    d.path([(730, y + 27), (760, y + 27)], 'purple', arrow=False)
d.path([(455, ys[0] + 27), (455, 655)], 'purple', arrow=False)
d.path([(340, 655), (455, 655)], 'purple', arrow=False)
d.path([(760, ys[0] + 27), (760, ys[-1] + 27)], 'purple', arrow=False)
d.path([(760, 295), (830, 295)], 'purple')
d.node(830, 250, 220, 90, 'CI Gate', 'needs the 8 jobs', C['green'])
d.node(830, 400, 220, 70, 'Slack', 'alert if the gate fails', C['dark'])
d.path([(940, 340), (940, 400)], 'red')
d.pill(940, 370, 'if it fails', 'red')
d.group(780, 530, 490, 285, 'ADVISORY · NOT IN THE GATE', lc='#64748B')
for y, t, s in [(585, 'Dependency Audit', 'pnpm audit · continue-on-error'),
                (655, 'Snyk Security Scan', 'continue-on-error'),
                (725, 'LPA2v Triage', 'after Semgrep · continue-on-error')]:
    d.compute(810, y, 300, 54, t, s)

# CD
d.group(1330, 125, 660, 745, 'CD · CD.YML · ONLY AFTER A GREEN CI RUN')
d.path([(1050, 295), (1310, 295), (1310, 205), (1360, 205)], 'green')
d.pill(1180, 295, '4. CI succeeded', 'green')
d.compute(1360, 170, 280, 70, 'workflow_run', 'CI completed on main, success')
d.compute(1360, 310, 280, 70, 'migrate', 'prisma migrate deploy')
d.path([(1500, 240), (1500, 310)], 'purple')
d.compute(1360, 610, 280, 70, 'Tag & Release', 'CalVer tag + GitHub Release')
d.path([(1500, 380), (1500, 610)], 'purple')
d.note(1515, 490, 'release waits for', anchor='start')
d.note(1515, 510, 'migrate and deploy', anchor='start')

steps = [('Build image', 'Docker, NEXT_PUBLIC build args'), ('Trivy scan', 'fails on fixable CRITICAL'),
         ('Push to GHCR', 'sha and latest tags'), ('Decrypt secrets', 'sops, production env file'),
         ('Rolling restart', 'worker, realtime, app 1 to 7')]
sy = [170, 280, 390, 500, 610]
for (t, s), y in zip(steps, sy):
    d.compute(1700, y, 260, 70, t, s)
for a, b in zip(sy, sy[1:]):
    d.path([(1830, a + 70), (1830, b)], 'purple')
d.path([(1640, 205), (1700, 205)], 'purple')
d.path([(1700, 645), (1640, 645)], 'purple')
d.node(1700, 750, 260, 80, 'Production', 'nexopm.com', C['green'])
d.path([(1830, 680), (1830, 750)], 'green')
d.pill(1830, 715, '5. live', 'green')
d.note(1500, 760, 'each app instance must turn healthy', col='#475569')
d.note(1500, 780, 'within 90 s or the rollout stops')
d.note(1500, 810, 'notify-slack reports migrate and deploy', col='#475569')
d.save(OUT)
