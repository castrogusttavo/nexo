# Visual regression tests

Visual tests answer: does the UI still look the same, pixel for pixel? The browser suite asserts what the app does; this one asserts the picture. Specs are in `e2e/visual/*.spec.ts` (`account-modal`, `issues`, `public`, `settings`, `workspace`) and the baselines are the PNGs under `e2e/visual/__screenshots__/`.

```bash
pnpm test:visual                       # run the suite
pnpm test:visual:update                # approve an intentional redesign
e2e/visual/run-in-docker.sh public.spec.ts   # one file
```

Both package scripts call `e2e/visual/run-in-docker.sh`, which appends its arguments to `playwright test --project=visual --workers=1`.

## Why it runs in Docker

Font rasterisation is not portable: different distributions hint and antialias glyphs differently, so a baseline recorded on a laptop would never match the runner. The script runs the official image `mcr.microsoft.com/playwright:v1.63.0-noble`, which pins the fonts, freetype and Chromium. Before running it compares the image tag with the installed `@playwright/test` version and exits if they differ, telling you to bump `IMAGE` and re-record the baselines.

The script also:

- builds the standalone artifact on the host (the image has no pnpm) with a pinned environment (`NEXT_PUBLIC_URL=http://localhost:3000`, CI Axiom values, `NEXT_PUBLIC_REALTIME_URL`), stamped in `.next/.visual-build-env`. A build made for something else is reused only if the stamp matches, because `NEXT_PUBLIC_*` values are inlined at build time and some reach the pixels (avatars and covers). `VISUAL_BUILD=1` forces a rebuild;
- runs the container with `--network host` (to reach local Postgres, Redis and storage), `--ipc=host`, and your uid so baselines are not root-owned, `HOSTNAME=0.0.0.0` so the standalone server binds correctly, `PLAYWRIGHT_REALTIME=false`;
- passes through only the environment variables it lists, and only if they are set.

## The strict threshold

`playwright.config.ts`, project `visual`: `maxDiffPixelRatio: 0` with a per-pixel `threshold: 0.02`, `animations: 'disabled'`, `caret: 'hide'`, `scale: 'css'`. At Playwright's default tolerance a `#fff` to `#f5f5f4` token change passes unnoticed. The rule is that determinism is bought in the fixtures, never by loosening the threshold; if one call ever needs relief, relax that call with a comment naming the element.

Chromium launch flags remove CPU-dependent rasterisation (`--disable-skia-runtime-opts`, `--disable-lcd-text`, `--disable-font-subpixel-positioning`, `--font-render-hinting=none`, `--force-color-profile=srgb`, `--disable-partial-raster`, `--disable-gpu`). The project has no retries (a screenshot that matches only on the second attempt is the flake it exists to avoid), runs one worker, and `reducedMotion: 'reduce'`. The snapshot path template (`{testDir}/__screenshots__/{arg}{ext}`) deliberately has no platform in it, so a run outside the image fails loudly instead of writing a second tree of baselines.

## Determinism in the fixtures

`e2e/visual/visual.ts`:

- one fixed identity (`IDENTITY`: Ana Souza, `visual@example.com`, workspace `acme-visual`), because the name and email are printed on screen; hence a single worker (`assertSingleWorker`);
- a frozen clock: `page.clock.setFixedTime(FROZEN_NOW)` (2026-03-12 14:30 America/Sao_Paulo) and fixed dates for the members table and project settings;
- seeded data (`seedStatus`, `clearStatus` for `/status`; a showcase project for issues), the status cache invalidated, and the per-user API rate-limit key cleared between shots (`resetApiRateLimit`);
- a stylesheet injected at document start that freezes animations, transitions, smooth scrolling and the caret, plus `stabilise(page)` before each shot;
- four variants per screen in `VARIANTS`: `desktop-light`, `desktop-dark`, `mobile-light` (390x844), `mobile-dark`. Desktop-only screens skip the mobile variants. Baselines are named `<area>/<screen>/<variant>.png` via `shotName`.

## Update flow

1. Make the intentional UI change.
2. Run `pnpm test:visual` and read the diff in the HTML report.
3. Run `pnpm test:visual:update`.
4. Review the changed PNGs in `git diff` as carefully as code, then commit them with the change.

In CI the visual suite runs in the `e2e-tests` job, browser leg, after the browser specs (both use port 3000), reusing that job's build, with `--output=test-results-visual`; the report is uploaded as `playwright-report-visual`.

## Gotchas

- Docker must be available locally. Running Playwright's visual project directly on the host will fail on diffs by design.
- Bumping `@playwright/test` requires bumping `IMAGE` in the script and re-recording every baseline.
- A new `NEXT_PUBLIC_*` that affects rendering must be added to `VISUAL_BUILD_ENV` and to the CI build env, or local and CI pictures diverge.

## Related files

- `e2e/visual/run-in-docker.sh`, `e2e/visual/visual.ts`, `e2e/visual/*.spec.ts`, `e2e/visual/__screenshots__/`
- `playwright.config.ts` (`visual` project)
- `.github/workflows/ci.yml` (`e2e-tests`)
- [E2E and browser](./e2e-and-browser.md), [Testing overview](./README.md)
