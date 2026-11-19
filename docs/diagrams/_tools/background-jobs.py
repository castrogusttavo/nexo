#!/usr/bin/env python3
"""Generates docs/diagrams/background-jobs.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'background-jobs.svg')
d = Diagram(2000, 990, 'Background jobs and failure alarm',
            'Four BullMQ queues, one worker process; every job that dies for good is reported once, by two independent paths.')
LT = '#3B37A8'
d.group(330, 120, 360, 400, 'REDIS · BULLMQ')
d.group(800, 120, 520, 500, 'WORKER · SEPARATE PROCESS')
d.node(40, 245, 220, 80, 'Next app', '7 instances', C['dark'])
qs = [('data-retention', 'cron · 4 jobs', 195), ('account-lifecycle', 'delete-account', 285),
      ('data-export', 'export-user-data', 375), ('trial-lifecycle', 'revert-expired-trials', 465)]
for n, s, cy in qs:
    d.node(360, cy - 35, 300, 70, n, s, C['orange'])
    d.compute(830, cy - 35, 240, 70, 'Processor', n)
    d.path([(660, cy), (830, cy)], 'orange')
    d.path([(1070, cy), (1420, cy)], 'purple')
d.node(1420, 160, 240, 340, '', '', C['red'])
d.a('<text x="1540" y="210" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">Postgres</text>')
for i, t in enumerate(['expired sessions and tokens', 'stale invitations', 'career applications purge',
                       'hard delete of a user', 'user data read for export', 'expired trials reverted']):
    d.note(1540, 262 + i * 26, t, col='#fff')
d.path([(260, 285), (360, 285)], 'orange')
d.path([(260, 285), (300, 285), (300, 375), (360, 375)], 'orange')
d.pill(310, 265, 'enqueue', 'orange')
d.compute(830, 530, 240, 70, 'Scheduler', 'crons set at boot')
d.path([(830, 565), (510, 565), (510, 520)], 'orange')
d.pill(670, 565, 'cron schedules', 'orange')
d.note(1195, 538, 'one Worker per queue', col=LT)
d.note(1195, 558, 'span per job in Axiom', col=LT)
d.note(1195, 578, 'completed → queue.job.completed', col=LT)
d.note(1195, 598, 'UserCache invalidated on delete', col=LT)
d.label(40, 660, 'FAILURE PATH', '#B13A4A')
d.path([(1200, 620), (1200, 690), (165, 690), (165, 775)], 'red')
d.pill(680, 690, 'throws · 3 attempts · backoff 5 s', 'red')
d.node(40, 775, 250, 100, 'Failed set', 'kept 7 days', C['orange'])
d.compute(360, 720, 280, 70, 'Worker failed event', 'each Worker')
d.compute(360, 850, 280, 70, 'QueueEvents backstop', 'one per queue')
d.note(500, 938, 'covers a failed emit lost to a dropped connection')
d.path([(290, 825), (325, 825), (325, 755), (360, 755)], 'red')
d.path([(325, 825), (325, 885), (360, 885)], 'red')
d.node(800, 775, 300, 100, 'failureAlarm', 'dedup ledger', C['red'])
d.note(950, 900, 'one death seen twice → one alert')
d.path([(640, 755), (720, 755), (720, 810), (800, 810)], 'red')
d.path([(640, 885), (720, 885), (720, 840), (800, 840)], 'red')
d.node(1250, 720, 300, 80, 'Axiom', 'queue.job.exhausted → monitor', C['dark'])
d.note(1400, 824, 'the event name is a contract with the monitor')
d.node(1250, 850, 300, 80, 'Slack', 'alert on every exhausted job', C['dark'])
d.path([(1100, 810), (1175, 810), (1175, 760), (1250, 760)], 'red')
d.path([(1100, 840), (1175, 840), (1175, 890), (1250, 890)], 'red')
d.save(OUT)
