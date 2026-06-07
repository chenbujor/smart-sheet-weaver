import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

const STORAGE_KEY = 'dnd2024-vault';

// Track the write sequence we last observed/wrote, to detect cross-tab races.
let lastSeenSeq = 0;
let storageListenerAttached = false;

const guardedLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(name);
    if (raw && name === STORAGE_KEY) {
      try {
        const parsed = JSON.parse(raw);
        const seq = Number(parsed?.state?._writeSeq) || 0;
        if (seq > lastSeenSeq) lastSeenSeq = seq;
      } catch { /* ignore */ }
    }
    return raw;
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    if (name === STORAGE_KEY) {
      // Check if another tab wrote a newer payload than what we last saw.
      const existingRaw = window.localStorage.getItem(name);
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          const existingSeq = Number(existing?.state?._writeSeq) || 0;
          if (existingSeq > lastSeenSeq) {
            // Another tab has newer data — don't clobber. Pull it in instead.
            lastSeenSeq = existingSeq;
            // Defer rehydrate so we don't recurse inside the current set().
            queueMicrotask(() => {
              try { (useAppStore as any).persist?.rehydrate?.(); } catch { /* ignore */ }
            });
            return;
          }
        } catch { /* ignore parse errors and proceed with write */ }
      }
      // Stamp our write with an incremented seq so other tabs notice.
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          parsed.state = parsed.state ?? {};
          const nextSeq = Math.max(lastSeenSeq, Number(parsed.state._writeSeq) || 0) + 1;
          parsed.state._writeSeq = nextSeq;
          lastSeenSeq = nextSeq;
          window.localStorage.setItem(name, JSON.stringify(parsed));
          return;
        }
      } catch { /* fall through to plain write */ }
    }
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};
import type {
  Character, AbilityKey, CharacterFeature, SpellEntry, Weapon, InventoryItem,
  GlossaryTerm, CustomEntry, Library, LibraryCategory,
  LibraryAction, CharacterAction, ClassEntry, SubclassEntry,
} from './types';
import { CLASSES, CONDITIONS, SAMPLE_SPELLS } from './srd';
import { hpMax, spellSlotsFor, pactSlotsFor, evalFormula, computeRecharge } from './rules';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const seedGlossary = (): GlossaryTerm[] =>
  CONDITIONS.map((c) => ({ id: c.id, name: c.name, description: c.description }));

const seedActions = (): LibraryAction[] => [
  {
    id: 'shove',
    name: 'Shove',
    description: 'Replace one of the attacks of your Attack action with a Strength (Athletics) check vs. the target\'s Athletics or Acrobatics. On a success, push 5 ft or knock prone.',
    actionTime: 'action',
    range: '5 ft',
    skill: 'athletics',
    proficient: true,
  },
  {
    id: 'grapple',
    name: 'Grapple',
    description: 'Replace one attack with a Strength (Athletics) check vs. the target\'s Athletics or Acrobatics. On a success, the target has the Grappled condition.',
    actionTime: 'action',
    range: '5 ft',
    skill: 'athletics',
    proficient: true,
  },
  {
    id: 'unarmed-strike',
    name: 'Unarmed Strike',
    description: 'Make a melee attack roll against a creature within 5 ft. On a hit, the target takes bludgeoning damage equal to 1 + your Strength modifier.',
    actionTime: 'action',
    range: '5 ft',
    ability: 'str',
    proficient: true,
    damageDice: '1',
    damageType: 'bludgeoning',
  },
];

