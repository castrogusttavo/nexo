#!/usr/bin/env python3
"""Generates docs/diagrams/issue-lifecycle.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'issue-lifecycle.svg')
d = Diagram(2000, 1080, 'Issue lifecycle',
            'An issue is created and changed through IssueService; every changed field lands in the activity log, and the issue points at its state, cycle, module and people.')
LT = '#3B37A8'

d.label(40, 130, 'CREATE')
d.node(40, 160, 200, 80, 'Project member', 'privileged, lead or member', C['dark'])
d.compute(300, 160, 230, 80, 'POST .../issues', 'withAxiom · rate limit')
d.compute(590, 160, 260, 80, 'IssueService.create', 'authz + validation')
d.compute(910, 160, 260, 80, 'IssueRepository.create', 'one transaction')
d.node(1230, 160, 260, 80, 'Issue', 'number = issueSequence + 1', C['red'])
for i, (a, b) in enumerate([(240, 300), (530, 590), (850, 910), (1170, 1230)]):
    d.path([(a, 200), (b, 200)], 'purple')
    d.pill((a + b) / 2, 180, str(i + 1), 'purple')
for i, t in enumerate(['state, type, cycle, module: same project', 'type defaults to the system "Task"',
                       'parent: same project, no cycle', 'dueDate not before startDate']):
    d.note(720, 266 + i * 20, t, col=LT)
d.note(1360, 266, 'then IssueListCache.invalidate', col=LT)
d.note(1360, 286, 'and auditMutation (issue create)', col=LT)

d.label(40, 370, 'CHANGE · THE ACTIVITY LOG')
d.node(40, 400, 200, 80, 'Project member', 'PATCH issue', C['dark'])
d.compute(300, 400, 230, 80, 'PATCH .../issues/:id', 'withAxiom · rate limit')
d.compute(590, 400, 260, 80, 'IssueService.update', 'same checks as create')
d.compute(910, 400, 260, 80, 'recordFieldChanges', 'diff before / after')
d.node(1230, 400, 260, 80, 'Activity', 'ISSUE · field · old · new', C['red'])
for i, (a, b) in enumerate([(240, 300), (530, 590), (850, 910), (1170, 1230)]):
    d.path([(a, 440), (b, 440)], 'orange')
    d.pill((a + b) / 2, 420, str(i + 1), 'orange')
d.note(720, 506, 'Issue row updated first', col=LT)
d.note(1040, 506, 'one entry per changed field:', col=LT)
d.note(1040, 526, 'state · type · priority · dates', col=LT)
d.note(1040, 546, 'cycle · module · estimate · parent', col=LT)
d.note(1360, 506, 'assign / unassign: audit only,', col=LT)
d.note(1360, 526, 'not written to Activity', col=LT)
d.note(1740, 440, 'delete is soft: Issue.deletedAt', col=LT)

d.label(40, 590, 'WHAT AN ISSUE POINTS TO')
LANE = 640
d.entity(40, 665, 300, 'Issue', ['stateId  (required)', 'typeId', 'priority  NONE..URGENT', 'cycleId?  moduleId?', 'estimateValueId?', 'parentId?  (sub-issues)', 'authorId?', 'deletedAt?  (soft delete)'], C['purple'])
d.entity(440, 665, 280, 'State', ['name', 'group  (5 groups)', 'isDefault', 'order', 'projectId'], C['green'])
d.entity(780, 665, 280, 'Cycle', ['name', 'status', 'startDate · endDate', 'leadId?'], C['blue'])
d.entity(1120, 665, 280, 'Module', ['name', 'status · progress', 'startDate · endDate', 'leadId?'], C['blue'])
d.entity(1460, 665, 240, 'IssueAssignee', ['issueId', 'userId', 'unique (issueId, userId)'], C['gray'])
d.entity(1740, 665, 220, 'IssueSubscriber', ['issueId', 'userId', 'unique (issueId, userId)'], C['gray'])
d.path([(190, 665), (190, LANE), (580, LANE), (580, 665)], 'purple')
d.path([(580, LANE), (920, LANE), (920, 665)], 'purple')
d.path([(920, LANE), (1260, LANE), (1260, 665)], 'purple')
d.path([(1260, LANE), (1580, LANE), (1580, 665)], 'purple')
d.path([(1580, LANE), (1850, LANE), (1850, 665)], 'purple')
d.pill(580, LANE, 'stateId', 'purple')
d.pill(920, LANE, 'cycleId', 'purple')
d.pill(1260, LANE, 'moduleId', 'purple')
d.pill(1580, LANE, 'assignees', 'purple')
d.pill(1850, LANE, 'subscribers', 'purple')
d.note(580, 860, 'BACKLOG · UNSTARTED · STARTED', col=LT)
d.note(580, 880, 'COMPLETED · CANCELLED', col=LT)
d.note(920, 830, 'at most one cycle, one module', col=LT)
d.note(920, 850, 'deleting either sets the field to null', col=LT)
d.note(1580, 800, 'assignee must be a project member', col=LT)
d.note(1580, 820, 'assigning also subscribes them', col=LT)

d.label(1440, 880, 'NOTIFICATIONS')
d.entity(1440, 900, 300, 'NotificationSetting', ['priorityChanges', 'stateChanges', 'comments', 'mentions'], C['gray'])
d.node(1780, 910, 180, 100, 'Delivery', 'to confirm', C['dark'])
d.path([(1850, 780), (1850, 910)], 'gray')
d.note(1600, 1050, 'per-user preferences exist; nothing in the repo sends issue notifications yet', col=LT)
d.path([(1740, 960), (1780, 960)], 'gray')
d.save(OUT)
