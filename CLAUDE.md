# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # astro dev on :4321 — hot reload, unminified
npm run build     # astro build — static output to dist/
npm run preview   # astro preview — serves the built dist/ (real production bundle, no dev overhead)
```

There is no test suite and no linter configured. `.claude/launch.json` defines two dev-server profiles for the `Preview` tooling: `devsphinx` (dev server, :4321) and `devsphinx-prod-preview` (`astro preview`, :4322). Use the latter when a change needs to be measured or verified against the actual production bundle rather than the dev server (e.g. performance/CWV checks) — the dev server adds unminified assets, an Astro dev toolbar, and HMR overhead that don't reflect what ships.

**Content collections require a dev-server restart** after editing `src/content.config.ts` (schema changes) — Astro's content layer caches and won't pick up schema changes via HMR, and will silently return an empty collection until restarted.

Deploys are manual via the Vercel CLI (`vercel --prod`), not git-integration-triggered. Push to `master` on GitHub for history/backup, but a deploy requires an explicit `vercel --prod` run.

## Architecture

Static Astro site (output: `"static"`, no server runtime, no framework — no React/Vue/etc., just `.astro` files with vanilla inline `<script>`/`<style>`). Every page hand-writes its own HTML; there are no shared `Nav`/`Footer` components — nav and footer markup is duplicated per page by convention (see "CSS/page architecture" below for why).

### CSS/page architecture — two unrelated design systems

This is the one thing that isn't obvious from file structure alone: **`home.css` and `case-study.css` are independent, non-overlapping token systems**, not a shared base + extensions.

- **`home.css`** — used only by `src/pages/index.astro`. Defines its own `:root` tokens, nav, footer, hero, buttons, etc. from scratch.
- **`case-study.css`** — used by every other page (service pages, blog, case studies, industries/services hubs). Also defines its own `:root` tokens, nav, footer, hero, buttons — a parallel, independently-maintained duplicate of what `home.css` does for the homepage. The token *values* match `home.css` (same colors/fonts) but they are two separate blocks of CSS; editing one does not affect the other.
- **`service.css`** — a small delta on top of `case-study.css` (price grids, step lists, FAQ accordion, related-links pills, the services-hub card grid). Imported alongside `case-study.css` wherever those components appear.
- **`blog.css`** — delta on top of `case-study.css` for the blog hub's bento grid and the rendered-Markdown prose styles.
- **`case-study-dispatch.css`** — a full standalone fork of `case-study.css` used only by `dispatch-platform.astro`, with a blue-tinted grid background instead of orange (that case study's branding is "AI-First SaaS" blue rather than "Agent System" orange). It does not import or share anything with `case-study.css`.

New pages typically import `case-study.css` + `service.css` and follow the existing markup pattern (copy an existing service page under `src/pages/services/` as the starting point) rather than building a new layout from scratch.

### Per-page metadata via BaseLayout

`src/layouts/BaseLayout.astro` takes `title`/`description`/`ogImage` props and computes canonical URL + OG/Twitter tags from `Astro.site` + `Astro.url.pathname` automatically — new pages get correct canonical/OG tags for free just by using the layout, no per-page boilerplate needed.

It also injects sitewide `Organization`/`WebSite`/`Person` JSON-LD (founder: Salman Nausher). Pages needing additional schema (`Service`, `FAQPage`, `BreadcrumbList`, `Article`) build their own `@graph` object in frontmatter and inject it via `<script type="application/ld+json" set:html={...}>` in the page body — see any file under `src/pages/services/` for the pattern.

BaseLayout exposes a named slot (`<slot name="head" />`) for page-specific `<head>` additions. It's currently used for exactly one thing: `index.astro` loads the Caveat font (used only by the homepage's founder signature) via this slot rather than adding it to BaseLayout's shared Google Fonts link, so the other 14 pages don't pay for a font they never render.

### Content collections (blog)

`src/content.config.ts` defines the `blog` collection (glob loader over `src/content/blog/*.{md,mdx}`). Required frontmatter: `title`, `description`, `publishDate`, `cluster` (enum), `clusterLabel`, `keyword`, `readingTime`, optional `draft`. Posts render through `src/pages/blog/[...slug].astro`; the hub at `src/pages/blog/index.astro` features the most recent post and shows the rest of the 90-day content plan's queued topics as non-clickable "coming soon" cards in the same bento grid — when a queued topic gets written as a real post, remove its entry from the `upcoming` array in that file so it doesn't show twice. MDX posts can import real Astro components (see `src/components/SnippetAnswer.astro`, a boxed direct-answer callout used for AEO).

### Domain

Canonical domain is **`https://www.devshinx.dev`** (set in `astro.config.mjs` `site`, and hardcoded into every schema `@id`/URL across pages) — not `devsphinx.com`, despite the brand name being "Devsphinx." This was a deliberate resolution of a domain mismatch found during an SEO audit; don't "fix" it back to devsphinx.com. `vercel.json` has permanent redirects from the pre-Astro static-HTML site's old URLs (`/case-study.html`, etc.) to the current routes — leave those in place for existing backlinks.

### SEO infrastructure — what's auto-generated vs. hand-maintained

`sitemap-index.xml`/`sitemap-N.xml` are generated at build time by the `@astrojs/sitemap` integration (`astro.config.mjs`) from whatever pages actually exist — never hand-edit or add a sitemap file yourself, and it needs no updates when a new page is added. `public/robots.txt` and `public/llms.txt` are the opposite: plain static files, not generated, not kept in sync automatically. `llms.txt` in particular is a curated summary of services/facts/key pages for AI crawlers — when a new service or major page ships, it's worth asking whether `llms.txt` should mention it, since nothing will do that automatically.

### Motion conventions

- `.fu` = fade-up-on-scroll utility class, toggled to `.vis` by an `IntersectionObserver` in each page's inline script, gated behind `@media(prefers-reduced-motion:no-preference)`.
- Word-by-word headline reveals use `[data-split]` + a `.sw`/`.sw i` span-splitting script (see `index.astro`'s "Motion enhancements" block) — applied to H1/H2 elements.
- There is no hero animation anymore — a particle-network canvas was deliberately removed (it duplicated the agent-flow pipeline diagram and was the source of a measured forced-reflow issue). Don't re-add a canvas/particle background to `#hero` without discussing it first; the homepage hero is intentionally plain typography now.
- The agent-flow pipeline (`#agent-flow`) and the process steps (`.proc-list`) both animate, but on different triggers — worth knowing before adding a third: agent-flow auto-loops on a `setTimeout` chain regardless of scroll (it's meant to run continuously, like a live system), while the process rail is scroll-tied — it computes the rail line's position from the real `.proc-n` elements' `getBoundingClientRect()` at runtime (not hardcoded offsets) and marks each step's number `.proc-active` cumulatively as the user scrolls past it (earlier steps stay lit, they don't turn back off). If you build a third scroll-tied animation, follow the process-rail's cumulative pattern, not a "only the current one is active" pattern — that was tried for the process rail first and rejected because stepping backward visually looked like undoing completed steps.
- Any new animation should check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and provide a static fallback, matching the existing pattern used by the agent-pipeline pulse animation, the process rail, and the founder-section spinner.
