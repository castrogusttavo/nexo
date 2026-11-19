#!/usr/bin/env python3
"""Generates docs/diagrams/er-model.svg (14 core models out of prisma/schema.prisma)."""
import os
from lib import Diagram, C, LILAC_TEXT

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'er-model.svg')
d = Diagram(2000, 910, 'Data model',
            '14 core models out of the 54 in prisma/schema.prisma, grouped by domain; join tables, preferences, status, careers and the rest are left out.')

d.group(20, 125, 300, 475, 'IDENTITY')
d.group(340, 125, 680, 725, 'WORKSPACE · MEMBERS, BILLING, WIKI')
d.group(1060, 125, 930, 725, 'PROJECT SCOPE · WORK ITEMS')


def ent(x, y, w, title, fields, root=False):
    if root:
        d.entity(x, y, w, title, fields, C['green'])
    else:
        d.entity(x, y, w, title, fields, C['lilac'], LILAC_TEXT)


def card(x, y, t='1'):
    d.pill(x, y, t, 'gray')


def rel(pts, a, b):
    """Dashed line with a cardinality pill at each end (a near start, b near end)."""
    d.path(pts, 'gray', arrow=False)
    (x1, y1), (x2, y2) = pts[0], pts[1]
    sx = x1 + (20 if x2 > x1 else -20) if y1 == y2 else x1
    sy = y1 if y1 == y2 else y1 + (16 if y2 > y1 else -16)
    card(sx, sy, a)
    (x3, y3), (x4, y4) = pts[-2], pts[-1]
    ex = x4 - (20 if x4 > x3 else -20) if y3 == y4 else x4
    ey = y4 if y3 == y4 else y4 - (16 if y4 > y3 else -16)
    card(ex, ey, b)


# identity
ent(40, 170, 240, 'User', ['id', 'email', 'acceptedTermsAt', 'acceptedPrivacyAt', 'deletionScheduledAt'], True)
ent(40, 420, 240, 'Session', ['id', 'token', 'expiresAt', 'userId (FK)'])
rel([(160, 323), (160, 420)], '1', 'N')

# workspace
ent(360, 170, 240, 'Membership', ['id', 'role', 'userId (FK)', 'workspaceId (FK)'])
ent(760, 170, 240, 'Workspace', ['id', 'name', 'slug', 'activePlan', 'trialEndsAt'], True)
ent(360, 420, 240, 'WorkspaceInvitation', ['id', 'email', 'status', 'expiresAt', 'workspaceId (FK)'])
ent(760, 400, 240, 'WikiPage', ['id', 'title', 'parentId (self)', 'workspaceId (FK)', 'archivedAt'])
ent(760, 640, 240, 'Subscription', ['id', 'plan', 'status', 'seats', 'workspaceId (FK)'])
rel([(280, 205), (360, 205)], '1', 'N')
rel([(760, 205), (600, 205)], '1', 'N')
rel([(760, 255), (650, 255), (650, 470), (600, 470)], '1', 'N')
rel([(760, 300), (700, 300), (700, 700), (760, 700)], '1', 'N')
rel([(880, 323), (880, 400)], '1', 'N')

# project scope
ent(1080, 170, 260, 'State', ['id', 'name', 'group', 'projectId (FK)'])
ent(1080, 400, 260, 'Project', ['id', 'slug', 'identifier', 'workspaceId (FK)', 'archivedAt'], True)
ent(1080, 680, 260, 'IssueType', ['id', 'name', 'isSystem', 'projectId (FK)'])
ent(1420, 170, 280, 'Cycle', ['id', 'name', 'status', 'projectId (FK)'])
ent(1420, 400, 280, 'Issue', ['id', 'number', 'title', 'priority', 'stateId · typeId (FK)',
                              'cycleId · moduleId (FK)', 'parentId (self)'], True)
ent(1420, 680, 280, 'Module', ['id', 'name', 'status', 'projectId (FK)'])
ent(1780, 400, 180, 'Comment', ['id', 'issueId (FK)', 'parentId (self)', 'authorId (FK)'])
rel([(1000, 205), (1040, 205), (1040, 450), (1080, 450)], '1', 'N')
rel([(1210, 400), (1210, 302)], '1', 'N')
rel([(1210, 553), (1210, 680)], '1', 'N')
rel([(1340, 415), (1380, 415), (1380, 230), (1420, 230)], '1', 'N')
rel([(1340, 525), (1380, 525), (1380, 740), (1420, 740)], '1', 'N')
rel([(1340, 468), (1420, 468)], '1', 'N')
rel([(1560, 302), (1560, 400)], '1', 'N')
rel([(1560, 680), (1560, 595)], '1', 'N')
rel([(1700, 450), (1780, 450)], '1', 'N')

d.note(1525, 875, 'Issue also points at State and IssueType (stateId, typeId); those lines are not drawn.')
d.note(170, 640, 'green = aggregate root', col=C['green'])
d.note(170, 662, '(self) = self-reference')
d.note(170, 684, '(FK) = foreign key')
d.note(170, 706, '1 = one · N = many')
d.save(OUT)