const seedBasicActions = (): import('./types').BasicActionEntry[] => [
  { id: 'ba-attack', name: 'Attack', slot: 'action', meta: 'Standard combat action', description: 'Make one melee or ranged attack. Some features (like Extra Attack) let you make more.', builtin: true },
  { id: 'ba-unarmed', name: 'Unarmed Strike', slot: 'action', meta: 'Melee · 5 ft', description: 'Choose Damage, Grapple, or Shove. Damage: melee attack, 1 + STR bludgeoning. Grapple: target makes STR or DEX save vs your Unarmed Strike DC (8 + STR + PB), on fail it is Grappled. Shove: same save, push 5 ft or knock Prone.', builtin: true },
  { id: 'ba-dash', name: 'Dash', slot: 'action', description: 'Gain extra movement equal to your Speed for the current turn.', builtin: true },
  { id: 'ba-disengage', name: 'Disengage', slot: 'action', description: 'Your movement doesn\'t provoke Opportunity Attacks for the rest of the turn.', builtin: true },
  { id: 'ba-dodge', name: 'Dodge', slot: 'action', description: 'Until the start of your next turn, attack rolls against you have Disadvantage (if you can see the attacker) and you have Advantage on DEX saves. Lost if Incapacitated or Speed 0.', builtin: true },
  { id: 'ba-help', name: 'Help', slot: 'action', description: 'Aid an ally: give them Advantage on their next ability check (within 5 ft, before your next turn) OR Advantage on the next attack roll against a creature within 5 ft of you.', builtin: true },
  { id: 'ba-hide', name: 'Hide', slot: 'action', description: 'Make a DEX (Stealth) check while out of any enemy\'s line of sight to gain the Invisible condition.', builtin: true },
  { id: 'ba-influence', name: 'Influence', slot: 'action', meta: 'Social', description: 'Interact socially to change a creature\'s attitude. The DM may call for a Charisma check (Deception, Intimidation, Performance, or Persuasion) or Wisdom (Animal Handling).', builtin: true },
  { id: 'ba-magic', name: 'Magic', slot: 'action', description: 'Cast a spell with a casting time of an action, or use a magic feature that requires a Magic action.', builtin: true },
  { id: 'ba-ready', name: 'Ready', slot: 'action', description: 'Choose a trigger and a prepared action or movement. When the trigger occurs before the start of your next turn, you may use your Reaction to act. Concentration is required.', builtin: true },
  { id: 'ba-search', name: 'Search', slot: 'action', description: 'Make a Wisdom check (Insight, Medicine, Perception, or Survival) to look for something.', builtin: true },
  { id: 'ba-study', name: 'Study', slot: 'action', description: 'Make an Intelligence check (Arcana, History, Investigation, Nature, or Religion) to recall lore or analyze.', builtin: true },
  { id: 'ba-utilize', name: 'Utilize', slot: 'action', description: 'Use a non-magical object, such as drinking a potion you give to another creature or activating a mundane device.', builtin: true },
  { id: 'ba-twf', name: 'Two-Weapon Fighting (offhand)', slot: 'bonus', description: 'After taking the Attack action with a Light weapon in one hand, use a Bonus Action to attack with a different Light weapon in the other hand. No ability mod on damage unless negative.', builtin: true },
  { id: 'ba-opp', name: 'Opportunity Attack', slot: 'reaction', description: 'When a creature you can see moves out of your reach, use your Reaction to make one melee attack against it.', builtin: true },
  { id: 'ba-ready-trig', name: 'Ready (triggered)', slot: 'reaction', description: 'When the trigger from a Ready action occurs, take the prepared action as your Reaction.', builtin: true },
];

const seedClasses = (): ClassEntry[] =>
  CLASSES.map((c) => ({
    ...c,
    builtin: true,
    features: [],
    subclasses: [],
  }));

const emptyLibrary = (): Library => ({
  glossary: seedGlossary(),
  spells: [],
  features: [],
  items: [],
  actions: seedActions(),
  basicActions: seedBasicActions(),
  custom: [],
  classes: seedClasses(),
  species: [],
  backgrounds: [],
});

