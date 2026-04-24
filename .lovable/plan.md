## Goals

1. Short rest should NOT require spending hit dice — it can simply reset short-rest resources (and pact slots).
2. Features should display their full description by default instead of a one-line clamp, so the user doesn't need to expand each one to read it.
3. The custom spell creation form needs an "At Higher Levels" / scaling field.

## Changes

### 1. Short Rest — make hit dice optional (`src/components/RestControls.tsx`)

- Default `diceToSpend` to `0` instead of `1`.
- Remove the `cap <= 0` early-return error toast. If 0 dice are spent, just reset short-rest features/pact slots and recover 0 HP.
- Update the toast message so spending 0 dice reads naturally (e.g. "Short rest taken — short-rest resources restored" vs the existing "spent N hit dice, recovered X HP").
- No store change needed — `shortRest` already accepts `{ rolled: 0, count: 0 }`; HP math becomes `current + 0` which is a no-op, and the features/pact-slot reset still runs.

### 2. Features — show full description by default (`src/components/views/FeaturesView.tsx`)

- Replace the collapsed-only `line-clamp-1` preview with the full description, always rendered (with `KeywordText` so condition keywords stay clickable, and `whitespace-pre-wrap` to preserve paragraph breaks).
- The chevron / expanded panel still controls the *editor* (name, source label, uses formula, reset, description textarea) — only the read-only description display changes.
- Tier line and pips remain as-is.

### 3. Custom spell — add scaling field (`src/components/views/GrimoireView.tsx`)

In the `AddSpellDialog` "Custom / Homebrew" tab:

- Add a new textarea labeled **"At Higher Levels (scaling)"** bound to `custom.higherLevels`, mirroring the description textarea styling but shorter.
- Extend the `custom` state shape with `higherLevels: ''`.
- Pass `higherLevels` through in the `onAdd({...custom, source: 'custom'})` call. The `SpellEntry` type already has an optional `higherLevels` field and the Grimoire already renders it as "At Higher Levels." below the description, so no other plumbing is required.
- Cantrip-tier scaling (the structured L5/L11/L17 object) is intentionally not exposed in the custom form to keep it simple — a single free-text scaling field covers both leveled-spell upcasting and cantrip notes.

## Out of scope

- No changes to the SRD spell list, store, or types.
- No change to long-rest behavior.
- No new memory entries.
