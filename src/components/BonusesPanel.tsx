import type { Character, AbilityKey } from '@/lib/types';
import { ABILITY_KEYS, ABILITY_NAMES } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { SKILLS, type Derived } from '@/lib/rules';

interface Props { character: Character; derived?: Derived }

type Bonuses = NonNullable<Character['bonuses']>;

const SCALAR_FIELDS: { key: keyof Bonuses; label: string; hint?: string }[] = [
  { key: 'hpMax', label: 'Max HP' },
  { key: 'ac', label: 'AC' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'speed', label: 'Speed (ft)' },
  { key: 'passivePerception', label: 'Passive Perception' },
  { key: 'spellSaveDc', label: 'Spell Save DC' },
  { key: 'spellAttack', label: 'Spell Attack' },
  { key: 'maxConcentrations', label: 'Extra Concentrations', hint: 'Beyond default 1' },
  { key: 'attunementSlots', label: 'Extra Attunement Slots', hint: 'Beyond default 3' },
];

export const BonusesPanel = ({ character: c }: Props) => {
  const update = useAppStore((s) => s.updateCharacter);
  const b = c.bonuses ?? {};

  const setBonus = (patch: Partial<Bonuses>) => update(c.id, { bonuses: { ...b, ...patch } });

  const setAbility = (k: AbilityKey, v: number) =>
    setBonus({ abilities: { ...(b.abilities ?? {}), [k]: v || undefined } as Bonuses['abilities'] });

  const setSave = (k: AbilityKey, v: number) =>
    setBonus({ saves: { ...(b.saves ?? {}), [k]: v || undefined } as Bonuses['saves'] });

  const setSkill = (id: string, v: number) => {
    const next = { ...(b.skills ?? {}) };
    if (v) next[id] = v; else delete next[id];
    setBonus({ skills: next });
  };

  const numInput = (val: number | undefined, on: (n: number) => void) => (
    <Input
      type="number"
      value={val ?? ''}
      onChange={(e) => on(parseInt(e.target.value || '0', 10))}
      placeholder="0"
      className="h-8 w-16 text-center font-display"
    />
  );

  return (
    <section className="parchment-panel rounded-md p-5">
      <div className="relative z-10 space-y-4">
        <div>
          <h3 className="font-display text-lg text-oxblood-deep">Bonuses & Modifiers</h3>
          <p className="text-xs italic text-ink-faded">
            Flat numeric adjustments applied automatically to derived stats. Use negative values for penalties.
          </p>
        </div>
        <div className="ink-divider" />

        {/* Ability score bonuses */}
        <div>
          <h4 className="font-display text-sm text-ink mb-2">Ability Scores</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ABILITY_KEYS.map((k) => (
              <label key={k} className="flex flex-col items-center gap-1 text-xs">
                <span className="uppercase tracking-wider text-ink-faded">{k}</span>
                {numInput(b.abilities?.[k], (v) => setAbility(k, v))}
              </label>
            ))}
          </div>
        </div>

        {/* Save bonuses */}
        <div>
          <h4 className="font-display text-sm text-ink mb-2">
            Saving Throws <span className="text-xs italic text-ink-faded font-normal">(e.g. STR vs grapple)</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ABILITY_KEYS.map((k) => (
              <label key={k} className="flex flex-col items-center gap-1 text-xs" title={ABILITY_NAMES[k]}>
                <span className="uppercase tracking-wider text-ink-faded">{k}</span>
                {numInput(b.saves?.[k], (v) => setSave(k, v))}
              </label>
            ))}
          </div>
        </div>

        {/* Scalars */}
        <div>
          <h4 className="font-display text-sm text-ink mb-2">Combat & Casting</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SCALAR_FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-xs">
                <span className="text-ink-faded">{f.label}</span>
                {numInput(b[f.key] as number | undefined, (v) => setBonus({ [f.key]: v || undefined } as Partial<Bonuses>))}
                {f.hint && <span className="text-[0.6rem] italic text-ink-faded">{f.hint}</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Skill bonuses */}
        <details className="group">
          <summary className="cursor-pointer font-display text-sm text-ink mb-2 hover:text-oxblood-deep">
            Skill Bonuses
            <span className="ml-2 text-xs italic text-ink-faded font-normal">
              ({Object.values(b.skills ?? {}).filter(Boolean).length} set)
            </span>
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SKILLS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{s.name}</span>
                {numInput(b.skills?.[s.id], (v) => setSkill(s.id, v))}
              </label>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
};
