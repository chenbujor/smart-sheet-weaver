import type { Character } from '@/lib/types';
import { ABILITY_KEYS, ABILITY_NAMES, type AbilityKey } from '@/lib/types';
import { abilityMod, formatMod, saveBonus, SKILLS, skillBonus, type Derived } from '@/lib/rules';
import { useAppStore } from '@/lib/store';
import { CLASSES } from '@/lib/srd';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FeaturesView } from '@/components/views/FeaturesView';
import { EquipmentView } from '@/components/views/EquipmentView';

interface Props { character: Character; derived: Derived }

export const ClassicView = ({ character: c, derived: d }: Props) => {
  const update = useAppStore((s) => s.updateCharacter);
  const setAbility = useAppStore((s) => s.setAbility);
  const toggleSave = useAppStore((s) => s.toggleSaveProficiency);
  const setSkill = useAppStore((s) => s.setSkill);
  const cls = CLASSES.find((x) => x.id === c.classId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="parchment-panel rounded-md p-5">
        <div className="relative z-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Character Name</label>
            <Input
              value={c.name}
              onChange={(e) => update(c.id, { name: e.target.value })}
              className="font-display text-2xl h-auto py-1"
            />
          </div>
          <div>
            <label className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Class &amp; Level</label>
            <div className="flex gap-2">
              <select
                value={c.classId}
                onChange={(e) => update(c.id, { classId: e.target.value })}
                className="flex-1 rounded-sm border border-ink/40 bg-parchment-light px-2 py-2 font-display"
              >
                {CLASSES.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
              <Input
                type="number"
                min={1}
                max={20}
                value={c.level}
                onChange={(e) => {
                  const lvl = Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10)));
                  update(c.id, { level: lvl });
                }}
                className="w-16 font-display text-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Species</label>
            <Input value={c.species} onChange={(e) => update(c.id, { species: e.target.value })} />
          </div>
          <div>
            <label className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Background</label>
            <Input value={c.background} onChange={(e) => update(c.id, { background: e.target.value })} />
          </div>
          <div>
            <label className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Alignment</label>
            <Input value={c.alignment ?? ''} onChange={(e) => update(c.id, { alignment: e.target.value })} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Abilities */}
        <section className="parchment-panel rounded-md p-5 space-y-3">
          <div className="relative z-10 space-y-2">
            <h3 className="font-display text-lg text-oxblood-deep">Abilities</h3>
            <div className="ink-divider" />
            {ABILITY_KEYS.map((k) => {
              const mod = abilityMod(c.abilities[k]);
              return (
                <div key={k} className="stat-block flex items-center gap-3 rounded-sm p-2">
                  <div className="w-24">
                    <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">{ABILITY_NAMES[k]}</div>
                    <div className="font-display text-2xl text-ink leading-none">{formatMod(mod)}</div>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={c.abilities[k]}
                    onChange={(e) => setAbility(c.id, k, Math.max(1, Math.min(30, parseInt(e.target.value || '10', 10))))}
                    className="w-20 text-center font-display text-xl"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Saves */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10 space-y-2">
            <h3 className="font-display text-lg text-oxblood-deep">Saving Throws</h3>
            <div className="ink-divider" />
            {ABILITY_KEYS.map((k) => {
              const prof = c.proficientSaves.includes(k);
              const bonus = saveBonus(d.effectiveAbilities, k, prof, d.pb) + (c.bonuses?.saves?.[k] ?? 0);
              return (
                <label key={k} className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-secondary/40">
                  <button
                    type="button"
                    onClick={() => toggleSave(c.id, k)}
                    className={cn('h-3 w-3 rounded-full border-1.5 border-ink/70', prof && 'bg-oxblood border-oxblood')}
                    aria-label="Proficient"
                  />
                  <span className="font-display text-base">{formatMod(bonus)}</span>
                  <span className="text-sm text-ink-faded">{ABILITY_NAMES[k]}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Skills */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10 space-y-1">
            <h3 className="font-display text-lg text-oxblood-deep">Skills</h3>
            <div className="ink-divider" />
            {SKILLS.map((s) => {
              const lvl = c.skills[s.id] ?? 'none';
              const bonus = skillBonus(d.effectiveAbilities, lvl, s.ability, d.pb) + (c.bonuses?.skills?.[s.id] ?? 0);
              const next = lvl === 'none' ? 'prof' : lvl === 'prof' ? 'expert' : 'none';
              return (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-2 rounded-sm p-1 text-left hover:bg-secondary/40"
                  onClick={() => setSkill(c.id, s.id, next)}
                  title={`${lvl} → ${next}`}
                >
                  <span className={cn(
                    'inline-block h-3 w-3 rounded-full border-1.5 border-ink/70',
                    lvl === 'prof' && 'bg-oxblood border-oxblood',
                    lvl === 'expert' && 'bg-gold ring-1 ring-oxblood-deep',
                  )} />
                  <span className="font-display text-base w-8 text-right">{formatMod(bonus)}</span>
                  <span className="text-sm">{s.name}</span>
                  <span className="ml-auto text-[0.65rem] uppercase text-ink-faded">{s.ability}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Embedded Equipment */}
      <div>
        <h2 className="font-display text-xl text-oxblood-deep mb-2">Equipment</h2>
        <EquipmentView character={c} derived={d} />
      </div>

      {/* Embedded Features & Bonuses */}
      <div>
        <h2 className="font-display text-xl text-oxblood-deep mb-2">Features & Bonuses</h2>
        <FeaturesView character={c} derived={d} />
      </div>

      {/* Notes */}
      <section className="parchment-panel rounded-md p-5">
        <div className="relative z-10">
          <h3 className="font-display text-lg text-oxblood-deep">Notes</h3>
          <div className="ink-divider my-2" />
          <textarea
            value={c.notes ?? ''}
            onChange={(e) => update(c.id, { notes: e.target.value })}
            className="w-full min-h-32 rounded-sm border border-ink/30 bg-parchment-light p-3 font-script text-base"
            placeholder="Backstory, allies, trinkets..."
          />
        </div>
      </section>
    </div>
  );
};
