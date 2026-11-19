"""Tiny SVG diagram toolkit for docs/diagrams (python3 stdlib only).

Visual language (approved): off-white background, rounded-rect nodes with a
bold title and a small subtitle, colour by role, dashed orthogonal arrows
coloured per flow, pill labels on arrows, dashed UPPERCASE group boundaries,
a title plus one-sentence subtitle on top, small notes under nodes.
"""
import html

# Colour by role. Fills for nodes, strokes for arrows and pills.
C = dict(
    dark='#4A5568',     # external / clients / third parties
    lilac='#DCDAF2',    # compute (use with LILAC_TEXT)
    orange='#E08A3C',   # queues / async
    red='#D1495B',      # databases / failure
    green='#2F9E6E',    # source of truth
    teal='#2A9AA8',     # AI / search
    purple='#5B54D6',   # flow colour
    gray='#64748B',     # flow colour
    blue='#3B82C4',     # flow colour
)
LILAC_TEXT = '#3B37A8'
BG = '#FBFAF7'
INK = '#1E293B'
MUTED = '#475569'
FONT = 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif'


def esc(s):
    return html.escape(str(s), quote=False)


class Diagram:
    def __init__(self, w, h, title, subtitle, svg_title=None):
        self.w, self.h = w, h
        self.o = []
        self.svg_title = svg_title or title
        self.a(f'<rect width="{w}" height="{h}" fill="{BG}"/>')
        self.a(f'<text x="40" y="52" font-size="34" font-weight="800" fill="{INK}">{esc(title)}</text>')
        self.a(f'<text x="40" y="84" font-size="19" fill="{MUTED}">{esc(subtitle)}</text>')

    def a(self, s):
        self.o.append(s)

    def group(self, x, y, w, h, label, col='#B8BEC8', lc='#7A5A2B'):
        self.a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="none" stroke="{col}" stroke-width="1.5" stroke-dasharray="6 5"/>')
        self.a(f'<text x="{x+22}" y="{y+30}" font-size="15" font-weight="700" letter-spacing="1" fill="{lc}">{esc(label)}</text>')

    def label(self, x, y, t, col='#7A5A2B'):
        """Free UPPERCASE section label (no boundary)."""
        self.a(f'<text x="{x}" y="{y}" font-size="15" font-weight="700" letter-spacing="1" fill="{col}">{esc(t)}</text>')

    def node(self, x, y, w, h, title, sub, fill, tc='#fff', sc=None):
        sc = sc or tc
        self.a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}"/>')
        cx = x + w / 2
        if sub:
            self.a(f'<text x="{cx}" y="{y+h/2-3}" text-anchor="middle" font-size="19" font-weight="700" fill="{tc}">{esc(title)}</text>')
            self.a(f'<text x="{cx}" y="{y+h/2+20}" text-anchor="middle" font-size="15" fill="{sc}">{esc(sub)}</text>')
        else:
            self.a(f'<text x="{cx}" y="{y+h/2+6}" text-anchor="middle" font-size="19" font-weight="700" fill="{tc}">{esc(title)}</text>')

    def compute(self, x, y, w, h, title, sub):
        self.node(x, y, w, h, title, sub, C['lilac'], LILAC_TEXT)

    def entity(self, x, y, w, title, fields, fill, tc='#fff', row=21):
        """ER box: bold header band plus one line per field."""
        h = 38 + row * len(fields) + 10
        self.a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}"/>')
        self.a(f'<text x="{x+14}" y="{y+26}" font-size="18" font-weight="700" fill="{tc}">{esc(title)}</text>')
        self.a(f'<line x1="{x+10}" y1="{y+36}" x2="{x+w-10}" y2="{y+36}" stroke="{tc}" stroke-opacity="0.35"/>')
        for i, f in enumerate(fields):
            self.a(f'<text x="{x+14}" y="{y+58+i*row}" font-size="14" fill="{tc}" fill-opacity="0.92">{esc(f)}</text>')
        return h

    def note(self, x, y, t, anchor='middle', col=MUTED):
        self.a(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="15" fill="{col}">{esc(t)}</text>')

    def path(self, pts, col, arrow=True):
        d = 'M' + ' L'.join(f'{x},{y}' for x, y in pts)
        mk = f' marker-end="url(#m-{col})"' if arrow else ''
        self.a(f'<path d="{d}" fill="none" stroke="{C[col]}" stroke-width="2.2" stroke-dasharray="7 6" stroke-linejoin="round"{mk}/>')

    def pill(self, x, y, t, col):
        w = len(t) * 7.9 + 26
        self.a(f'<rect x="{x-w/2}" y="{y-14}" width="{w}" height="28" rx="14" fill="{C[col]}"/>')
        self.a(f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">{esc(t)}</text>')

    def render(self):
        defs = ''.join(
            f'<marker id="m-{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
            for k, c in C.items() if k not in ('lilac', 'dark'))
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" font-family="{FONT}">\n'
                f'<title>{esc(self.svg_title)}</title><defs>{defs}</defs>')
        return '\n'.join([head] + self.o + ['</svg>'])

    def save(self, path):
        with open(path, 'w') as f:
            f.write(self.render())
