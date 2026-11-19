#!/usr/bin/env python3
"""Generates docs/diagrams/private-access.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'private-access.svg')
d = Diagram(2000, 910, 'Private page access',
            'The proxy only guesses from cookies; the real gate sits in the data access layer, next to the data, never in a layout.')

# edge
d.group(210, 125, 520, 470, 'PROXY.TS · OPTIMISTIC, NO DATABASE')
d.node(235, 170, 210, 80, 'No session cookie', '401 for /api, else /sign-in', C['red'])
d.node(480, 170, 230, 80, 'Terms not accepted', 'signed cookie cache says so', C['red'])
d.node(40, 400, 140, 100, 'Browser', 'page GET', C['dark'])
d.compute(330, 400, 230, 100, 'proxy.ts', 'cookie check')
d.path([(180, 450), (330, 450)], 'purple')
d.pill(255, 425, '1. request', 'purple')
d.path([(400, 400), (400, 250)], 'red')
d.pill(400, 300, 'no cookie', 'red')
d.path([(500, 400), (500, 250)], 'red')
d.pill(500, 360, 'consent missing', 'red')
for i, t in enumerate(['reads cookies only, never the database', 'PUBLIC_ROUTES skip the check',
                       'consent redirect: page GETs only']):
    d.note(445, 530 + i * 20, t)

# page
d.compute(790, 400, 220, 100, 'Server component', 'page under (private)')
d.path([(560, 450), (790, 450)], 'purple')
d.pill(675, 425, '2. passes', 'purple')
d.note(900, 530, 'getProjectContext and', col='#3B37A8')
d.note(900, 550, 'getWikiContext call the DAL', col='#3B37A8')

# DAL
d.group(1170, 125, 360, 635, 'DAL · SRC/LIB/DAL.TS', col='#5B54D6', lc='#3B37A8')
d.node(1200, 170, 300, 90, 'getCurrentUser()', 'Better Auth session', C['green'])
d.node(1200, 340, 300, 90, 'requireConsentedUser(res)', 'session + consent in Postgres', C['green'])
d.node(1200, 480, 300, 230, 'requireMembership(slug)', 'session + consent + membership', C['green'])
d.note(1350, 290, 'use cache: private on each check')
d.note(1350, 310, 'runs on every server request')
d.note(1350, 458, 'client router keeps it 5 min')
for y in (215, 385, 595):
    d.path([(1110, y), (1200, y)], 'purple')
d.path([(1010, 450), (1110, 450)], 'purple')
d.path([(1110, 215), (1110, 595)], 'purple', arrow=False)
d.pill(1110, 450, '3. call', 'purple')

# outcomes
OX, OW = 1640, 310
outs = [(215, '/sign-in', 'redirect · no session', 'no session'),
        (385, '/onboarding/consent-setup', 'redirect · terms not accepted', 'no consent'),
        (525, 'onboardingDestination', 'redirect · onboarding unfinished', 'step pending'),
        (595, '/create-workspace', 'redirect · no workspace yet', 'no workspace'),
        (665, '404', 'notFound() · not a member', 'not a member')]
for cy, t, s, p in outs:
    d.node(OX, cy - 30, OW, 60, t, s, C['red'])
    d.path([(1500, cy), (OX, cy)], 'red')
    d.pill(1570, cy - 20 if cy in (525, 665) else cy - 22, p, 'red')
d.node(OX, 770, OW, 60, 'Page renders', 'user and membership returned', C['green'])
d.path([(1350, 710), (1350, 800), (OX, 800)], 'green')
d.pill(1495, 800, 'ok', 'green')
d.note(1795, 862, 'access.e2e.test.ts checks every')
d.note(1795, 882, 'workspace page from outside')

# rejected
d.group(40, 640, 860, 220, 'REJECTED · A GATE IN A LAYOUT', col='#D1495B', lc='#B13A4A')
d.node(70, 700, 220, 80, 'redirect() in layout', 'layout.tsx', C['red'])
d.node(360, 700, 220, 80, 'Children still render', 'layouts render in parallel', C['red'])
d.node(650, 700, 220, 80, 'Data in the payload', 'a real STR-61 leak', C['red'])
d.path([(290, 740), (360, 740)], 'red')
d.path([(580, 740), (650, 740)], 'red')
d.note(470, 820, 'a layout does not re-render on navigation either')
d.note(470, 842, 'so it is not a security boundary')
d.save(OUT)
