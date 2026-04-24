import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Character, AbilityKey, CharacterFeature, SpellEntry, Weapon, InventoryItem,
  GlossaryTerm, CustomEntry, Library, LibraryCategory,
} from './types';
import { CLASSES, CONDITIONS, SAMPLE_SPELLS } from './srd';
import { hpMax, spellSlotsFor, pactSlotsFor } from './rules';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const seedGlossary = (): GlossaryTerm[] =>
  CONDITIONS.map((c) => ({ id: c.id, name: c.name, description: c.description }));

const emptyLibrary = (): Library => ({
  glossary: seedGlossary(),
  spells: [],
  features: [],
  weapons: [],
  items: [],
  custom: [],
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
    weapons: [],
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

interface AppState {
  characters: Record<string, Character>;
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
  // features / spells / inventory
  addFeature: (id: string, f: Omit<CharacterFeature, 'id'>) => void;
  removeFeature: (id: string, fid: string) => void;
  updateFeature: (id: string, fid: string, patch: Partial<CharacterFeature>) => void;
  addSpell: (id: string, s: Omit<SpellEntry, 'id'>) => void;
  removeSpell: (id: string, sid: string) => void;
  updateSpell: (id: string, sid: string, patch: Partial<SpellEntry>) => void;
  addWeapon: (id: string, w: Omit<Weapon, 'id'>) => void;
  removeWeapon: (id: string, wid: string) => void;
  updateWeapon: (id: string, wid: string, patch: Partial<Weapon>) => void;
  addInventory: (id: string, i: Omit<InventoryItem, 'id'>) => void;
  removeInventory: (id: string, iid: string) => void;
  updateInventory: (id: string, iid: string, patch: Partial<InventoryItem>) => void;
  // rests
  shortRest: (id: string, hitDiceSpent: { rolled: number; count: number }) => void;
  longRest: (id: string) => void;
  // io
  importCharacters: (data: Character[]) => void;
  importAll: (state: { characters: Record<string, Character> }) => void;
}

const touch = (c: Character): Character => ({ ...c, updatedAt: Date.now() });

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      characters: {},

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

      addWeapon: (id, w) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({ ...cur, weapons: [...cur.weapons, { ...w, id: uid() }] }),
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
              [id]: touch({ ...cur, weapons: cur.weapons.filter((w) => w.id !== wid) }),
            },
          };
        }),

      updateWeapon: (id, wid, patch) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
          return {
            characters: {
              ...s.characters,
              [id]: touch({
                ...cur,
                weapons: cur.weapons.map((w) => (w.id === wid ? { ...w, ...patch } : w)),
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

      shortRest: (id, { rolled, count }) =>
        set((s) => {
          const cur = s.characters[id];
          if (!cur) return s;
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
                features: cur.features.map((f) =>
                  f.reset === 'short' || f.reset === 'long' ? f : f
                ).map((f) => (f.reset === 'short' ? { ...f, used: 0 } : f)),
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
          // recover half hit dice (min 1)
          const recover = Math.max(1, Math.floor(cur.level / 2));
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
                features: cur.features.map((f) =>
                  f.reset === 'short' || f.reset === 'long' ? { ...f, used: 0 } : f
                ),
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
        set(() => ({ characters: data.characters || {} })),
    }),
    {
      name: 'dnd2024-vault',
      version: 1,
    }
  )
);

// helpers
export { uid, SAMPLE_SPELLS };

export const exportAllJson = () => {
  const data = { version: 1, exportedAt: new Date().toISOString(), characters: useAppStore.getState().characters };
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
