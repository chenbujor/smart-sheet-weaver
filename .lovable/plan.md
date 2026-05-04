## Goal

In the Library → Items editor (and same for character-sheet inventory items, optional), let the user author an action that's specific to that item — define it inline instead of having to first create it in the "Actions" library tab and then grant it.

The authored action should still flow through the existing grants pipeline so that, when the item is equipped (and attuned if needed), the action shows up in the character's Actions list, tagged with the item as its source.

## UX

Inside each item card in the Library Items tab, the existing "Grants" row gets a fourth button:

```
[+ Action]   [+ Spell]   [+ Bonus]   [+ Inline Action]
```

- **+ Action** keeps current behaviour: dropdown of existing library actions.
- **+ Inline Action** (new): expands into a compact editor right in the grants list with the same fields as a Library Action — name, action time, range, ability/skill, proficient, damage dice/type, save ability, notes. No reference to the library actions list.

Inline actions live on the item itself; they don't pollute the global Actions library.

## Data model (`src/lib/types.ts`)

Extend the `Grant` union with one new variant:

```ts
type Grant =
  | { id: string; kind: 'action';        libraryActionId: string }
  | { id: string; kind: 'inline-action'; action: Omit<LibraryAction, 'id'> }   // NEW
  | { id: string; kind: 'spell';         librarySpellId: string; alwaysPrepared?: boolean }
  | { id: string; kind: 'bonus';         target: BonusTarget; value: number };
```

No migration needed (new optional kind).

## Grants resolver (`src/lib/grants.ts`)

In `applyGrants`, add a branch for `kind === 'inline-action'` that pushes a `CharacterAction` synthesized from `g.action` (same shape as the library-lookup branch), with `id: granted:${source.id}:${g.id}` and `grantedBy: source.name`.

## GrantsEditor (`src/components/GrantsEditor.tsx`)

- Add an `addInlineAction` button.
- Render a new row component `InlineActionGrantRow` for `kind === 'inline-action'` with inline fields (name, action time select, range, ability/skill toggle + dropdown, proficient checkbox, damage dice + type, save ability, notes).
- Reuse existing styling (`bg-parchment-light`, small inputs).
- All edits patch through the same `update(id, patch)` flow already in the file.

## Where it shows up

No changes needed in `EquipmentView` / `DashboardView` — they already render `granted.actions` from `resolveGrants` and label them with `grantedBy`. Inline-action grants will appear identically, sourced from the item's name.

## Files to change

- `src/lib/types.ts` — add `inline-action` variant to `Grant`.
- `src/lib/grants.ts` — handle `inline-action` in `applyGrants`.
- `src/components/GrantsEditor.tsx` — new "+ Inline Action" button + `InlineActionGrantRow` editor.

## Out of scope

- Editing inline actions from the character sheet (still done in Library, like current grants).
- Promoting an inline action to a full library entry (could be a follow-up: a "Save to library" button on the inline editor).
- Conditional or charged actions — same always-on rules as other grants.