export const newCharacter = (name = 'New Adventurer'): Character => {
  const cls = CLASSES.find((c) => c.id === 'fighter')!;
  const abilities = { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 };
  const max = hpMax(cls, 1, abilities);
  return {
    id: uid(),
    name,
    classId: cls.id,
    level: 1,
    species: 'Human',
    background: 'Soldier',
    abilities,
    proficientSaves: cls.saves,
    skills: {},
    hpCurrent: max,
    hpTemp: 0,
    hitDiceUsed: 0,
    ac: 16,
    speed: 30,
    inspiration: false,
    exhaustion: 0,
    concentration: { active: false },
    deathSaves: { successes: 0, failures: 0 },
    spellSlotsUsed: {},
    pactSlotsUsed: 0,
    features: [],
    spells: [],
    inventory: [],
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

interface AppState {
  characters: Record<string, Character>;
  library: Library;
  // mutations
  addCharacter: (c?: Character) => string;
  deleteCharacter: (id: string) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  setAbility: (id: string, key: AbilityKey, value: number) => void;
  toggleSaveProficiency: (id: string, key: AbilityKey) => void;
  setSkill: (id: string, skillId: string, val: 'none' | 'prof' | 'expert') => void;
  // resources
  setHp: (id: string, current: number, temp?: number) => void;
  setSpellSlotUsed: (id: string, slotLevel: number, used: number) => void;
  setPactSlotUsed: (id: string, used: number) => void;
  setFeatureUsed: (id: string, featureId: string, used: number) => void;
  setItemUsed: (id: string, itemId: string, used: number) => void;
  setGrantUsed: (id: string, source: { kind: 'feature' | 'item'; sourceId: string; grantId: string }, used: number) => void;
  // features / spells / inventory
  addFeature: (id: string, f: Omit<CharacterFeature, 'id'>) => void;
  removeFeature: (id: string, fid: string) => void;
  updateFeature: (id: string, fid: string, patch: Partial<CharacterFeature>) => void;
  addSpell: (id: string, s: Omit<SpellEntry, 'id'>) => void;
  removeSpell: (id: string, sid: string) => void;
  updateSpell: (id: string, sid: string, patch: Partial<SpellEntry>) => void;
  addWeapon: (id: string, w: { name?: string; ability?: AbilityKey; damageDice?: string; damageType?: string; proficient?: boolean; masteryId?: string; bonus?: number; notes?: string }) => void;
  removeWeapon: (id: string, wid: string) => void;
  updateWeapon: (id: string, wid: string, patch: { name?: string; notes?: string; ability?: AbilityKey; damageDice?: string; damageType?: string; proficient?: boolean; masteryId?: string; bonus?: number }) => void;
  addInventory: (id: string, i: Omit<InventoryItem, 'id'>) => void;
  removeInventory: (id: string, iid: string) => void;
  updateInventory: (id: string, iid: string, patch: Partial<InventoryItem>) => void;
  addAction: (id: string, a: Omit<CharacterAction, 'id'>) => void;
  removeAction: (id: string, aid: string) => void;
  updateAction: (id: string, aid: string, patch: Partial<CharacterAction>) => void;
  // rests
  shortRest: (id: string, hitDiceSpent: { rolled: number; count: number }) => void;
  longRest: (id: string) => void;
  // library CRUD (generic)
  addLibraryEntry: <K extends LibraryCategory>(category: K, entry: Omit<Library[K][number], 'id'> & { id?: string }) => string;
  updateLibraryEntry: <K extends LibraryCategory>(category: K, id: string, patch: Partial<Library[K][number]>) => void;
  removeLibraryEntry: (category: LibraryCategory, id: string) => void;
  copyFromLibrary: (
    characterId: string,
    category: 'spells' | 'features' | 'weapons' | 'items' | 'actions',
    libraryEntryId: string,
  ) => void;
  resetGlossary: () => void;
  // class library
  addClass: (entry?: Partial<ClassEntry>) => string;
  updateClass: (id: string, patch: Partial<ClassEntry>) => void;
  removeClass: (id: string) => void;
  resetClasses: () => void;
  addSubclass: (classId: string, name?: string) => string;
  updateSubclass: (classId: string, subId: string, patch: Partial<SubclassEntry>) => void;
  removeSubclass: (classId: string, subId: string) => void;
  addClassFeature: (classId: string, subId: string | null, feature?: Partial<CharacterFeature>) => string;
  updateClassFeature: (classId: string, subId: string | null, fid: string, patch: Partial<CharacterFeature>) => void;
  removeClassFeature: (classId: string, subId: string | null, fid: string) => void;
  // io
  importCharacters: (data: Character[]) => void;
  importAll: (state: { characters?: Record<string, Character>; library?: Library }) => void;
}

const touch = (c: Character): Character => ({ ...c, updatedAt: Date.now() });

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: {},
      library: emptyLibrary(),

      addCharacter: (c) => {
        const ch = c ?? newCharacter();
        set((s) => ({ characters: { ...s.characters, [ch.id]: ch } }));
        return ch.id;
      },

      deleteCharacter: (id) =>
        set((s) => {
          const next = { ...s.characters };
          delete next[id];
          return { characters: next };
        }),

      updateCharacter: (id, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return { characters: { ...s.characters, [id]: touch({ ...cur, ...patch }) } };
        }),

      setAbility: (id, key, value) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, abilities: { ...cur.abilities, [key]: value } }),
            },
          };
        }),

      toggleSaveProficiency: (id, key) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const has = cur.proficientSaves.includes(key);
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                proficientSaves: has
                  ? cur.proficientSaves.filter((k) => k !== key)
                  : [...cur.proficientSaves, key],
              }),
            },
          };
        }),

      setSkill: (id, skillId, val) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const skills = { ...cur.skills, [skillId]: val };
          if (val === 'none') delete skills[skillId];
          return { characters: { ...s.characters, [id]: touch({ ...cur, skills }) } };
        }),

      setHp: (id, current, temp) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, hpCurrent: current, hpTemp: temp ?? cur.hpTemp }),
            },
          };
        }),

      setSpellSlotUsed: (id, slotLevel, used) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                spellSlotsUsed: { ...cur.spellSlotsUsed, [slotLevel]: Math.max(0, used) },
              }),
            },
          };
        }),

      setPactSlotUsed: (id, used) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return { characters: { ...s.characters, [id]: touch({ ...cur, pactSlotsUsed: Math.max(0, used) }) } };
        }),

      setFeatureUsed: (id, featureId, used) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                features: cur.features.map((f) => (f.id === featureId ? { ...f, used: Math.max(0, used) } : f)),
              }),
            },
          };
        }),

      setItemUsed: (id, itemId, used) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                inventory: cur.inventory.map((i) => (i.id === itemId ? { ...i, used: Math.max(0, used) } : i)),
              }),
            },
          };
        }),

      setGrantUsed: (id, { kind, sourceId, grantId }, used) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const patchGrants = (grants: NonNullable<CharacterFeature['grants']>) =>
            grants.map((g) =>
              g.id !== grantId
                ? g
                : ({ ...g, uses: { ...(g.uses ?? {}), used: Math.max(0, used) } } as typeof g),
            );
          if (kind === 'feature') {
            return {
              characters: {
                ...s.characters,
                [id]: touch({
                  ...cur,
                  features: cur.features.map((f) =>
                    f.id !== sourceId || !f.grants ? f : { ...f, grants: patchGrants(f.grants) },
                  ),
                }),
              },
            };
          }
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                inventory: cur.inventory.map((i) =>
                  i.id !== sourceId || !i.grants ? i : { ...i, grants: patchGrants(i.grants) },
                ),
              }),
            },
          };
        }),

      addFeature: (id, f) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, features: [...cur.features, { ...f, id: uid() }] }),
            },
          };
        }),

      removeFeature: (id, fid) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, features: cur.features.filter((f) => f.id !== fid) }),
            },
          };
        }),

      updateFeature: (id, fid, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                features: cur.features.map((f) => (f.id === fid ? { ...f, ...patch } : f)),
              }),
            },
          };
        }),

      addSpell: (id, sp) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, spells: [...cur.spells, { ...sp, id: uid() }] }),
            },
          };
        }),

      removeSpell: (id, sid) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, spells: cur.spells.filter((sp) => sp.id !== sid) }),
            },
          };
        }),

      updateSpell: (id, sid, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                spells: cur.spells.map((sp) => (sp.id === sid ? { ...sp, ...patch } : sp)),
              }),
            },
          };
        }),

      // Weapons are now inventory items with a `weapon` block. These wrappers
      // keep older callsites working: addWeapon(c, { ability, damageDice, ... })
      // pushes a new equipped inventory item with the weapon stats attached.
      addWeapon: (id, w: any) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const { name, notes, ...stats } = w;
          const item: InventoryItem = {
            id: uid(),
            name: name ?? 'New Weapon',
            qty: 1,
            equipped: true,
            notes,
            weapon: {
              ability: stats.ability ?? 'str',
              damageDice: stats.damageDice ?? '1d6',
              damageType: stats.damageType ?? 'slashing',
              proficient: stats.proficient ?? true,
              masteryId: stats.masteryId,
              bonus: stats.bonus,
            },
          };
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, inventory: [...cur.inventory, item] }),
            },
          };
        }),

      removeWeapon: (id, wid) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, inventory: cur.inventory.filter((i) => i.id !== wid) }),
            },
          };
        }),

      updateWeapon: (id, wid, patch: any) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          // Split patch: top-level item fields vs weapon-stats fields
          const { name, notes, ...rest } = patch;
          const itemPatch: Partial<InventoryItem> = {};
          if (name !== undefined) itemPatch.name = name;
          if (notes !== undefined) itemPatch.notes = notes;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                inventory: cur.inventory.map((i) => {
                  if (i.id !== wid) return i;
                  return {
                    ...i,
                    ...itemPatch,
                    weapon: { ...(i.weapon ?? { ability: 'str', damageDice: '1d6', damageType: 'slashing' }), ...rest },
                  };
                }),
              }),
            },
          };
        }),

      addInventory: (id, i) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, inventory: [...cur.inventory, { ...i, id: uid() }] }),
            },
          };
        }),

      removeInventory: (id, iid) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, inventory: cur.inventory.filter((i) => i.id !== iid) }),
            },
          };
        }),

      updateInventory: (id, iid, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                inventory: cur.inventory.map((i) => (i.id === iid ? { ...i, ...patch } : i)),
              }),
            },
          };
        }),

      addAction: (id, a) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, actions: [...(cur.actions ?? []), { ...a, id: uid() }] }),
            },
          };
        }),

      removeAction: (id, aid) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, actions: (cur.actions ?? []).filter((a) => a.id !== aid) }),
            },
          };
        }),

      updateAction: (id, aid, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                actions: (cur.actions ?? []).map((a) => (a.id === aid ? { ...a, ...patch } : a)),
              }),
            },
          };
        }),

      shortRest: (id, { rolled, count }) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const ctx = { pb: 2 + Math.floor((Math.max(1, cur.level) - 1) / 4), level: cur.level, abilities: cur.abilities };
          const matches = (reset: string | undefined, event: 'short' | 'long') =>
            reset === event || (event === 'long' && reset === 'short');
          const rechargeOn = (entity: { usesFormula?: string; reset?: string; used?: number; rechargeFormula?: string }, event: 'short' | 'long') => {
            if (!matches(entity.reset, event)) return entity;
            const max = entity.usesFormula ? evalFormula(entity.usesFormula, ctx) : 0;
            if (max <= 0) return { ...entity, used: 0 };
            const restore = computeRecharge(entity.rechargeFormula, max, ctx);
            const used = Math.max(0, Math.min(max, (entity.used ?? 0) - restore));
            return { ...entity, used };
          };
          const rechargeGrants = (grants: NonNullable<CharacterFeature['grants']> | undefined, event: 'short' | 'long') => {
            if (!grants?.length) return grants;
            return grants.map((g) => {
              const u = g.uses;
              if (!u || !matches(u.reset, event)) return g;
              const max = u.formula ? evalFormula(u.formula, ctx) : 0;
              if (max <= 0) return { ...g, uses: { ...u, used: 0 } } as typeof g;
              const restore = computeRecharge(u.rechargeFormula, max, ctx);
              const used = Math.max(0, Math.min(max, (u.used ?? 0) - restore));
              return { ...g, uses: { ...u, used } } as typeof g;
            });
          };
          const newHpCurrent = Math.min(
            (cur.hpMaxOverride ?? Number.MAX_SAFE_INTEGER),
            cur.hpCurrent + rolled
          );
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                hpCurrent: newHpCurrent,
                hitDiceUsed: Math.min(cur.level, cur.hitDiceUsed + count),
                features: cur.features.map((f) => {
                  const r = rechargeOn(f, 'short') as typeof f;
                  return { ...r, grants: rechargeGrants(f.grants, 'short') };
                }),
                inventory: cur.inventory.map((i) => {
                  const r = rechargeOn(i, 'short') as typeof i;
                  return { ...r, grants: rechargeGrants(i.grants, 'short') };
                }),
                pactSlotsUsed: 0,
              }),
            },
          };
        }),

      longRest: (id) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          const cls = CLASSES.find((c) => c.id === cur.classId);
          const max = hpMax(cls, cur.level, cur.abilities, cur.hpMaxOverride);
          const recover = Math.max(1, Math.floor(cur.level / 2));
          const ctx = { pb: 2 + Math.floor((Math.max(1, cur.level) - 1) / 4), level: cur.level, abilities: cur.abilities };
          const rechargeOnLong = (entity: { usesFormula?: string; reset?: string; used?: number; rechargeFormula?: string }) => {
            if (entity.reset !== 'short' && entity.reset !== 'long') return entity;
            const m = entity.usesFormula ? evalFormula(entity.usesFormula, ctx) : 0;
            if (m <= 0) return { ...entity, used: 0 };
            const restore = computeRecharge(entity.rechargeFormula, m, ctx);
            const used = Math.max(0, Math.min(m, (entity.used ?? 0) - restore));
            return { ...entity, used };
          };
          const rechargeGrantsLong = (grants: NonNullable<CharacterFeature['grants']> | undefined) => {
            if (!grants?.length) return grants;
            return grants.map((g) => {
              const u = g.uses;
              if (!u || (u.reset !== 'short' && u.reset !== 'long')) return g;
              const m = u.formula ? evalFormula(u.formula, ctx) : 0;
              if (m <= 0) return { ...g, uses: { ...u, used: 0 } } as typeof g;
              const restore = computeRecharge(u.rechargeFormula, m, ctx);
              const used = Math.max(0, Math.min(m, (u.used ?? 0) - restore));
              return { ...g, uses: { ...u, used } } as typeof g;
            });
          };
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                hpCurrent: max,
                hpTemp: 0,
                hitDiceUsed: Math.max(0, cur.hitDiceUsed - recover),
                spellSlotsUsed: {},
                pactSlotsUsed: 0,
                exhaustion: Math.max(0, cur.exhaustion - 1),
                features: cur.features.map((f) => {
                  const r = rechargeOnLong(f) as typeof f;
                  return { ...r, grants: rechargeGrantsLong(f.grants) };
                }),
                inventory: cur.inventory.map((i) => {
                  const r = rechargeOnLong(i) as typeof i;
                  return { ...r, grants: rechargeGrantsLong(i.grants) };
                }),
                concentration: { active: false },
                deathSaves: { successes: 0, failures: 0 },
              }),
            },
          };
        }),

      importCharacters: (chars) =>
        set((s) => {
          const next = { ...s.characters };
          chars.forEach((c) => {
            const id = c.id || uid();
            next[id] = { ...c, id };
          });
          return { characters: next };
        }),

      importAll: (data) =>
        set((s) => ({
          characters: data.characters ?? s.characters,
          library: data.library
            ? {
                glossary: data.library.glossary ?? s.library.glossary,
                spells: data.library.spells ?? s.library.spells,
                features: data.library.features ?? s.library.features,
                items: data.library.items ?? s.library.items,
                actions: data.library.actions ?? s.library.actions,
                basicActions: data.library.basicActions ?? s.library.basicActions ?? seedBasicActions(),
                custom: data.library.custom ?? s.library.custom,
                classes: data.library.classes ?? s.library.classes,
                species: data.library.species ?? s.library.species ?? [],
                backgrounds: data.library.backgrounds ?? s.library.backgrounds ?? [],
              }
            : s.library,
        })),

      // ----- Library CRUD ----------------------------------------------
      addLibraryEntry: (category, entry) => {
        const id = (entry as any).id || uid();
        set((s) => {
          const list = (s.library[category] as any[]).slice();
          list.push({ ...(entry as any), id });
          return { library: { ...s.library, [category]: list } as Library };
        });
        return id;
      },

      updateLibraryEntry: (category, id, patch) =>
        set((s) => {
          const list = (s.library[category] as any[]).map((e) =>
            e.id === id ? { ...e, ...(patch as any) } : e,
          );
          return { library: { ...s.library, [category]: list } as Library };
        }),

      removeLibraryEntry: (category, id) =>
        set((s) => {
          const list = (s.library[category] as any[]).filter((e) => e.id !== id);
          return { library: { ...s.library, [category]: list } as Library };
        }),

      copyFromLibrary: (characterId, category, libraryEntryId) =>
        set((s) => {
          const cur = s.characters[characterId];
          if (!cur) return s;
          // 'weapons' category: pick from library.items where item has weapon stats
          const sourceCat: LibraryCategory = category === 'weapons' ? 'items' : (category as LibraryCategory);
          const tmpl = (s.library[sourceCat] as any[]).find((e) => e.id === libraryEntryId);
          if (!tmpl) return s;
          const copy = { ...tmpl, id: uid() };
          const next = { ...cur } as Character;
          if (category === 'spells') next.spells = [...cur.spells, copy as SpellEntry];
          if (category === 'features') next.features = [...cur.features, copy as CharacterFeature];
          if (category === 'weapons' || category === 'items') {
            const item = category === 'weapons' ? { ...copy, equipped: true } : copy;
            next.inventory = [...cur.inventory, item as InventoryItem];
          }
          if (category === 'actions') next.actions = [...(cur.actions ?? []), copy as CharacterAction];
          return { characters: { ...s.characters, [characterId]: touch(next) } };
        }),

      resetGlossary: () =>
        set((s) => ({ library: { ...s.library, glossary: seedGlossary() } })),

      // ----- Class library ---------------------------------------------
      addClass: (entry) => {
        const id = entry?.id || uid();
        const newClass: ClassEntry = {
          id,
          name: entry?.name ?? 'New Class',
          hitDie: entry?.hitDie ?? 8,
          caster: entry?.caster ?? 'none',
          primaryAbility: entry?.primaryAbility ?? ['str'],
          saves: entry?.saves ?? ['str', 'con'],
          builtin: false,
          features: entry?.features ?? [],
          subclasses: entry?.subclasses ?? [],
        };
        set((s) => ({ library: { ...s.library, classes: [...s.library.classes, newClass] } }));
        return id;
      },

      updateClass: (id, patch) =>
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),

      removeClass: (id) =>
        set((s) => ({
          library: { ...s.library, classes: s.library.classes.filter((c) => c.id !== id) },
        })),

      resetClasses: () =>
        set((s) => {
          const have = new Set(s.library.classes.map((c) => c.id));
          const merged = [...s.library.classes];
          for (const seed of seedClasses()) if (!have.has(seed.id)) merged.push(seed);
          return { library: { ...s.library, classes: merged } };
        }),

      addSubclass: (classId, name) => {
        const subId = uid();
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) =>
              c.id === classId
                ? { ...c, subclasses: [...c.subclasses, { id: subId, name: name ?? 'New Subclass', features: [] }] }
                : c,
            ),
          },
        }));
        return subId;
      },

      updateSubclass: (classId, subId, patch) =>
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) =>
              c.id === classId
                ? { ...c, subclasses: c.subclasses.map((sb) => (sb.id === subId ? { ...sb, ...patch } : sb)) }
                : c,
            ),
          },
        })),

      removeSubclass: (classId, subId) =>
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) =>
              c.id === classId ? { ...c, subclasses: c.subclasses.filter((sb) => sb.id !== subId) } : c,
            ),
          },
        })),

      addClassFeature: (classId, subId, feature) => {
        const fid = uid();
        const f: CharacterFeature = {
          name: 'New Feature',
          source: 'class',
          description: '',
          reset: 'none',
          level: 1,
          ...feature,
          id: fid,
        };
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) => {
              if (c.id !== classId) return c;
              if (subId === null) return { ...c, features: [...c.features, f] };
              return {
                ...c,
                subclasses: c.subclasses.map((sb) =>
                  sb.id === subId ? { ...sb, features: [...sb.features, f] } : sb,
                ),
              };
            }),
          },
        }));
        return fid;
      },

      updateClassFeature: (classId, subId, fid, patch) =>
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) => {
              if (c.id !== classId) return c;
              if (subId === null) {
                return { ...c, features: c.features.map((f) => (f.id === fid ? { ...f, ...patch } : f)) };
              }
              return {
                ...c,
                subclasses: c.subclasses.map((sb) =>
                  sb.id === subId
                    ? { ...sb, features: sb.features.map((f) => (f.id === fid ? { ...f, ...patch } : f)) }
                    : sb,
                ),
              };
            }),
          },
        })),

      removeClassFeature: (classId, subId, fid) =>
        set((s) => ({
          library: {
            ...s.library,
            classes: s.library.classes.map((c) => {
              if (c.id !== classId) return c;
              if (subId === null) return { ...c, features: c.features.filter((f) => f.id !== fid) };
              return {
                ...c,
                subclasses: c.subclasses.map((sb) =>
                  sb.id === subId ? { ...sb, features: sb.features.filter((f) => f.id !== fid) } : sb,
                ),
              };
            }),
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(() => guardedLocalStorage),
      onRehydrateStorage: () => () => {
        if (typeof window === 'undefined' || storageListenerAttached) return;
        storageListenerAttached = true;
        window.addEventListener('storage', (e) => {
          if (e.key !== STORAGE_KEY || !e.newValue) return;
          try {
            const parsed = JSON.parse(e.newValue);
            const seq = Number(parsed?.state?._writeSeq) || 0;
            if (seq > lastSeenSeq) {
              lastSeenSeq = seq;
              (useAppStore as any).persist?.rehydrate?.();
            }
          } catch { /* ignore */ }
        });
      },
      migrate: (persisted: any, fromVersion) => {
        if (!persisted) return persisted;
        if (fromVersion < 2) {
          persisted.library = persisted.library ?? emptyLibrary();
          // ensure SRD conditions are present in glossary
          const have = new Set((persisted.library.glossary as GlossaryTerm[]).map((g) => g.id));
          for (const seed of seedGlossary()) {
            if (!have.has(seed.id)) persisted.library.glossary.push(seed);
          }
        }
        if (fromVersion < 3) {
          persisted.library = persisted.library ?? emptyLibrary();
          if (!Array.isArray(persisted.library.actions)) {
            persisted.library.actions = seedActions();
          }
        }
        if (fromVersion < 4) {
          persisted.library = persisted.library ?? emptyLibrary();
          if (!Array.isArray(persisted.library.classes)) {
            persisted.library.classes = seedClasses();
          } else {
            const have = new Set(persisted.library.classes.map((c: ClassEntry) => c.id));
            for (const seed of seedClasses()) {
              if (!have.has(seed.id)) persisted.library.classes.push(seed);
            }
          }
        }
        if (fromVersion < 5) {
          // Fold weapons into inventory items with `weapon` block
          persisted.library = persisted.library ?? emptyLibrary();
          if (Array.isArray(persisted.library.weapons) && persisted.library.weapons.length) {
            persisted.library.items = persisted.library.items ?? [];
            for (const w of persisted.library.weapons) {
              const { ability, damageDice, damageType, proficient, masteryId, bonus, name, notes, ...rest } = w as any;
              persisted.library.items.push({
                ...rest,
                id: w.id,
                name: name ?? 'Weapon',
                qty: 1,
                equipped: true,
                notes,
                weapon: { ability: ability ?? 'str', damageDice: damageDice ?? '1d6', damageType: damageType ?? 'slashing', proficient, masteryId, bonus },
              });
            }
          }
          delete persisted.library.weapons;
          if (persisted.characters && typeof persisted.characters === 'object') {
            for (const cid of Object.keys(persisted.characters)) {
              const ch = persisted.characters[cid];
              if (!ch) continue;
              ch.inventory = ch.inventory ?? [];
              if (Array.isArray(ch.weapons)) {
                for (const w of ch.weapons) {
                  const { ability, damageDice, damageType, proficient, masteryId, bonus, name, notes, ...rest } = w as any;
                  ch.inventory.push({
                    ...rest,
                    id: w.id,
                    name: name ?? 'Weapon',
                    qty: 1,
                    equipped: true,
                    notes,
                    weapon: { ability: ability ?? 'str', damageDice: damageDice ?? '1d6', damageType: damageType ?? 'slashing', proficient, masteryId, bonus },
                  });
                }
              }
              delete ch.weapons;
            }
          }
        }
        // Always backfill class shape so older persisted entries don't crash UI
        if (Array.isArray(persisted.library?.classes)) {
          persisted.library.classes = persisted.library.classes.map((c: any) => ({
            ...c,
            primaryAbility: c.primaryAbility ?? [],
            saves: c.saves ?? [],
            features: c.features ?? [],
            subclasses: (c.subclasses ?? []).map((sb: any) => ({
              ...sb,
              features: sb.features ?? [],
              caster: sb.caster ?? undefined,
            })),
          }));
        }
        // Backfill new library categories
        if (persisted.library) {
          if (!Array.isArray(persisted.library.species)) persisted.library.species = [];
          if (!Array.isArray(persisted.library.backgrounds)) persisted.library.backgrounds = [];
        }
        return persisted;
      },
    }
  )
);

// helpers
export { uid, SAMPLE_SPELLS };

export const exportAllJson = () => {
  const s = useAppStore.getState();
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    characters: s.characters,
    library: s.library,
  };
  return JSON.stringify(data, null, 2);
};

export const exportCharacterJson = (id: string) => {
  const c = useAppStore.getState().characters[id];
  if (!c) return null;
  return JSON.stringify({ version: 1, character: c }, null, 2);
};

export const downloadJson = (filename: string, json: string) => {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseImport = (text: string): Character[] => {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data as Character[];
  if (data.character) return [data.character as Character];
  if (data.characters) return Object.values(data.characters) as Character[];
  throw new Error('Unrecognized JSON format');
};
