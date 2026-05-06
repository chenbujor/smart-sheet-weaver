## Goal

Bring proper "charges" to both **features** and **items**, with two improvements over today:

1. Items get the same charges system features already have (max via flat number or formula like `PB`, `1 + CHA`).
2. Both features and items get a configurable **recharge amount** that fires when the matching rest button is pressed (e.g. "regain 1d4 charges on a short rest", or "regain all on long rest").

## Data model (`src/lib/types.ts`)

Extend `InventoryItem` with the same uses fields features already have, plus a new field on **both** `CharacterFeature` and `InventoryItem`:

```ts
// new on InventoryItem
usesFormula?: string;
reset?: ResetType;
used?: number;

// new on BOTH CharacterFeature and InventoryItem
rechargeFormula?: string;   // amount restored on reset event
                            // e.g. "all", "1", "1d4", "PB", "CHA"
                            // empty/undefined = restore to full (current behavior)
```

`reset` continues to drive *which* rest event triggers the recharge (`none | short | long | dawn`). `rechargeFormula` controls *how much* is restored.

`usesFormula` already accepts plain numbers via `evalFormula` (e.g. `"3"`), so "set amount" needs no separate field — just better placeholder text.

## Recharge semantics

When a rest button is pressed:

- For each feature/item where `reset` matches the rest event:
  - `max = evalFormula(usesFormula, …)` (0 if none)
  - If `rechargeFormula` is empty or `"all"` → set `used = 0`
  - Else compute `restore` from `rechargeFormula`. Support:
    - flat number (`"1"`, `"2"`)
    - variables `PB`, `LEVEL`, ability mods (`STR`…`CHA`) — already handled by `evalFormula`
    - dice expressions like `"1d4"`, `"2d6+1"` — small new helper `rollDice(expr)` in `src/lib/rules.ts`
  - `used = clamp(used - restore, 0, max)`

This keeps the existing "full reset" behavior as the default while letting power users author partial recharges.

## Store (`src/lib/store.ts`)

- Add `setItemUsed(id, itemId, used)`, mirroring `setFeatureUsed`.
- Refactor `shortRest` / `longRest` to:
  - Apply the new recharge logic to features (replacing the current `used: 0`).
  - Apply the same logic to inventory items.
- Keep the existing `dawn` reset path consistent if/when invoked.

## UI: Equipment view (`src/components/views/EquipmentView.tsx`)

In the per-item expanded editor add a "Charges" block:

- **Max** — text input (number or formula). Placeholder: `e.g. 3, PB, 1 + CHA`.
- **Reset** — select: none / short / long / dawn.
- **Recharge** — text input, shown only when reset ≠ none. Placeholder: `all, 1, 1d4, PB`.

In the item row header, when `max > 0`, render `<Pips total={max} used={used ?? 0} onChange={(u) => setItemUsed(c.id, item.id, u)} />` plus a small `short rest` / `long rest` tag, mirroring `FeaturesView`.

## UI: Features view (`src/components/views/FeaturesView.tsx`)

Add the **Recharge** input next to the existing Uses formula / Reset fields (same visibility rule: only when reset ≠ none). Refresh placeholder copy on Uses formula to `e.g. 3, PB, 1 + CHA`.

## UI: Library tabs (`src/pages/LibraryPage.tsx`)

- `FeaturesTab` — add the Recharge input alongside the existing Uses/Reset fields.
- `ItemsTab` — add Uses formula + Reset + Recharge fields so item templates carry charges when copied to a character.

## Files touched

- `src/lib/types.ts`
- `src/lib/rules.ts` (add `rollDice` helper)
- `src/lib/store.ts` (item used setter, recharge logic in rests)
- `src/components/views/FeaturesView.tsx`
- `src/components/views/EquipmentView.tsx`
- `src/pages/LibraryPage.tsx`

All new fields are optional; existing characters/items keep working unchanged (empty recharge = restore to full, matching today's behavior).
