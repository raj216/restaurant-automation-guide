# Kadmivo brand kit: how to build with it

These are the Kadmivo website's own parts: warm paper, near-black ink, one terracotta accent, Fraunces headings, Manrope text. Compose pages from them; don't restyle them.

## Setup

Wrap every design in `KadmivoProvider`, with the page inside `<div className="site-shell">` (paper background, full height):

```jsx
<KadmivoProvider>{page}</KadmivoProvider>                               // static, final state
<KadmivoProvider motion="on"><ScrollProgress />{page}</KadmivoProvider>  // the live site's motion
```

`motion="off"` (default) suits mockups. With `motion="on"` content rises, wipes or draws in as it scrolls into view; give above-the-fold parts `playOnLoad` and `ready={fontsReady}`, where `const fontsReady = useFontsReady(["Fraunces", "Manrope"])` in your page component. `ScrollProgress` is a fixed terracotta rule along the top.

## Styling vocabulary

Plain CSS classes and custom properties from `_ds_bundle.css`. Never invent colors; use the tokens:
`--paper` #f7f4ec (page), `--paper-deep` #eee8dc (alternate band), `--ink` #20282b (text), `--ink-soft` #566064 (secondary text), `--line` #c8c4b9 (rules), `--terracotta` #a74722 (accent), `--terracotta-dark` #8f3e20, `--yellow` #f8e9a6, `--dark` #1f292c (dark band), `--dark-soft` #2b3639, `--white` #fffdf8.

- A section is a `<section>` with its own vertical padding (inline, e.g. `padding: "125px 0"`). `className="dark-section"` makes the dark band (white headings, light grey paragraphs); `background: "var(--paper-deep)"` the alternate band.
- `className="section-grid"`: the centred two-column grid (max 1180px, one column on phones). Typical: Eyebrow, Heading and Text on the left, a card on the right.
- `RuleCallout`, `FeatureGrid` and `Timeline` span the page width and bring their own top margin: put them directly in the `<section>`, after its `section-grid`, never inside a column.
- Light bands: `TrustStrip`, `NumberedList`, `WorkflowSteps`, `RuleCallout`, `Timeline`. Dark bands: `FeatureGrid`, `PromiseList`, `ArrowLink`. `ControlPanel`, `OrderCard`, `PriceCard`, `FormCard` carry their own background.
- `Heading` takes plain text. `Text` variants: `lead` (large serif opener), `lede` (hero intro), `emphasis`, `body`.
- `Field`, `SelectField`, `TextAreaField`, `FormGrid`, `FormActions` are styled only inside a `FormCard`; always give the FormCard a `note`.
- Icons are passed by name. The only names: arrow-right, arrow-up-right, check, check-circle, clipboard-check, clock, hand, lock, map-pin, phone, shield-check, user.

## Where the truth lives

`_ds_bundle.css` is the site stylesheet: grep it before using a class. Each component's API and examples: `components/<group>/<Name>/<Name>.prompt.md`.

## Example

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
