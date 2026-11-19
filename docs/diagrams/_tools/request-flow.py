#!/usr/bin/env python3
"""Generates docs/diagrams/request-flow.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'request-flow.svg')
d = Diagram(2000, 860, 'Request flow',
            'One API call crosses proxy.ts, a thin route, a service and a repository; no layer throws, a Result travels back to handleError.')

# observability on top
d.node(380, 120, 880, 70, 'Axiom', 'request logs from proxy.ts and withAxiom, audit events from services', C['dark'])

d.group(360, 235, 1230, 340, 'NEXT APP')
Y, H = 290, 110
FW, RT = Y + 35, Y + 85          # forward lane, return lane
d.node(50, Y, 200, H, 'Client', 'browser or API consumer', C['dark'])
d.compute(380, Y, 200, H, 'proxy.ts', 'edge entry point')
d.compute(710, Y, 200, H, 'API route', 'app/api/**/route.ts')
d.compute(1040, Y, 200, H, 'Service', 'src/services')
d.compute(1370, Y, 200, H, 'Repository', 'src/repositories')
d.node(1700, Y, 200, H, 'PostgreSQL', 'through Prisma', C['red'])

fw = [(250, 380, '1. request'), (580, 710, '2. allowed'), (910, 1040, '3. call'),
      (1240, 1370, '4. call'), (1570, 1700, '5. query')]
for x1, x2, t in fw:
    d.path([(x1, FW), (x2, FW)], 'purple')
    d.pill((x1 + x2) / 2, FW - 22, t, 'purple')
rt = [(1700, 1570, '6. rows'), (1370, 1240, '7. Result'), (1040, 910, '8. Result'),
      (710, 580, '9. envelope'), (380, 250, '10. reply')]
for x1, x2, t in rt:
    d.path([(x1, RT), (x2, RT)], 'blue')
    d.pill((x1 + x2) / 2, RT + 22, t, 'blue')

# logs up to Axiom
for cx, t in [(530, None), (810, None), (1140, None)]:
    d.path([(cx, Y), (cx, 190)], 'gray')
d.pill(530, 214, 'log', 'gray')
d.pill(810, 214, 'log', 'gray')
d.pill(1140, 214, 'audit', 'gray')

# Redis below, through the gaps
d.node(900, 650, 500, 80, 'Redis', 'rate-limit counters · read-through caches', C['red'])
d.path([(890, Y + H), (890, 420), (975, 420), (975, 650)], 'orange')
d.pill(975, 600, 'rate limit', 'orange')
d.path([(1220, Y + H), (1220, 420), (1305, 420), (1305, 650)], 'orange')
d.pill(1305, 600, 'caches', 'orange')

# notes under the nodes
def notes(cx, lines, col='#475569'):
    for i, t in enumerate(lines):
        d.note(cx, 440 + i * 22, t, col=col)
notes(480, ['CSP and HSTS headers', 'session cookie present?', 'consent in cookie cache?', 'no: 401 (api) or redirect'])
notes(810, ['withAxiom', 'getAuthSession()', 'consume(apiLimiter, user:id)', 'requireConsent (opt-in)', 'Zod safeParse of the body'])
notes(1140, ['authorization: ownership', 'business rules', 'auditMutation / auditAuth'])
notes(1470, ['Prisma inside try/catch', 'ok(value) or err(...)', 'no business rules'])
d.note(1800, 440, 'Prisma 7 client', col='#475569')

# error path
d.group(40, 620, 820, 190, 'ERROR PATH · NO THROWN ERRORS')
ex = [(60, 'AppError', 'code from ERROR_CODES'), (330, 'handleError', 'code maps to HTTP status'),
      (600, 'Response', 'success, statusCode, error')]
for x, t, s in ex:
    d.compute(x, 670, 220, 80, t, s)
d.path([(280, 710), (330, 710)], 'blue')
d.path([(550, 710), (600, 710)], 'blue')
d.note(450, 785, 'RATE_LIMITED also sets Retry-After', col='#475569')
d.save(OUT)
