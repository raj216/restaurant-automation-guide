#!/usr/bin/env python3
"""Builds the files of the "Kadmivo Brand Kit" Design System artifact.

Usage: python3 .design-sync/artifact/build.py <out-dir>

Needs a fresh converter build first (pnpm run build:kit, then
.ds-sync/package-build.mjs into ds-bundle/; see NOTES.md). Writes <out-dir>/project/:
the bundle, stylesheet, types, fonts and licences from that build, one README and
live preview per component (compiled from .design-sync/previews/<Name>.tsx), and
the hand-written files kept in .design-sync/artifact/src/ (brand book, tokens,
cover, logo and icons). Publishing is described in NOTES.md.
"""
import json, os, re, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = Path(sys.argv[1]).resolve()
P = OUT / "project"
BUNDLE = REPO / "ds-bundle"
ESBUILD = REPO / ".ds-sync/node_modules/.bin/esbuild"
# Card heights measured by rendering each preview at 900px wide.
HEIGHTS = json.loads((HERE / "heights.json").read_text())

GROUP_ORDER = ["brand", "typography", "actions", "layout", "content", "cards", "forms", "motion"]
GROUP_TITLE = {g: g.capitalize() for g in GROUP_ORDER}

# Component inventory in display order, from the converter's output tree.
components = []
for g in GROUP_ORDER:
    for d in sorted((BUNDLE / "components" / g).iterdir()):
        components.append((g, d.name))
names = [n for _, n in components]
assert len(names) == 30, len(names)

ICONS = ["arrow-right", "arrow-up-right", "check", "check-circle", "clipboard-check", "clock",
         "hand", "lock", "map-pin", "phone", "shield-check", "user"]

# Where to use each component and what the consumer supplies.
USE = {
    "BrandMark": ["Use it as the logo in `SiteHeader` and `SiteFooter`; wrap it in a link to the home page.",
                  "Set `inverse` on dark grounds (`dark`, the footer). Set `drawOnView` where it sits below the fold."],
    "Icon": ["Pass one of the twelve names; nothing else draws.",
             "It takes the text color: `terracotta` on light grounds, `warm-on-dark` on dark ones. Give it `label` only when no text beside it says the same thing."],
    "Eyebrow": ["Put one above every section heading. Write the label in sentence case; the style sets capitals and adds the rule.",
                "Terracotta on light grounds. Inside `dark-section` it renders `dark-copy` grey, as on the live site."],
    "Heading": ["`level={1}` once per page (the hero), `level={2}` per section, `level={3}` for card and column titles.",
                "Children must be plain text. Headings in `dark-section` turn white on their own."],
    "Text": ["`lead` opens a section in the serif, `lede` introduces the hero, `emphasis` is one short bold line, `body` is everything else.",
             "`ink-soft` on light grounds, `dark-copy` inside `dark-section`."],
    "Button": ["The primary action: one per view. `href` renders a link; inside a form use `type=\"submit\"`.",
               "Verb first, sentence case: \"See how it works\", \"Request my phone-order review\"."],
    "TextLink": ["The secondary action, beside a `Button` in an `ActionRow` or on its own. Light grounds.",
                 "Default arrow points up-right; pass `icon=\"arrow-right\"` for an in-page next step."],
    "ArrowLink": ["Dark sections only: it takes the surrounding white text and warms on hover.",
                  "Supply `href` and a short label."],
    "ActionRow": ["Use under a hero or section intro: a `Button`, then a `TextLink`. Light grounds."],
    "NoticeBar": ["The first thing on the page, above `SiteHeader`. Three short strings: brand and area, promises (hidden on phones), availability."],
    "SiteHeader": ["Directly under `NoticeBar`. Three to five section links (`href=\"#id\"`) and one call to action.",
                   "It is sticky and frosted; don't put it inside a section."],
    "SiteFooter": ["The last thing on the page. Two link columns, one tagline, up to three small-print items."],
    "TrustStrip": ["Under the hero's `ActionRow`: two to four reassurances with icons. Light grounds."],
    "NumberedList": ["Light sections, beside or under the intro copy. Three points; numbering is automatic."],
    "WorkflowSteps": ["The right column of a light section's `section-grid`, three to five steps.",
                      "Leave about 28px of space on its left: the progress rule sits there."],
    "RuleCallout": ["One rule in one sentence. Place it directly in a light `<section>`, after its `section-grid`, never inside a column."],
    "FeatureGrid": ["Place it directly in a `dark-section`, after its `section-grid`, never inside a column. Three items fill a row."],
    "Timeline": ["Place it directly in a light or `paper-deep` section, after its `section-grid`. Four stages fill a row."],
    "PromiseList": ["Dark sections, under the intro copy: two to four short promises."],
    "OrderCard": ["The hero visual: a sample order ticket. For the site's ring behind it, wrap it in `<div className=\"hero-visual\">`.",
                  "Use realistic order content: quantities with ×, prices with $, times like \"8:20 PM\", separators with ·."],
    "ControlPanel": ["The right column of a dark section's `section-grid`: a status light and three to five label/value rows. It brings its own dark panel."],
    "PriceCard": ["The right column of a pricing section, on `paper-deep`. Label in capitals, the figure with en dashes for ranges."],
    "FormCard": ["The white form card, on a dark or paper section. Always pass `note`: it also spaces the title from the fields.",
                 "Children: a `FormGrid` of fields, any full-width fields, then `FormActions`. `success` fills the confirmation shown after submit."],
    "FormGrid": ["Two columns of `Field`/`SelectField` inside a `FormCard`; one column on phones."],
    "Field": ["Only inside a `FormCard` (usually in a `FormGrid`). `required` adds the asterisk; mark optional fields with `hint=\"(optional)\"`."],
    "SelectField": ["Only inside a `FormCard`. Give required choices a `placeholder` (\"Select your POS\")."],
    "TextAreaField": ["Only inside a `FormCard`, full width, for the one open question."],
    "FormActions": ["The last row of a `FormCard`: an optional `SelectField`, then the submit `Button`."],
    "Reveal": ["Wrap a custom block to give it the kit's entrance when motion is on: `rise` for copy, `wipe` for ruled rows, `fade` for bars.",
               "With motion off (the default) it renders the element as is."],
    "DrawIcon": ["Icons in step lists and feature rows; their strokes draw in when motion is on.",
                 "It takes the text color, like `Icon`."],
}


