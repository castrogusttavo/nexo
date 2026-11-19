#!/usr/bin/env python3
"""Generates docs/diagrams/auth-flow.svg."""
import os
from lib import Diagram, C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'auth-flow.svg')
d = Diagram(2000, 1010, 'Authentication flow',
            'Three ways in, one session: Better Auth creates it, proxy.ts and the DAL guard every later request.')
LT = '#3B37A8'
d.label(40, 130, 'SIGN IN')

# Row 1: email + password (+ two-factor)
d.node(40, 160, 230, 80, 'Sign-in form', 'email + password', C['dark'])
d.compute(360, 160, 300, 80, 'POST /sign-in/email', 'argon2 verify · e-mail verified')
d.compute(770, 160, 320, 80, 'Two-factor challenge', 'twoFactorRedirect')
d.path([(270, 200), (360, 200)], 'purple')
d.pill(315, 180, '1', 'purple')
d.path([(660, 200), (770, 200)], 'purple')
d.pill(715, 180, '2', 'purple')
d.note(930, 262, 'e-mailed OTP · TOTP app · backup code', col=LT)
d.note(930, 282, '5 failed attempts lock it for 15 min', col=LT)
d.note(930, 302, 'trust device refused for platform admins', col=LT)

# Row 2: OAuth
d.node(40, 350, 230, 80, 'Google / GitHub', 'OAuth provider', C['dark'])
d.compute(360, 350, 300, 80, 'OAuth callback', 'accountLinking enabled')
d.path([(270, 390), (360, 390)], 'blue')
d.pill(315, 370, '1', 'blue')
d.note(510, 452, 'access / refresh / id tokens', col=LT)
d.note(510, 472, 'encrypted at rest (XChaCha20)', col=LT)

# Row 3: email OTP verification
d.node(40, 520, 230, 80, 'Sign-up', 'unverified e-mail', C['dark'])
d.compute(360, 520, 300, 80, 'emailOTP plugin', 'email-verification · sign-in')
d.compute(770, 520, 320, 80, 'Code e-mailed', 'sendVerificationOTP')
d.path([(270, 560), (360, 560)], 'teal')
d.pill(315, 540, '1', 'teal')
d.path([(660, 560), (770, 560)], 'teal')
d.pill(715, 540, '2', 'teal')
d.note(930, 622, 'autoSignInAfterVerification: true', col=LT)

# Session
d.compute(1200, 350, 280, 80, 'Session created', 'databaseHooks.session.create')
d.path([(1090, 200), (1145, 200), (1145, 375), (1200, 375)], 'purple')
d.pill(1145, 290, '3', 'purple')
d.path([(660, 390), (1200, 390)], 'blue')
d.pill(930, 390, '2', 'blue')
d.path([(1090, 560), (1145, 560), (1145, 405), (1200, 405)], 'teal')
d.pill(1145, 480, '3', 'teal')
d.note(1340, 452, 'audit session.created', col=LT)
d.note(1340, 472, 'cancels a pending account deletion', col=LT)

d.node(1620, 235, 340, 80, 'better-auth.session_token', 'cookie · opaque id', C['green'])
d.node(1620, 355, 340, 80, 'better-auth.session_data', 'signed cookie cache · 5 min', C['dark'])
d.node(1620, 475, 340, 80, 'Postgres', 'session row', C['red'])
d.path([(1480, 390), (1550, 390), (1550, 275), (1620, 275)], 'green')
d.path([(1480, 390), (1620, 390)], 'green')
d.path([(1480, 390), (1550, 390), (1550, 515), (1620, 515)], 'green')
d.pill(1550, 330, '4', 'green')
d.note(1790, 575, 'cache carries acceptedTermsAt / acceptedPrivacyAt', col=LT)

# Request path
d.group(30, 650, 1940, 340, 'EVERY LATER REQUEST')
d.node(60, 700, 190, 80, 'Request', 'page or /api', C['dark'])
d.compute(330, 700, 300, 80, 'proxy.ts', 'session cookie · public routes')
d.compute(730, 700, 320, 80, 'readCookieConsent', 'signed cookie cache, no DB')
d.compute(1150, 700, 260, 80, 'Page renders', 'GET, not /onboarding')
d.compute(1510, 700, 430, 80, 'DAL', 'requireConsentedUser · requireMembership')
d.path([(250, 740), (330, 740)], 'gray')
d.pill(290, 720, '5', 'gray')
d.path([(630, 740), (730, 740)], 'gray')
d.pill(680, 720, '6', 'gray')
d.path([(1050, 740), (1150, 740)], 'gray')
d.pill(1100, 720, '7', 'gray')
d.path([(1410, 740), (1510, 740)], 'gray')
d.pill(1460, 720, '8', 'gray')
d.note(1725, 802, 'definitive check, reads the database', col=LT)
d.note(1725, 822, 'redirects or 404 on its own', col=LT)

d.node(330, 860, 300, 90, '401 or /sign-in', 'no cookie: /api gets 401', C['red'])
d.note(480, 972, '/sign-in?redirect=<path> for pages')
d.path([(480, 780), (480, 860)], 'red')
d.node(730, 860, 320, 90, '/onboarding/consent-setup', 'terms or privacy missing', C['orange'])
d.path([(890, 780), (890, 860)], 'orange')
d.note(1230, 880, 'cache expired or tampered ("unknown")', col=LT)
d.note(1230, 900, 'never blocks: the DAL decides', col=LT)
d.save(OUT)
