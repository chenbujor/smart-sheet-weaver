// Grants resolver — converts feature/item `grants` into actions, spells, and bonus deltas
// applied automatically to the character.

import type {
  Character, Library, CharacterAction, SpellEntry, Grant, AbilityKey,
} from './types';

type BonusDelta = NonNullable<Character['bonuses']>;

export interface ResolvedGrants {
  actions: (CharacterAction & { grantedBy: string })[];
  spells:  (SpellEntry & { grantedBy: string })[];
  bonusDelta: BonusDelta;
  // For the BonusesPanel: how much did each bonus slot get from grants?
  contributions: {
    abilities: Partial<Record<AbilityKey, number>>;
    saves:     Partial<Record<AbilityKey, number>>;
    skills:    Record<string, number>;
    scalar:    Record<string, number>;
  };
}

const empty = (): ResolvedGrants => ({
  actions: [],
  spells: [],
  bonusDelta: {},
  contributions: { abilities: {}, saves: {}, skills: {}, scalar: {} },
});

const addToScalar = (b: BonusDelta, key: keyof BonusDelta, v: number) => {
  if (typeof (b as any)[key] === 'number' || (b as any)[key] === undefined) {
    (b as any)[key] = ((b as any)[key] ?? 0) + v;
  }
};

const applyGrants = (
  grants: Grant[],
  source: { id: string; name: string },
  lib: Library,
  out: ResolvedGrants,
) => {
  for (const g of grants) {
    if (g.kind === 'action') {
      const tmpl = lib.actions.find((a) => a.id === g.libraryActionId);
      if (!tmpl) continue;
      out.actions.push({
        ...tmpl,
        id: `granted:${source.id}:${g.id}`,
        grantedBy: source.name,
      } as any);
    } else if (g.kind === 'spell') {
      const tmpl = lib.spells.find((s) => s.id === g.librarySpellId);
      if (!tmpl) continue;
      out.spells.push({
        ...tmpl,
        id: `granted:${source.id}:${g.id}`,
        alwaysPrepared: g.alwaysPrepared ?? true,
        grantedBy: source.name,
      } as any);
    } else if (g.kind === 'bonus') {
      const t = g.target;
      const v = g.value || 0;
      if (!v) continue;
      if (t.type === 'ability') {
        out.bonusDelta.abilities = out.bonusDelta.abilities ?? {};
        out.bonusDelta.abilities[t.key] = (out.bonusDelta.abilities[t.key] ?? 0) + v;
        out.contributions.abilities[t.key] = (out.contributions.abilities[t.key] ?? 0) + v;
      } else if (t.type === 'save') {
        out.bonusDelta.saves = out.bonusDelta.saves ?? {};
        out.bonusDelta.saves[t.key] = (out.bonusDelta.saves[t.key] ?? 0) + v;
        out.contributions.saves[t.key] = (out.contributions.saves[t.key] ?? 0) + v;
      } else if (t.type === 'skill') {
        out.bonusDelta.skills = out.bonusDelta.skills ?? {};
        out.bonusDelta.skills[t.skillId] = (out.bonusDelta.skills[t.skillId] ?? 0) + v;
        out.contributions.skills[t.skillId] = (out.contributions.skills[t.skillId] ?? 0) + v;
      } else {
        addToScalar(out.bonusDelta, t.key as keyof BonusDelta, v);
        out.contributions.scalar[t.key] = (out.contributions.scalar[t.key] ?? 0) + v;
      }
    }
  }
};

export const resolveGrants = (c: Character, lib: Library): ResolvedGrants => {
  const out = empty();

  // Features always grant
  for (const f of c.features ?? []) {
    if (!f.grants?.length) continue;
    applyGrants(f.grants, { id: f.id, name: f.name }, lib, out);
  }

  // Items only grant when equipped (and attuned, if attunable)
  for (const it of c.inventory ?? []) {
    if (!it.grants?.length) continue;
    if (!it.equipped) continue;
    if (it.attunable && !it.attuned) continue;
    applyGrants(it.grants, { id: it.id, name: it.name }, lib, out);
  }

  return out;
};

// Merge a manual bonuses object with a delta from grants
export const mergeBonuses = (
  base: Character['bonuses'] | undefined,
  delta: BonusDelta,
): BonusDelta => {
  const b = base ?? {};
  const merged: BonusDelta = { ...b };
  // ability
  if (delta.abilities) {
    merged.abilities = { ...(b.abilities ?? {}) };
    for (const k of Object.keys(delta.abilities) as AbilityKey[]) {
      merged.abilities[k] = (merged.abilities[k] ?? 0) + (delta.abilities[k] ?? 0);
    }
  }
  if (delta.saves) {
    merged.saves = { ...(b.saves ?? {}) };
    for (const k of Object.keys(delta.saves) as AbilityKey[]) {
      merged.saves[k] = (merged.saves[k] ?? 0) + (delta.saves[k] ?? 0);
    }
  }
  if (delta.skills) {
    merged.skills = { ...(b.skills ?? {}) };
    for (const k of Object.keys(delta.skills)) {
      merged.skills[k] = (merged.skills[k] ?? 0) + (delta.skills[k] ?? 0);
    }
  }
  const scalarKeys: (keyof BonusDelta)[] = [
    'hpMax', 'ac', 'initiative', 'speed', 'passivePerception',
    'spellSaveDc', 'spellAttack', 'maxConcentrations', 'attunementSlots',
  ];
  for (const k of scalarKeys) {
    const dv = (delta as any)[k];
    if (typeof dv === 'number') (merged as any)[k] = ((merged as any)[k] ?? 0) + dv;
  }
  return merged;
};
