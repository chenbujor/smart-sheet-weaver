## Goals

1. **Unify Weapons + Items.** Weapons become Items with an optional `weapon` sub-object. Library "Weapons" tab and the character "Weapons & Attacks" panel keep working — both just read the subset of items where `weapon` is set.
2. **Grants system.** Any `CharacterFeature` (incl. class/subclass features) and any `InventoryItem` can carry a list of "grants" that automatically push:
   - an **action** into the character's action list,
   - a **spell** into the character's spell list (with `alwaysPrepared` by default for feature-granted spells),
   - one or more **bonus values** into the Bonuses & Modifiers (ability scores, saves, skills, AC, HP max, initiative, speed, passive perception, spell save DC, spell attack, max concentrations, attunement slots).

Items only grant while **equipped** (and additionally attuned, if `attunable`). Features always grant while present on the character.

---

## Data model changes (`src/lib/types.ts`)

### Unified item

```ts
interface InventoryItem {
  // existing fields…
  weapon?: {
    ability: AbilityKey;
    damageDice: string;
    damageType: string;
    proficient?: boolean;
    masteryId?: string;
    bonus?: number;
  };
  grants?: Grant[];
}
```

`Weapon` type stays as a deprecated alias (`type Weapon = InventoryItem & { weapon: NonNullable<InventoryItem['weapon']> }`) so existing imports keep compiling during the transition. `Character.weapons` is removed; everything lives in `Character.inventory`. Same for `Library.weapons` → folded into `Library.items`.

### CharacterFeature / SpellEntry

