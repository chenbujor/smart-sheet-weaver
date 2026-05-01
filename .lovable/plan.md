## Overview

Three related additions to the codebase:

1. **Class Features library tab** — browse SRD classes with subclasses; add custom classes/subclasses with their own feature lists.
2. **Spells: spell-list tags + drag-and-drop grimoire picker** filtered by chosen class list.
3. **Grimoire prepared-spell counter** showing `prepared / max`, scaling per class via official 2024 tables.

---

## 1. Class & Subclass Library

### Data model (`src/lib/types.ts`)
Add to `Library`:
```ts
classes: ClassEntry[];

interface ClassEntry {
  id: string;          // e.g. 'wizard' or uid for custom
  name: string;
  hitDie: number;
  caster: CasterType;
  primaryAbility: AbilityKey[];
  saves: AbilityKey[];
  builtin?: boolean;          // SRD class — name/chassis non-editable
  features: CharacterFeature[]; // class features (with `level` field)
  subclasses: SubclassEntry[];
}
interface SubclassEntry {
  id: string;
  name: string;
  builtin?: boolean;
  features: CharacterFeature[];
}
```
Extend `CharacterFeature` with optional `level?: number` (gain level) for class/subclass features.

### Seeding
On first load (and via a "Re-seed SRD classes" button), populate `library.classes` from the existing `CLASSES` array in `src/lib/srd.ts`, each with empty `features`/`subclasses` (or a few sample subclass shells like Champion/Battle Master, Evocation/Abjuration, etc.). Builtin entries can have features added but the chassis (hitDie/caster/saves) is locked.

### New `ClassesTab` in `src/pages/LibraryPage.tsx`
Add `'classes'` to `TABS` (icon: `Shield` from lucide). UI:
- Left column: list of classes with `+ Add Custom Class`.
- Right column for selected class: editable header (name/hitDie/caster/saves — disabled if `builtin`), then two collapsible sections:
  - **Class Features** — list of `CharacterFeature` rows with an extra "Level" number input. Add/remove/edit using the same components as `FeaturesTab`.
  - **Subclasses** — list with `+ Add Subclass`. Each subclass expands to its own feature list.

### Store (`src/lib/store.ts`)
Add nested mutators:
- `addClass`, `updateClass`, `removeClass`
- `addSubclass(classId, …)`, `updateSubclass`, `removeSubclass`
- `addClassFeature(classId, subclassId | null, feature)`, `updateClassFeature`, `removeClassFeature`

These operate on `library.classes` and follow the existing immutable-update pattern.

### Wiring on character sheet
The character class dropdown (currently uses `CLASSES` constant) reads from `library.classes` instead, so custom classes appear. `CLASSES` becomes the seed source only.

---

## 2. Spell Lists + Drag-and-Drop Grimoire Picker

### Data model
Extend `SpellEntry` with `spellLists?: string[]` (array of class names — strings so custom classes work too).

### Library spell editor (`SpellsTab`)
Add a multi-select chip input below "Concentration": shows all class names from `library.classes`; clicking toggles inclusion. Stored as `spellLists`.

### Grimoire drag-and-drop (`src/components/views/GrimoireView.tsx`)
- New collapsible side panel "Spell Lists" (toggle button next to "From Library"). Inside:
  - Class selector (dropdown of all `library.classes` names).
  - Filtered list of `library.spells` where `spellLists` includes that class.
  - Each row is `draggable`. On `dragstart` set `dataTransfer` payload `{ spellId }`.
- Each level group section becomes a drop target (`onDragOver` preventDefault, visual ring on `dragenter`, `onDrop` calls `copyFromLibrary(characterId, 'spells', spellId)`).
- Also keep click-to-add as a fallback for accessibility.

Use native HTML5 drag-and-drop (no new dependency). The grouped sections already exist in `GrimoireView`; we add a wrapping container with drop handlers per level header.

---

## 3. Prepared Spells Counter

### Rules (`src/lib/rules.ts`)
Add 2024 PHB prepared-spells tables per caster class:
```ts
const PREPARED_BY_CLASS: Record<string, number[]> = {
  wizard:   [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,22,23,25],
  cleric:   [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,22,23,25],
  druid:    [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,22,23,25],
  bard:     [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,22,23,25],
  sorcerer: [2,4,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,22,23,25],
  warlock:  [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  paladin:  [0,2,3,4,5,6,6,7,9,9,10,10,11,11,12,12,14,14,15,15],
  ranger:   [0,2,3,4,5,6,6,7,9,9,10,10,11,11,12,12,14,14,15,15],
};
export const maxPreparedSpells = (classId: string, level: number): number | null => {
  const t = PREPARED_BY_CLASS[classId];
  return t ? t[Math.max(1, Math.min(20, level)) - 1] : null;
};
```
(Custom classes return `null` → counter shows only current count.)

### UI in `GrimoireView`
In the top stat panel, add a 5th stat block "Prepared":
```
Prepared
3 / 7
```
Count = `c.spells.filter(s => s.prepared || s.alwaysPrepared).length` (cantrips excluded; `alwaysPrepared` doesn't count toward the cap per 2024 rules, so split them: `prepared count = non-cantrip & prepared & !alwaysPrepared`).
If over the cap, render the count in `text-destructive`.

---

## Files to change

- `src/lib/types.ts` — add `ClassEntry`, `SubclassEntry`, `Library.classes`, `SpellEntry.spellLists`, optional `CharacterFeature.level`.
- `src/lib/srd.ts` — no change (still the seed).
- `src/lib/store.ts` — seed `library.classes`, new class/subclass/class-feature mutators.
- `src/lib/rules.ts` — add `PREPARED_BY_CLASS` table + `maxPreparedSpells` helper.
- `src/pages/LibraryPage.tsx` — new "Classes" tab + spell-list multi-select in `SpellsTab`.
- `src/components/views/GrimoireView.tsx` — drop targets per level, drag-source side panel, prepared counter stat block.
- Character class picker (wherever it reads `CLASSES`) — switch to `library.classes`.

## Out of scope
- Auto-granting class features on level up (still manual via Library Picker).
- Persisting non-SRD subclasses across imports beyond the existing JSON import/export (works automatically since they live in `library`).
