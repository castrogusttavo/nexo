# Diagram generators

The SVGs in `docs/diagrams/` are generated, not hand-drawn. Python 3 standard
library only, no dependencies.

- `lib.py`: palette, `Diagram` class (`node`, `compute`, `entity`, `group`, `path`, `pill`, `note`, `label`) and SVG assembly.
- `<name>.py`: one script per diagram; writes `docs/diagrams/<name>.svg`.

## Regenerate

```bash
python3 docs/diagrams/_tools/background-jobs.py
python3 docs/diagrams/_tools/request-flow.py
python3 docs/diagrams/_tools/private-access.py
python3 docs/diagrams/_tools/er-model.py
python3 docs/diagrams/_tools/deploy-pipeline.py
```

## Preview

```bash
rsvg-convert -w 1600 docs/diagrams/request-flow.svg -o /tmp/request-flow.png
```

Open the PNG and check for overlapping text, clipped labels and arrows that
cross a node. Keep the PNGs out of the repo.

## Visual language

Off-white background; rounded nodes with a bold title and a small subtitle;
colour by role (dark grey external, lilac compute, orange queues and async, red
databases and failure, green source of truth); dashed orthogonal arrows
coloured per flow; pill labels on arrows (numbered "1. step" in flows); dashed
group boundaries with UPPERCASE titles; small notes under nodes.

Layout is absolute (coordinates in each script), so after moving a node check
the arrows that touch it.
