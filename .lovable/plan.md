## Overview

Build a project-wide **Library** accessible from the home screen, containing reusable templates across multiple categories. Add a **glossary** of named terms whose names will be auto-underlined and hover-described wherever they appear in any rendered text. Add a **`\` autocomplete** in every editable text field that suggests glossary terms as you type and inserts the chosen term name into the text.

## Library categories

The Library stores six kinds of entries, each with its own tab:

1. **Glossary terms** — `{ id, name, description, aliases? }`. Powers the auto-underline + hover and the `\` autocomplete. Replaces hard-coded `CONDITIONS` as the source for `KeywordText`; the SRD conditions are pre-seeded as glossary entries on first load.
2. **Spells** — full `SpellEntry` template. Quick-add to a character's grimoire.
3. **Features / Traits** — full `CharacterFeature` template (name, source, description, usesFormula, reset, tiers). Quick-add to a character's Features tab.
4. **Weapons** — `Weapon` template. Quick-add to Equipment.
5. **Items** — `InventoryItem` template. Quick-add to Inventory.
6. **Custom** — generic `{ id, name, category, description, data? }` for things that don't fit (races, factions, lore, homebrew rules). Show as hoverable terms via the glossary system if the user opts in per entry (checkbox "treat as glossary term").

All categories are persisted in the same Zustand store as characters, included in Export All / Import JSON, and editable from a single Library page.

## New routes & navigation

- `/library` — main library page with tabs for the six categories. Add a **"Library"** button next to **New Character** on the home screen header, plus a back-link from the library to the home screen.
- Add `<Route path="/library" element={<LibraryPage />} />` in `src/App.tsx`. (Rename the existing `Library.tsx` to `Home.tsx` or keep filenames and just add the new page — see Technical notes.)

## Glossary rendering (auto-match)

Replace the hard-coded condition map in `src/components/KeywordText.tsx` with a dynamic map built from `useAppStore` glossary entries (which include the SRD conditions seeded on first run). Matching stays whole-word, case-insensitive, with simple plural stripping. Aliases (optional comma list per term) also match. Matched terms render with the existing `keyword` underline style and a popover showing the term description.

This means anything stored as plain text — feature descriptions, spell descriptions, scaling text, notes — automatically gets underlined matches once a term exists in the library. No tokens are stored in saved text.

## `\` autocomplete in textareas/inputs

Create `src/components/SmartTextarea.tsx` and `src/components/SmartInput.tsx` — drop-in replacements for the existing `Textarea` / `Input` that:

- Detect `\` followed by word characters at the caret (e.g. `\pr`).
- Show a small floating popover anchored near the caret listing matching glossary entries (and aliases).
- Arrow keys / Enter to pick; Esc to dismiss; clicking a result also picks.
- On pick, replace the `\xxx` fragment with the term's display name (just the plain name — auto-match handles the underline at render time).
- If the user types a space or moves the caret away, dismiss silently.

Roll this out by replacing `Textarea` / `Input` imports inside the existing edit forms (Features view description + name, Grimoire custom-spell fields, Equipment notes, character Notes, Library forms themselves). Other inputs (numeric, level, HP) keep the plain components.

## Library page UI

Single page with a tabbed layout matching the parchment theme:

```text
[Glossary] [Spells] [Features] [Weapons] [Items] [Custom]
```

Each tab shows a list of entries with search, **Add**, **Edit**, **Delete**, and (for non-glossary tabs) a **"Used in templates only"** note. From a character sheet's Features / Grimoire / Equipment tabs, add an **"Add from Library"** button that opens a picker dialog filtered to the matching category and copies the chosen template into the character (assigning a new id).

## Store changes

In `src/lib/store.ts`:

- Add `library: { glossary: GlossaryTerm[]; spells: SpellEntry[]; features: CharacterFeature[]; weapons: Weapon[]; items: InventoryItem[]; custom: CustomEntry[] }` to `AppState`, persisted alongside characters.
- Add CRUD actions per category (`addGlossary`, `updateGlossary`, `removeGlossary`, etc.).
- Bump persist `version` to `2` and add a migration that seeds glossary from `CONDITIONS` if missing.
- Extend `exportAllJson` / `importAll` / `parseImport` to round-trip the library.
- Add helper `addFromLibrary(characterId, category, libraryEntryId)` that copies the template with a fresh id.

## New types in `src/lib/types.ts`

```ts
export interface GlossaryTerm {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
}

export interface CustomEntry {
  id: string;
  name: string;
  category: string;     // free text bucket: "Race", "Faction", "Lore"…
  description: string;
  treatAsGlossary?: boolean;  // if true, name is also auto-underlined like a glossary term
}
```

## Files added / changed

- **New** `src/pages/LibraryPage.tsx` — tabbed library editor.
- **New** `src/components/library/GlossaryEditor.tsx`, `SpellTemplateEditor.tsx`, `FeatureTemplateEditor.tsx`, `WeaponTemplateEditor.tsx`, `ItemTemplateEditor.tsx`, `CustomEditor.tsx`.
- **New** `src/components/library/LibraryPicker.tsx` — modal picker reused by character views.
- **New** `src/components/SmartTextarea.tsx`, `src/components/SmartInput.tsx` — backslash autocomplete components.
- **Edit** `src/components/KeywordText.tsx` — read glossary from store; include alias map and `treatAsGlossary` custom entries.
- **Edit** `src/lib/store.ts` — library state + actions + import/export + persist v2 migration.
- **Edit** `src/lib/types.ts` — add `GlossaryTerm`, `CustomEntry`, `Library` shape.
- **Edit** `src/App.tsx` — add `/library` route.
- **Edit** `src/pages/Library.tsx` (the home screen) — add "Library" nav button.
- **Edit** `src/components/views/FeaturesView.tsx`, `GrimoireView.tsx`, `EquipmentView.tsx` — add **Add from Library** button + swap relevant `Textarea`/`Input` for `SmartTextarea`/`SmartInput`.

## Out of scope

- No explicit `[[term]]` tokens — everything is auto-matched by glossary name on render.
- No backend; all library data is local-storage and JSON export/import.
- No rich-text editing (bold/italic) — only the `\` autocomplete and the existing `whitespace-pre-wrap` formatting.
- No bulk import of SRD content into the library beyond the existing pre-seeded conditions.
