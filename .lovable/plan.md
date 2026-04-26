# Plan: Dashboard cleanup + save toggle fix

## 1. Dashboard layout changes (`src/components/views/DashboardView.tsx`)

**Remove** the full embedded sections at the bottom (lines 377-387):
- Drop the embedded `<EquipmentView>` block ("Equipment" heading)
- Drop the embedded `<FeaturesView>` block ("Features & Bonuses" heading)
- Remove the corresponding imports (`FeaturesView`, `EquipmentView`)

The Dashboard will now only show its native quick-glance panels. Users go to the Equipment / Features tabs for full editing.

**Add an Actions block directly under Attacks** in the left column (inside the same `lg:col-span-2` container):
- New `<section className="parchment-panel ...">` titled "Actions" with a `Swords` icon
- Render `c.actions` in a compact read-only-ish list, mirroring the Attacks visual style:
  - Action name (font-display)
  - Action time (action / bonus / reaction) as a small tag
  - Computed roll bonus on the right (reusing the same formula as `EquipmentView`: skill modifier when `a.skill` is set, else `abilityMod + (proficient ? pb : 0)`, plus `-d.exhaustionPenalty`)
  - Damage line if `a.damageDice` set (e.g. `1d6+STR bludgeoning`)
- Keep it lean — no editing UI here. Editing stays in the Equipment tab where the full Action editor lives.
- If `c.actions` is empty, hide the section (don't show "No actions" noise).

## 2. Save proficiency toggle fix

**Investigation:** `proficientSaves` is stored as `AbilityKey[]` on the character, and `toggleSaveProficiency` correctly creates a new array each time. The data model is sound. However, the perceived "two save profiles" issue comes from inconsistent UX:

- The **Dashboard** saves panel (DashboardView.tsx lines 123–135) displays the prof dot but **has no click handler** — clicking does nothing.
- The **Classic Sheet** saves panel (ClassicView.tsx lines 100–118) toggles via `toggleSaveProficiency`.
- Result: when the user clicks a save dot on the Dashboard expecting it to toggle, nothing happens and the value appears "stuck"; switching to Classic and back can look like the value shifted, especially if they're editing on different characters or after a class change.

**Fix:**
- Make the Dashboard saves panel interactive: wrap each save in a `<button>` that calls `toggleSaveProficiency(c.id, k)`, matching the ClassicView pattern. Apply the same dot styling (`bg-oxblood` when proficient).
- Audit `proficientSaves` for any path that could mutate it by reference: confirmed all writes (`toggleSaveProficiency`, `newCharacter`) produce fresh arrays via spread. No additional store change required.
- Add a quick safety net in the `setAbility`/`updateCharacter` paths: nothing currently overwrites `proficientSaves`, but to make the save list resilient against any future class-change side effects, ensure the Classic class `<select>` does **not** reset `proficientSaves` (it currently doesn't — keep it that way; just verifying).

Net effect: a single save click — wherever it happens — flips the dot in both views, and the stored array is the only source of truth.

## 3. Files touched

- `src/components/views/DashboardView.tsx` — remove embedded Equipment + Features blocks, add Actions section under Attacks, make saves clickable.

No store / type changes needed.
