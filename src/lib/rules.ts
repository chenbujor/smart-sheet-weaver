import type { AbilityKey, Abilities, CasterType, Character, ClassDef } from './types';

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

export const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

// 2024: PB = 2 + floor((level-1)/4)
export const proficiencyBonus = (level: number) =>
  2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);

export const cantripScalingTier = (level: number): 1 | 5 | 11 | 17 => {
  if (level >= 17) return 17;
  if (level >= 11) return 11;
  if (level >= 5) return 5;
  return 1;
};

// HP max = (hitDie at L1) + sum over each level of (avg of die rounded up + CON mod)
// Standard 2024 fixed HP: L1 = max die + CON; L2+ = (die/2 + 1) + CON
export const hpMax = (cls: ClassDef | undefined, level: number, abilities: Abilities, override?: number) => {
  if (override !== undefined && override > 0) return override;
  if (!cls) return 0;
  const con = abilityMod(abilities.con);
  const die = cls.hitDie;
  const avg = die / 2 + 1;
  const lvl = Math.max(1, level);
  return die + con + (lvl - 1) * (avg + con);
};

// Spell slots tables — 2024 (same chassis as 5e)
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3],
  5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2],
  7: [4, 3], 8: [4, 3], 9: [4, 3, 2], 10: [4, 3, 2],
  11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1], 14: [4, 3, 3, 1],
  15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
};

// Warlock pact slots: level + max slot level
const PACT_SLOTS: Record<number, { count: number; level: number }> = {
  1: { count: 1, level: 1 }, 2: { count: 2, level: 1 },
  3: { count: 2, level: 2 }, 4: { count: 2, level: 2 },
  5: { count: 2, level: 3 }, 6: { count: 2, level: 3 },
  7: { count: 2, level: 4 }, 8: { count: 2, level: 4 },
  9: { count: 2, level: 5 }, 10: { count: 2, level: 5 },
  11: { count: 3, level: 5 }, 12: { count: 3, level: 5 },
  13: { count: 3, level: 5 }, 14: { count: 3, level: 5 },
  15: { count: 3, level: 5 }, 16: { count: 3, level: 5 },
  17: { count: 4, level: 5 }, 18: { count: 4, level: 5 },
  19: { count: 4, level: 5 }, 20: { count: 4, level: 5 },
};

export const spellSlotsFor = (caster: CasterType, level: number): number[] => {
  const lvl = Math.max(1, Math.min(20, level));
  if (caster === 'full') return FULL_CASTER_SLOTS[lvl] ?? [];
  if (caster === 'half') return HALF_CASTER_SLOTS[lvl] ?? [];
  if (caster === 'third') {
    // third caster (eldritch knight / arcane trickster): starts at L3
    if (lvl < 3) return [];
    const halfEquiv = Math.ceil(lvl / 3) * 2; // approximate
    return HALF_CASTER_SLOTS[Math.min(20, halfEquiv)] ?? [];
  }
  return [];
};

export const pactSlotsFor = (level: number) => PACT_SLOTS[Math.max(1, Math.min(20, level))];

// Save DC = 8 + PB + ability mod
export const saveDC = (pb: number, abilityScore: number) =>
  8 + pb + abilityMod(abilityScore);

// Spell attack = PB + ability mod
export const spellAttack = (pb: number, abilityScore: number) =>
  pb + abilityMod(abilityScore);

// Formula evaluator for feature usesFormula. Vars: PB, LEVEL, STR/DEX/CON/INT/WIS/CHA (mods)
export const evalFormula = (
  formula: string,
  ctx: { pb: number; level: number; abilities: Abilities }
): number => {
  if (!formula?.trim()) return 0;
  const vars: Record<string, number> = {
    PB: ctx.pb,
    LEVEL: ctx.level,
    STR: abilityMod(ctx.abilities.str),
    DEX: abilityMod(ctx.abilities.dex),
    CON: abilityMod(ctx.abilities.con),
    INT: abilityMod(ctx.abilities.int),
    WIS: abilityMod(ctx.abilities.wis),
    CHA: abilityMod(ctx.abilities.cha),
  };
  let expr = formula.toUpperCase();
  for (const [k, v] of Object.entries(vars)) {
    expr = expr.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v));
  }
  // Allow only digits, operators, parens, whitespace, decimal
  if (!/^[\d+\-*/().\s]+$/.test(expr)) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)();
    const n = Math.floor(Number(result));
    return Math.max(0, isFinite(n) ? n : 0);
  } catch {
    return 0;
  }
};

// Pick the active scaling tier value
export const activeTierValue = (tiers: { level: number; value: string }[] | undefined, level: number) => {
  if (!tiers || !tiers.length) return undefined;
  const sorted = [...tiers].sort((a, b) => a.level - b.level);
  let pick = sorted[0];
  for (const t of sorted) if (level >= t.level) pick = t;
  return pick.value;
};

// Initiative = DEX mod (no PB unless feat)
export const initiative = (abilities: Abilities) => abilityMod(abilities.dex);

// Skill list for 2024 with associated abilities
export const SKILLS: { id: string; name: string; ability: AbilityKey }[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
];

export const skillBonus = (
  abilities: Abilities,
  proficiency: 'none' | 'prof' | 'expert',
  ability: AbilityKey,
  pb: number
) => {
  const base = abilityMod(abilities[ability]);
  if (proficiency === 'prof') return base + pb;
  if (proficiency === 'expert') return base + pb * 2;
  return base;
};

export const saveBonus = (
  abilities: Abilities,
  ability: AbilityKey,
  proficient: boolean,
  pb: number
) => abilityMod(abilities[ability]) + (proficient ? pb : 0);

// Derived snapshot used everywhere
export interface Derived {
  pb: number;
  hpMax: number;
  hitDiceTotal: number;
  hitDiceRemaining: number;
  initiative: number;
  spellSlots: number[];           // by level 1..n (max)
  pactSlots?: { count: number; level: number };
  cantripTier: 1 | 5 | 11 | 17;
  exhaustionPenalty: number;      // -2 per level
  passivePerception: number;
  spellSaveDcByAbility: Record<AbilityKey, number>;
  spellAttackByAbility: Record<AbilityKey, number>;
}

export const deriveCharacter = (c: Character, cls: ClassDef | undefined): Derived => {
  const pb = proficiencyBonus(c.level);
  const max = hpMax(cls, c.level, c.abilities, c.hpMaxOverride);
  const slots = cls ? spellSlotsFor(cls.caster, c.level) : [];
  const pact = cls?.caster === 'pact' ? pactSlotsFor(c.level) : undefined;
  const passive =
    10 + skillBonus(c.abilities, c.skills['perception'] ?? 'none', 'wis', pb);

  const spellSaveDcByAbility = {} as Record<AbilityKey, number>;
  const spellAttackByAbility = {} as Record<AbilityKey, number>;
  (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).forEach((a) => {
    spellSaveDcByAbility[a] = saveDC(pb, c.abilities[a]);
    spellAttackByAbility[a] = spellAttack(pb, c.abilities[a]);
  });

  return {
    pb,
    hpMax: max,
    hitDiceTotal: c.level,
    hitDiceRemaining: c.level - c.hitDiceUsed,
    initiative: initiative(c.abilities),
    spellSlots: slots,
    pactSlots: pact,
    cantripTier: cantripScalingTier(c.level),
    exhaustionPenalty: c.exhaustion * 2,
    passivePerception: passive,
    spellSaveDcByAbility,
    spellAttackByAbility,
  };
};
