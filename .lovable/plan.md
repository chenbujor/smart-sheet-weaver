## Goal

Collapse the spellbook header's two buttons — "From Library" (LibraryPicker) and "Add Spell" (which currently has its own SRD/Custom tabs) — into a single **"Add Spell"** button that opens one dialog covering both flows. The obsolete SRD list goes away in the process.

## UX

One button: `[+ Add Spell]` opens a dialog with two tabs:

```
[ From Library ]   [ Custom / Homebrew ]
```

- **From Library** (default): same search + list UI as today's `LibraryPicker` — searches the user's `library.spells`, click to add via `copyFromLibrary`.
- **Custom / Homebrew**: the existing custom-spell form from `AddSpellDialog`.

The SRD tab is removed entirely.

## Changes

**`src/components/views/GrimoireView.tsx`**
- Remove the `<LibraryPicker .../>` from the spellbook header (line 202).
- Rewrite `AddSpellDialog`:
  - Replace `tab` state values `'srd' | 'custom'` with `'library' | 'custom'`.
  - Remove SRD branch and the `SAMPLE_SPELLS` import.
  - Add a "library" branch that mirrors `LibraryPicker`'s body: search input + filtered list of `useAppStore(s => s.library.spells)`. On click, call `copyFromLibrary(c.id, 'spells', sp.id)` and close.
  - Pass `characterId` (or `copyFromLibrary` + `characterId`) into `AddSpellDialog` so it can perform the library copy itself.
- Update the empty-spellbook hint (line 220): drop "from the SRD library" — leave: "Your spellbook is empty. Add a spell, drag from a spell list, or scribe your own."

**Imports cleanup**
- Drop `SAMPLE_SPELLS` from the `@/lib/srd` import (keep `CLASSES`).
- Drop the `LibraryPicker` import.

## Out of scope

- `SAMPLE_SPELLS` stays defined in `src/lib/srd.ts` (still used by store seed logic).
- `LibraryPicker` itself is not deleted — still used by other views (Equipment, Features, etc.).
- No change to `copyFromLibrary` store action.