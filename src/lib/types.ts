// D&D 2024 (5.2) types

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

export type CasterType = 'full' | 'half' | 'third' | 'pact' | 'none';
export type ResetType = 'short' | 'long' | 'none' | 'dawn';
export type SourceType = 'class' | 'species' | 'feat' | 'item' | 'custom' | 'background';

export interface ClassDef {
  id: string;
  name: string;
  hitDie: number;            // 6, 8, 10, 12
  caster: CasterType;
  primaryAbility: AbilityKey[];
  saves: AbilityKey[];
}

export interface Abilities {
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}

export interface ScalingTier {
  level: number;     // class/character level threshold
  value: string;     // e.g. "2d6", or numeric
}

export interface CharacterFeature {
  id: string;
  name: string;
  source: SourceType;
  sourceLabel?: string;       // e.g. "Fighter", "Elf", "Magic Initiate"
  description: string;
  // Optional usage formula. Variables: PB, LEVEL, STR, DEX, CON, INT, WIS, CHA
  // e.g. "PB", "1 + CHA", "LEVEL"
  usesFormula?: string;
  reset?: ResetType;
  used?: number;
  tiers?: ScalingTier[];      // auto-upgrade dice/effects
  alwaysPrepared?: boolean;   // for spells from species/feats
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number;              // 0 = cantrip
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  description: string;
  higherLevels?: string;
  cantripScaling?: { 5: string; 11: string; 17: string };
  source?: SourceType;
  sourceLabel?: string;
  alwaysPrepared?: boolean;
  prepared?: boolean;
}

export interface WeaponMastery {
  id: string;
  name: string;
  description: string;
}

export interface ConditionDef {
  id: string;
  name: string;
  description: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  weight?: number;
  notes?: string;
  attunable?: boolean;
  attuned?: boolean;
  equipped?: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  ability: AbilityKey;        // attack ability (str or dex)
  damageDice: string;         // "1d8"
  damageType: string;
  proficient?: boolean;
  masteryId?: string;         // ref to WeaponMastery
  bonus?: number;             // magic +1 etc.
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  classId: string;
  level: number;
  species: string;
  background: string;
  alignment?: string;

  abilities: Abilities;
  proficientSaves: AbilityKey[];
  skills: Record<string, 'none' | 'prof' | 'expert'>;

  // HP & combat
  hpCurrent: number;
  hpTemp: number;
  hpMaxOverride?: number;     // optional manual override
  hitDiceUsed: number;
  ac?: number;
  speed: number;
  inspiration: boolean;
  exhaustion: number;         // 0-6 (2024: -2 per level to d20)
  concentration: { active: boolean; spellName?: string };
  deathSaves: { successes: number; failures: number };

  // Spell slots tracking (current uses per level 1-9; pact stored at slot level)
  spellSlotsUsed: Record<number, number>;
  pactSlotsUsed?: number;

  // Library
  features: CharacterFeature[];
  spells: SpellEntry[];
  inventory: InventoryItem[];
  weapons: Weapon[];

  // Proficiencies (free text lists, comma-separable)
  proficiencies?: {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    languages?: string[];
  };

  notes?: string;
  createdAt: number;
  updatedAt: number;
}
