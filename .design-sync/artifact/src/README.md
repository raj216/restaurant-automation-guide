Kadmivo answers routine phone orders for independent restaurants and hands every order to the restaurant's own team to check. The brand is a calm, ruled order ticket: warm `paper`, near-black `ink`, one `terracotta` accent, Fraunces headings and Manrope text. Build with the components below; don't restyle them.

## Content fundamentals

- Write to the owner or manager: "you", "your team", "your restaurant". Kadmivo is "we" or "Kadmivo".
- Keep the team in charge in every claim: "Your team checks the order before it reaches the POS or kitchen." "No order is accepted until your team has checked it."
- Be plain and operational. Short sentences, concrete nouns (calls, orders, the POS, the kitchen, pickup times), no hype, no exclamation marks, no emoji.
- Promise small and measurable: "Start with one location and a few hours of phone coverage." "Prove or stop." "We measure completed restaurant orders—not just calls handled by software."
- Headings and buttons are sentence case. Eyebrows are typed in sentence case (the style sets capitals); card labels and the notice bar are typed in capitals ("CUSTOMER CONFIRMED").
- Punctuation: an em dash with no spaces ("the rush—not to replace your judgment"), a middle dot between facts ("Today · 8:20 PM"), an en dash for ranges ("$750–$1,500"), × for quantities ("1 × Rigatoni").

## Visual foundations

- **Color.** Set pages on `paper` with `ink` headings and `ink-soft` copy. Use `terracotta` sparingly: the one primary button per view, eyebrows, list numbers, icons, link hover. Alternate light bands with `paper-deep`. Put the control and contact stories in dark bands (`dark`, white headings, `dark-copy` paragraphs, `dark-rule` lines, `warm-on-dark` icons). Cards sit on `white`. Never add colors outside these tokens.
- **Type.** Headings in Fraunces 500, tracked tight: `h1` once per page, `h2` per section, `h3` for card titles. Open a section with a `large-copy` lead in the serif. Everything read in Manrope: `body`, `hero-lede`, `hero-emphasis`, `detail`. Labels are small, heavy and spaced: `eyebrow`, `button`, `card-label`, `notice`.
- **Layout.** Each section is a `<section>` padded `section-y` top and bottom (`section-y-phone` on phones). Inside, `className="section-grid"` gives the centred two-column grid (max `content-max`, one column on phones): intro copy on the left, a card on the right. Section-wide blocks (`RuleCallout`, `FeatureGrid`, `Timeline`) go directly in the section after its `section-grid`, never inside a column.
- **Rules, corners, shadows.** Structure lists with hairline rules in `line` (or `dark-rule` on dark), not boxes. Corners are square (`radius-square`); only dots are round (`radius-round`). The only shadow is the order ticket's hard offset (`shadow-ticket`).
- **Imagery.** No photos or illustrations. The hero image is the sample order ticket (`OrderCard`) with a thin terracotta ring behind it (`className="hero-visual"`).
- **Motion.** Entrances play once, as content scrolls into view: headings rise word by word, copy fades up, rules wipe left to right, icons draw their strokes. It is off unless the provider sets `motion="on"`, and visitors who prefer reduced motion always get the still page.
- **States.** Buttons lift 2px on hover and the primary darkens to `terracotta-dark`; links turn terracotta; arrows nudge forward. Nav links grow an underline.

## Iconography

Twelve Lucide line icons, 2px stroke on a 24px grid: arrow-right, arrow-up-right, check, check-circle, clipboard-check, clock, hand, lock, map-pin, phone, shield-check, user. In code pass the name to `Icon`, `DrawIcon` or an `icon` field; they take the surrounding text color (`terracotta` on light, `warm-on-dark` on dark). Use no other icons and no emoji. The Icons group holds terracotta SVG copies; the Logos group holds the mark.

## Building with the components

Load the stylesheet and `window.Kadmivo`, then wrap every design in `KadmivoProvider`, with the page inside `<div className="site-shell">`:

```jsx
const { KadmivoProvider, ScrollProgress, useFontsReady } = window.Kadmivo;
<KadmivoProvider>{page}</KadmivoProvider>                               // static, final state
<KadmivoProvider motion="on"><ScrollProgress />{page}</KadmivoProvider>  // the live site's motion
```

- With `motion="on"`, give above-the-fold parts `playOnLoad` and `ready={fontsReady}`, where `const fontsReady = useFontsReady(["Fraunces", "Manrope"])` in your page component. `ScrollProgress` is a fixed terracotta rule along the top.
- A page runs `NoticeBar`, `SiteHeader`, the sections, then `SiteFooter`.
- Light bands take `TrustStrip`, `NumberedList`, `WorkflowSteps`, `RuleCallout`, `Timeline`. Dark bands take `FeatureGrid`, `PromiseList`, `ArrowLink`. `ControlPanel`, `OrderCard`, `PriceCard` and `FormCard` bring their own surface.
- `Heading` takes plain text. `Text` variants: `lead`, `lede`, `emphasis`, `body`.
- `Field`, `SelectField`, `TextAreaField`, `FormGrid` and `FormActions` are styled only inside a `FormCard`; always give the card a `note`.
- The stylesheet is `components/bundle.css`: check a class there before using it. Each component's API and examples are in its card.

```jsx
const { KadmivoProvider, Eyebrow, Heading, Text, ActionRow, Button, TextLink, PriceCard, FeatureGrid } = window.Kadmivo;

<KadmivoProvider>
  <div className="site-shell">
    <section className="section-grid" style={{ padding: "125px 0" }}>
      <div>
        <Eyebrow>Start small. See if it works.</Eyebrow>
        <Heading>Start with one location and a few hours of phone coverage.</Heading>
        <Text variant="lead">We review your busiest phone hours, menu, POS and staffing first.</Text>
        <ActionRow>
          <Button href="#contact">Book a phone-order review</Button>
          <TextLink href="#trial">See the trial</TextLink>
        </ActionRow>
      </div>
      <PriceCard label="STARTING TRIAL RANGE" price="$750–$1,500" detail="Setup + $350–$600/month ongoing management" />
    </section>
    <section className="dark-section" style={{ padding: "125px 0" }}>
      <div className="section-grid">
        <div>
          <Eyebrow>Built for real restaurant operations</Eyebrow>
          <Heading>Your restaurant stays in control.</Heading>
        </div>
      </div>
      <FeatureGrid items={[
        { icon: "lock", title: "Your team checks every order", text: "Nothing reaches the kitchen unchecked." },
        { icon: "shield-check", title: "No card numbers over the phone", text: "Customers pay at pickup or online." },
        { icon: "user", title: "No guessing", text: "Unsure questions go to your team." },
      ]} />
    </section>
  </div>
</KadmivoProvider>
```

Not synced: the latin-ext font subsets (latin only here), the stylesheet's unused shadcn/ui base token `--radius`, and cards for `KadmivoProvider` and `ScrollProgress`, which are setup rather than components (both ship in the bundle and are described above). The components are the site's own build, not re-authored.