def jsdoc(name):
    src = next((REPO / "client/src/kit").rglob(f"{name}.tsx"))
    text = src.read_text()
    m = re.search(rf"/\*\*((?:(?!\*/).)*)\*/\s*export function {name}\b", text, re.S)
    body = m.group(1)
    lines = [re.sub(r"^\s*\* ?", "", l) for l in body.split("\n")]
    doc = "\n".join(lines).strip()
    return doc, src.relative_to(REPO).as_posix()


def props_block(group, name):
    d = (BUNDLE / "components" / group / name / f"{name}.d.ts").read_text()
    m = re.search(rf"export interface {name}Props \{{.*?\n\}}", d, re.S)
    block = m.group(0)
    return block.replace("style?: CSSProperties;", "style?: React.CSSProperties;")


def stories(name):
    src = (REPO / ".design-sync/previews" / f"{name}.tsx").read_text()
    out = []
    for m in re.finditer(r"export const ([A-Z]\w*) = ([\s\S]*?)(?=\nexport const [A-Z]|\Z)", src):
        out.append((m.group(1), m.group(2).strip().rstrip(";")))
    return src, out


def label(story):
    words = re.findall(r"[A-Z][a-z]*|[a-z]+|\d+", story)
    s = " ".join(words).lower()
    return s[0].upper() + s[1:]


def write(path, text):
    f = P / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text)


if P.exists():
    shutil.rmtree(P)
P.mkdir(parents=True)

# -- bundle, stylesheet, fonts -------------------------------------------------
js = (BUNDLE / "_ds_bundle.js").read_text()
first, rest = js.split("\n", 1)
assert first.startswith("/* @ds-bundle:")
header = {"format": 4, "namespace": "Kadmivo", "components": [{"name": n} for n in names]}
js = f"/* @ds-bundle: {json.dumps(header, separators=(',', ':'))} */\n" + rest
for bad in ["</script", "<!--", "eval(", "new Function"]:
    assert bad not in js, bad
write("components/bundle.js", js)
write("components/bundle.css", (BUNDLE / "_ds_bundle.css").read_text())
for f in ["fraunces-latin.woff2", "manrope-latin.woff2"]:
    (P / "fonts").mkdir(exist_ok=True)
    shutil.copy(REPO / ".design-sync/fonts" / f, P / "fonts" / f)
(P / "licenses").mkdir(exist_ok=True)
for f in ["OFL-fraunces.txt", "OFL-manrope.txt"]:
    shutil.copy(REPO / ".design-sync/fonts" / f, P / "licenses" / f)
# Hand-written files: brand book, tokens, cover, logo and icons.
shutil.copytree(HERE / "src", P, dirs_exist_ok=True)