Add `grants?: Grant[]` to `CharacterFeature`. (`SpellEntry` doesn't grant.)

### Grant union

```ts
type Grant =
  | { kind: 'action'; libraryActionId: string }                      // copy of LibraryAction
  | { kind: 'spell';  librarySpellId: string;  alwaysPrepared?: boolean }
  | { kind: 'bonus';  target: BonusTarget; value: number };

type BonusTarget =
  | { type: 'ability'; key: AbilityKey }
  | { type: 'save';    key: AbilityKey }
  | { type: 'skill';   skillId: string }
  | { type: 'scalar';  key:
      'hpMax'|'ac'|'initiative'|'speed'|'passivePerception'
      |'spellSaveDc'|'spellAttack'|'maxConcentrations'|'attunementSlots' };
```

Each grant gets a stable `id` so we can dedupe.

---

## Migration (`src/lib/store.ts`)

Bump persisted version to v5:

- For every character: for each `w` in `character.weapons`, push a new `InventoryItem` `{ name, qty: 1, equipped: true, weapon: { ability, damageDice, damageType, proficient, masteryId, bonus } }` into `inventory` (skip if an inventory item with same id already exists). Then delete `character.weapons`.
- For `library.weapons`: same conversion into `library.items` with `equipped: true` default. Delete `library.weapons`.
- Backfill `grants: []` where missing.

`addWeapon` / `removeWeapon` / `updateWeapon` become thin wrappers that call the inventory mutators on items where `weapon` is set, so existing call sites keep working through the transition. New code uses `addInventory` directly with a `weapon` block.

---

## Grant resolution (new `src/lib/grants.ts`)

Pure helper, called from `deriveCharacter` and from the views:

```ts
export interface ResolvedGrants {
  actions: CharacterAction[];   // from features/items
  spells:  SpellEntry[];        // from features/items
  bonusDelta: Required<Character>['bonuses']; // additive
}

export const resolveGrants = (c: Character, lib: Library): ResolvedGrants;
```

Rules:

- Walk `c.features` → always active.
- Walk `c.inventory` → only items where `equipped` is true, and (if `attunable`) `attuned` is true.
- For each `kind:'action'` / `kind:'spell'`, look up the library entry by id and produce a synthetic copy whose `id` is `granted:${entryId}:${grantId}` and which carries an internal `grantedBy` label for UI ("granted by Magic Initiate").
- For each `kind:'bonus'`, accumulate into `bonusDelta` (ability/save: per key, skill: per id, scalar: per key).

### Wiring

- `deriveCharacter` (`src/lib/rules.ts`) merges `c.bonuses` with `bonusDelta` before computing derived values.
- `BonusesPanel` shows the user's manual bonus inputs unchanged, but renders a small read-only "from grants" line under each row so the user sees where extra +Xs come from.
- `EquipmentView` (Actions section) and `GrimoireView` render manual entries plus the granted ones (granted ones are read-only and tagged with their source; cannot be edited or deleted from the character — must be removed at the source feature/item).
- Granted spells flagged `alwaysPrepared: true` count toward the same Grimoire counter as today (and don't add to the prepared cap, matching existing 2024 logic).

---

## UI changes

### `src/pages/LibraryPage.tsx`

- Remove the "Weapons" tab. Items tab gets a new collapsible "Weapon stats" section per item with a checkbox **"This is a weapon"**; toggling on reveals the existing weapon fields (ability/damage/type/bonus/proficient/mastery).
- New shared `<GrantsEditor entry={...} />` component inside the Features tab and the Items tab and inside the per-feature editors of the Classes tab. UI:
  - Button row: "+ Action grant", "+ Spell grant", "+ Bonus grant".
  - Action grant: dropdown of `library.actions`.
  - Spell grant: dropdown of `library.spells`, plus a "Always prepared" checkbox (default on).
  - Bonus grant: target dropdown (ability/save/skill/scalar) → key dropdown → value number input.
  - Trash icon per row.

### `src/components/views/EquipmentView.tsx`

- "Weapons & Attacks" panel reads `c.inventory.filter(i => i.weapon)` instead of `c.weapons`. "Add" creates an item with `equipped: true` and a default `weapon` block; "From Library" picker for `weapons` switches to `items` filtered by `i.weapon != null` (handled inside `LibraryPicker` via a new optional `filter` prop).
- Inventory panel: items with `weapon` show a tiny "⚔" badge so the user knows it's also listed in Weapons.
- Actions list appends `granted.actions` (read-only rows, badge "from <feature/item name>").

### `src/components/views/GrimoireView.tsx`

- Spell list = `[...c.spells, ...granted.spells]`. Granted spells are read-only and labelled.

### `src/components/BonusesPanel.tsx`

- Below each scalar / per-ability / per-skill input, if a grant contributes, show `+N from grants` in faded text. Does not change how the user edits manual bonuses.

---

## Files to change

- `src/lib/types.ts` — add `Grant`, `BonusTarget`; change `InventoryItem` (add `weapon`, `grants`); add `grants?` to `CharacterFeature`; remove `Library.weapons` & `Character.weapons` (keep `Weapon` alias for back-compat).
- `src/lib/store.ts` — v5 migration, fold weapons into items, drop `Library.weapons`, keep `addWeapon`/`updateWeapon`/`removeWeapon` as inventory wrappers, add grant CRUD on features/class-features/items.
- `src/lib/grants.ts` — new resolver.
- `src/lib/rules.ts` — `deriveCharacter` merges `bonusDelta` into bonuses.
- `src/pages/LibraryPage.tsx` — remove Weapons tab, embed weapon stats into Items, wire `<GrantsEditor>` into Features tab and Classes tab feature editors.
- `src/components/LibraryPicker.tsx` — add optional `filter` predicate so the Equipment view can pick weapon-tagged items.
- `src/components/views/EquipmentView.tsx` — read weapons from inventory; render granted actions as read-only.
- `src/components/views/GrimoireView.tsx` — render granted spells; counter logic unchanged.
- `src/components/BonusesPanel.tsx` — show "from grants" hints.
- `src/components/views/FeaturesView.tsx` — surface a small "Grants" summary under each feature description; no editing here (editing happens in Library).

## Out of scope

- Conditional grants (e.g. "only when raging"). Always-on while present/equipped/attuned.
- Granting proficiencies (armor/weapon/tool/language) — current Bonuses & Modifiers model has no slot for those; can be added later as another `BonusTarget` kind.
- Re-deriving HP retroactively when a +HP grant is added — handled automatically because `hpMax` already reads from the merged bonuses each render.
