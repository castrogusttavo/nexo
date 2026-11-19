#!/usr/bin/env python3
"""Generates docs/diagrams/deployment-topology.svg."""
import os
from lib import Diagram, C, LILAC_TEXT

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'deployment-topology.svg')
d = Diagram(2000, 900, 'Deployment topology',
            'One host runs nginx, seven app instances, the worker, realtime and the stateful services; Cloudflare sits in front.')
LT = '#3B37A8'
d.label(40, 130, 'REQUEST PATH')
d.node(40, 330, 200, 80, 'Browser', 'nexopm.com', C['dark'])
d.node(300, 330, 220, 80, 'Cloudflare', 'DNS + proxy', C['dark'])
d.compute(580, 330, 230, 80, 'nginx', 'host · TLS · least_conn')
d.path([(240, 370), (300, 370)], 'purple')
d.pill(270, 350, '1', 'purple')
d.path([(520, 370), (580, 370)], 'purple')
d.pill(550, 350, '2', 'purple')
d.note(410, 432, 'client IP restored from CF ranges')
d.note(695, 432, 'limit_req per IP · /realtime proxied')

d.group(880, 120, 1080, 560, 'ONE HOST · DOCKER NETWORK nexo_default')
# app instances, drawn stacked
d.a(f'<rect x="936" y="174" width="300" height="120" rx="8" fill="{C["lilac"]}" stroke="#fff" stroke-width="2"/>')
d.a(f'<rect x="928" y="182" width="300" height="120" rx="8" fill="{C["lilac"]}" stroke="#fff" stroke-width="2"/>')
d.compute(920, 190, 300, 120, 'nexo-app-1 .. 7', '7 identical instances · 127.0.0.1:3001-3007')
d.note(1070, 335, '1.5 GB cap each · any instance serves any request', col=LT)
d.compute(920, 370, 300, 90, 'nexo-worker', 'BullMQ processors · dist/worker.cjs')
d.compute(920, 490, 300, 90, 'nexo-realtime', 'Hocuspocus · 127.0.0.1:1234')
d.path([(810, 360), (850, 360), (850, 250), (920, 250)], 'purple')
d.pill(850, 305, '3', 'purple')
d.path([(810, 390), (850, 390), (850, 535), (920, 535)], 'blue')
d.pill(850, 460, '/realtime', 'blue')

d.node(1400, 190, 270, 100, 'Postgres 17', 'nexo-db-1 · primary', C['red'])
d.node(1400, 330, 270, 100, 'Redis', 'nexo-redis · TLS', C['red'])
d.node(1400, 470, 270, 100, 'Silo', 'nexo-minio-1 · S3 API :9000', C['green'])
d.note(1535, 592, 'storage.nexopm.com', col=LT)
d.path([(1220, 250), (1310, 250)], 'gray', arrow=False)
d.path([(1220, 415), (1310, 415)], 'gray', arrow=False)
d.path([(1220, 535), (1310, 535)], 'gray', arrow=False)
d.path([(1310, 240), (1310, 560)], 'gray', arrow=False)
d.path([(1310, 240), (1400, 240)], 'gray')
d.path([(1310, 380), (1400, 380)], 'gray')
d.path([(1310, 550), (1400, 550)], 'gray')
d.pill(1355, 240, 'SQL', 'gray')
d.pill(1355, 380, 'TLS', 'gray')
d.pill(1355, 550, 'S3', 'gray')
d.note(1100, 630, 'app, worker and realtime reach the stateful services over the network', col=LT)

d.node(1740, 190, 200, 100, 'PgBouncer', '127.0.0.1:6432 · pool', '#7B8794')
d.node(1740, 330, 200, 100, 'Read replica', 'nexo-db-replica', '#7B8794')
d.path([(1740, 240), (1670, 240)], 'gray')
d.path([(1640, 290), (1640, 310), (1840, 310), (1840, 330)], 'gray')
d.pill(1740, 310, 'streaming', 'gray')
d.note(1840, 460, 'provisioned in prod.yml', col=LT)
d.note(1840, 480, 'optional DATABASE_URL_REPLICA', col=LT)
d.note(1840, 500, 'live wiring: to confirm', col=LT)

d.label(40, 730, 'DEPLOY · cd.yml AFTER A GREEN ci.yml')
d.node(40, 770, 170, 80, 'push to main', 'trunk', C['dark'])
d.compute(260, 770, 170, 80, 'ci.yml', 'must pass first')
d.compute(480, 770, 210, 80, 'cd.yml', 'self-hosted runner')
d.node(740, 770, 200, 80, 'GHCR image', 'Trivy scan, then push', C['dark'])
d.compute(1000, 770, 280, 80, 'docker compose up', 'one app instance at a time')
for a, b, n in [(210, 260, '1'), (430, 480, '2'), (690, 740, '3'), (940, 1000, '4')]:
    d.path([(a, 810), (b, 810)], 'orange')
    d.pill((a + b) / 2, 790, n, 'orange')
d.path([(1140, 770), (1140, 680)], 'orange')

d.label(1340, 730, 'THIRD PARTIES')
d.path([(1650, 680), (1650, 750)], 'gray', arrow=False)
d.path([(1410, 750), (1890, 750)], 'gray', arrow=False)
for i, (n, s) in enumerate([('Axiom', 'logs · audit'), ('Resend', 'e-mail'), ('AbacatePay', 'payments'), ('Slack', 'alerts · CD')]):
    x = 1340 + i * 160
    d.node(x, 780, 140, 70, n, s, C['dark'])
    d.path([(x + 70, 750), (x + 70, 780)], 'gray')
d.save(OUT)