# -- types -----------------------------------------------------------------------
dts = ["import type * as React from 'react';", "",
       "/** The twelve icon names the kit ships (Icon, DrawIcon and every `icon` field). */",
       "export type IconName = " + " | ".join(f'"{i}"' for i in ICONS) + ";", "",
       "/** Wraps a Kadmivo page or design and sets whether its components move. Without it components render static. */",
       "export interface KadmivoProviderProps {",
       "  /** \"on\" plays entrances and scroll effects (honouring reduced-motion settings); \"off\" renders the final state. Default \"off\". */",
       "  motion?: \"on\" | \"off\";",
       "  children: React.ReactNode;",
       "}",
       "export declare const KadmivoProvider: React.ComponentType<KadmivoProviderProps>;",
       "/** A thin terracotta reading-progress rule fixed along the top of the window. Renders nothing when motion is off. */",
       "export declare const ScrollProgress: React.ComponentType<{}>;",
       "/** True once the named web fonts have loaded (or after `timeout` ms); gate above-the-fold entrances on it with `ready`. */",
       "export declare function useFontsReady(families: string[], timeout?: number): boolean;",
       "/** Every icon name, in order. */",
       "export declare const iconNames: IconName[];", ""]
for g, n in components:
    doc, _ = jsdoc(n)
    summary = doc.split("\n\n")[0].replace("\n", " ")
    dts += [f"/** {summary} */", props_block(g, n), f"export declare const {n}: React.ComponentType<{n}Props>;", ""]
dts += ["declare global {", "  interface Window {", "    Kadmivo: {",
        "      KadmivoProvider: typeof KadmivoProvider; ScrollProgress: typeof ScrollProgress; useFontsReady: typeof useFontsReady; iconNames: typeof iconNames;"]
dts += [f"      {n}: typeof {n};" for n in names]
dts += ["    };", "  }", "}", ""]
write("components/index.d.ts", "\n".join(dts))

# -- per component: README + live preview ----------------------------------------
source_paths = {}
summaries = {}
for g, n in components:
    doc, srcpath = jsdoc(n)
    source_paths[n] = srcpath
    paras = doc.split("\n\n")
    summary = paras[0].replace("\n", " ")
    summaries[n] = summary
    rest_text = "\n\n".join(p.replace("\n", " ") for p in paras[1:])
    src, st = stories(n)
    md = [summary, ""]
    if rest_text:
        md += [rest_text, ""]
    md += ["## Use it", ""] + [f"- {u}" for u in USE[n]] + [
        "- Inside `KadmivoProvider`: static by default, animated with `motion=\"on\"`.", "",
        "## Props", "", "```ts", props_block(g, n), "```", "", "## Examples", ""]
    for s, body in st:
        md += [f"### {label(s)}", "", "```jsx", body, "```", ""]
    write(f"components/{n}/README.md", "\n".join(md))

    # Live preview: the authored stories, compiled to createElement calls.
    imp = re.search(r'import \{([^}]*)\} from "@kadmivo/brand-kit";\n', src)
    body = src.replace(imp.group(0), "").replace("export const ", "const ")
    tsx = f"const {{{imp.group(1)}}} = window.Kadmivo;\n{body}\n"
    js_out = subprocess.run([str(ESBUILD), "--loader=tsx", "--jsx=transform", "--jsx-factory=h",
                             "--jsx-fragment=React.Fragment", "--target=es2019", "--log-level=error"],
                            input=tsx, capture_output=True, text=True, check=True).stdout
    order = ", ".join(f'[{json.dumps(label(s))}, {s}]' for s, _ in st)
    multi = "true" if len(st) > 1 else "false"
    script = f"""var h = React.createElement;
{js_out.strip()}
var stories = [{order}];
var showLabels = {multi};
ReactDOM.createRoot(document.getElementById("root")).render(
  h(window.Kadmivo.KadmivoProvider, null,
    stories.map(function (entry) {{
      return h("section", {{ key: entry[0], className: "kd-story" }},
        showLabels ? h("p", {{ className: "kd-story-label" }}, entry[0]) : null,
        h(entry[1]));
    }})));"""
    assert "</script" not in script and "<!--" not in script
    height = HEIGHTS.get(n, 240)
    html = f"""<!-- @dsCard group="{GROUP_TITLE[g]}" height={height} width=900 -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{n}</title>
<style>
  body {{ margin: 0; }}
  .kd-story + .kd-story {{ margin-top: 16px; }}
  .kd-story-label {{ margin: 0 0 6px; font: 600 11px/1.4 system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-soft); }}
</style>
</head>
<body>
<div id="root"></div>
<script>
{script}
</script>
</body>
</html>
"""
    write(f"components/{n}/preview.html", html)

print("wrote", sum(1 for _ in P.rglob("*") if _.is_file()), "files under", P)
