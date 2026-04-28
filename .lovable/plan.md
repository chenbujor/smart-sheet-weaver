# Nested Keyword Popovers

## Behavior

When a glossary keyword's description contains another glossary keyword (e.g. "Paralyzed" mentions "Incapacitated"), that nested term should also be clickable/hoverable inside the popover. Opening it shows its description in a second popover anchored to the **side** of the parent popover, so both are visible at once.

- Self-references are skipped (Paralyzed inside Paralyzed's own description stays plain text).
- Hover preview and click-to-pin behavior carry over to nested terms.
- Nesting is capped at depth 3 to prevent runaway chains.

## Implementation

Single file edit: `src/components/KeywordText.tsx`.

1. Extract a `renderTokens(text, map, excludeId, depth)` helper that splits text into word/non-word tokens and returns either plain spans or `<Keyword>` components — skipping any token whose entry id matches `excludeId`.
2. Use this helper both at the top level (`KeywordText`) and inside `Keyword`'s `PopoverContent` to render the description with embedded sub-keywords.
3. Pass the prebuilt glossary `map` down into nested `Keyword` instances so each child doesn't rebuild it. Top-level `KeywordType` still subscribes to the store; nested instances reuse the passed map.
4. Add a `depth` prop (default 0). Root popover uses `side="bottom"` (current behavior); nested popovers use `side="right"` with `align="start"` so they appear next to the parent card.
5. Stop click propagation on the keyword button so clicking a nested keyword doesn't also toggle parent state unintentionally.
6. Hard-cap recursion at `depth < 3`; beyond that, render description as plain text.

No changes to `glossary.ts`, types, or any other component.
