# Design-sync notes (Kadmivo brand kit)

## Where the design system lives

- In Claude Design as the Design System artifact **"Kadmivo Brand Kit"**: https://claude.ai/artifact/9uhhfTJhagTA5WPjFKYbKr (private to Raj; first published 2026-09-28 from f1130d6). Claude Design keeps design systems as artifacts of its "Design System" type, which the Artifact tool writes directly. The older `DesignSync` project upload was never authorized in the cloud sessions, so `config.json` has no `projectId`.
- Its files come from `.design-sync/artifact/build.py <out-dir>` after a converter build: `components/bundle.js` is `ds-bundle/_ds_bundle.js` with a format-4 header, `bundle.css` is `_ds_bundle.css`, `index.d.ts` gathers every `<Name>Props`, and each component gets a README (JSDoc, usage notes, props, examples) and a live `preview.html` compiled from `.design-sync/previews/<Name>.tsx` (stories stacked in `KadmivoProvider`, motion off). Hand-written parts sit in `.design-sync/artifact/src/`: the brand book (`README.md`), `tokens.json`, the cover and the logo and icon SVGs. Card heights come from `heights.json` (each preview measured at 900px wide).
- To publish, follow the type's own `SKILL.md` (read it on the artifact): upload the SVGs under `assets/` as assets, then send `project/…` files to the artifact's url in one call with `project/design-system.json` last. The index holds the asset blob ids, so read the live one back and edit it rather than regenerating it. People can edit the system on its page: read their changes back and merge before republishing.

## How this sync is wired

- The design system is the site's own kit: components in `client/src/kit/`, styles in `client/src/index.css`. `client/src/pages/Home.tsx` is built from the kit, so the live site and the design system share one source.
- `pnpm run build:kit` (cfg.buildCmd) writes `kit/dist/index.js` (library build; react, framer-motion and lucide-react external), `kit/dist/kadmivo.css` (the site stylesheet, unminified) and `kit/dist/types/`. The converter finds the package through `kit/package.json` (`@kadmivo/brand-kit`); the entry is pinned in cfg.entry.
- Converter deps live in `.ds-sync/`: `npm i esbuild ts-morph @types/react playwright@1.56.1`. Playwright 1.56.x matches the cached `chromium-1194` under `/opt/pw-browsers`.
- Build: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`; then `package-validate.mjs` and `package-capture.mjs` as usual, or the driver (`resync.mjs`, same flags).

## Gotchas

- Fonts: the site loads Fraunces and Manrope from Google Fonts. The sync's headless Chromium cannot reach Google Fonts here (the proxy's CA is not trusted by Chromium), so the design system self-hosts them: `.design-sync/fonts/` holds the latin and latin-ext subsets of the site's own Google request (SIL OFL 1.1, licences alongside), wired through cfg.extraFonts. The remote `@import` stays in `_ds_bundle.css` too; harmless where Google is reachable.
- Previews render inside `KadmivoProvider` (cfg.provider) with motion off. Motion off wraps children in a plain block `<div class="kadmivo-motion-off">` that stills the stylesheet's looping animations. An earlier `display: contents` wrapper made every card trip `[RENDER_THIN]` (the validator measures the mount's direct children).
- `.d.ts` extraction prints nested alias references by name (TypeScript keeps `IconName` inside object literal types), so item shapes are written inline in each `<Name>Props` and conventions.md lists the icon names.
- The README index uses only the first line of each component's JSDoc (sanitized, 140 chars max); prop docs are cut at 120 chars. Keep first lines complete sentences.
- `RuleCallout`, `FeatureGrid` and `Timeline` are `min(1180px, 92vw)` wide with a top margin: previews place them in a full-width `display: flow-root` section, and their cards use `cardMode: column`.
- `FormCard` relies on its `note` for the gap between the title and the fields; previews always pass one.
- Site CSS quirks kept on purpose (the live site must not change): `.dark-section p` outranks `.eyebrow` and `.form-note`, so eyebrows in dark sections render light grey and the form note in a dark section is faint; order lines place the note top right and the price under the name. Previews show these exactly as the site does.
- The site build (`vite.config.ts`) runs Manus's jsx-loc plugin, which stamps `data-loc` on every element; the kit build does not. Parity checks between site builds must ignore `data-loc`.
- The success state of `FormCard` needs a submit, so no static preview shows it.

## Known render warns

- `[TOKENS_MISSING]` 21 vars (`--radix-*`, `--sidebar-width`, `--skeleton-width`, ...): used by Tailwind utilities generated for the unused shadcn/ui components in `client/src/components/ui/`; Radix sets them at runtime. Benign.

## Verified when the kit was extracted (2026-09-28)

Home rebuilt from the kit against the previous build: identical DOM (attributes sorted, `data-loc` ignored) with and without reduced motion on desktop and phone widths, identical visible text, zero-pixel full-page differences, identical contact form before and after submit, mid-animation frames within run-to-run noise, no layout shift.

## Re-sync risks

- `kit/dist/kadmivo.css` is the whole site stylesheet, including Tailwind utilities for unused components. Site CSS changes flow into the design system; that is intended.
- The self-hosted fonts are copies fetched on 2026-09-28 (Fraunces v38, Manrope v20). If the site's font request changes, refresh `.design-sync/fonts/`.
- Preview copy is hand-written from the site's wording; it does not follow later wording changes on the site.
- `KadmivoProvider` and `ScrollProgress` are excluded from cards (cfg.componentSrcMap) and documented in conventions.md instead; keep them there if their API changes.
