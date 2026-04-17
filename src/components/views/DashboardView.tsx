import { ABILITY_KEYS, ABILITY_NAMES, type AbilityKey } from '@/lib/types';
import { abilityMod, formatMod, saveBonus, SKILLS, skillBonus, type Derived } from '@/lib/rules';
import { Pips } from '@/components/Pips';
import { useAppStore } from '@/lib/store';
import type { Character } from '@/lib/types';
import { Heart, Shield, Footprints, Eye, Swords, Sparkles, FlameKindling } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { KeywordText } from '@/components/KeywordText';
import { CONDITIONS, WEAPON_MASTERIES } from '@/lib/srd';
import { SourceTag } from '@/components/SourceTag';
import { evalFormula, activeTierValue } from '@/lib/rules';
import { cn } from '@/lib/utils';

interface Props {
  character: Character;
  derived: Derived;
}

export const DashboardView = ({ character: c, derived: d }: Props) => {
  const update = useAppStore((s) => s.updateCharacter);
  const setHp = useAppStore((s) => s.setHp);
  const setSpellSlotUsed = useAppStore((s) => s.setSpellSlotUsed);
  const setPactSlotUsed = useAppStore((s) => s.setPactSlotUsed);
  const setFeatureUsed = useAppStore((s) => s.setFeatureUsed);

  const [hpDelta, setHpDelta] = useState('');
  const applyDelta = (sign: 1 | -1) => {
    const n = parseInt(hpDelta, 10);
    if (isNaN(n)) return;
    let temp = c.hpTemp;
    let cur = c.hpCurrent;
    if (sign === -1) {
      let dmg = n;
      const tempAbsorb = Math.min(temp, dmg);
      temp -= tempAbsorb;
      dmg -= tempAbsorb;
      cur = Math.max(0, cur - dmg);
    } else {
      cur = Math.min(d.hpMax, cur + n);
    }
    setHp(c.id, cur, temp);
    setHpDelta('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left column: vitals */}
      <div className="space-y-4 lg:col-span-2">
        {/* HP block */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-2">
                <Heart className="h-4 w-4" /> Hit Points
              </h3>
              <div className="text-xs text-ink-faded">Hit Die d{(d.hitDiceTotal && c.level) ? '' : ''}</div>
            </div>
            <div className="ink-divider my-2" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Current</div>
                <div className="font-display text-4xl text-ink">{c.hpCurrent}</div>
              </div>
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Max</div>
                <div className="font-display text-4xl text-ink">{d.hpMax}</div>
              </div>
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Temp</div>
                <Input
                  type="number"
                  value={c.hpTemp}
                  onChange={(e) => setHp(c.id, c.hpCurrent, Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="mx-auto h-10 w-20 text-center font-display text-2xl"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={hpDelta}
                onChange={(e) => setHpDelta(e.target.value)}
                className="h-9"
              />
              <Button onClick={() => applyDelta(-1)} variant="outline" className="border-oxblood text-oxblood-deep hover:bg-oxblood/10">
                Damage
              </Button>
              <Button onClick={() => applyDelta(1)} className="bg-forest text-primary-foreground hover:bg-forest/80">
                Heal
              </Button>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wider text-ink-faded">
                <span>Hit Dice (d{c.level ? '' : ''})</span>
                <span>{d.hitDiceRemaining}/{d.hitDiceTotal}</span>
              </div>
              <Pips
                total={d.hitDiceTotal}
                used={c.hitDiceUsed}
                shape="square"
                onChange={(used) => update(c.id, { hitDiceUsed: used })}
              />
            </div>
          </div>
        </section>

        {/* Saving throws */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10">
            <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-2">
              <Shield className="h-4 w-4" /> Saving Throws
            </h3>
            {d.exhaustionPenalty > 0 && (
              <p className="mt-1 text-xs italic text-oxblood-deep">
                Exhaustion {c.exhaustion}: −{d.exhaustionPenalty} to all D20 Tests
              </p>
            )}
            <div className="ink-divider my-2" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ABILITY_KEYS.map((k) => {
                const prof = c.proficientSaves.includes(k);
                const bonus = saveBonus(c.abilities, k, prof, d.pb) - d.exhaustionPenalty;
                return (
                  <div key={k} className="stat-block rounded-sm p-2 flex items-center gap-2">
                    <span className={cn('inline-block h-2.5 w-2.5 rounded-full border border-ink/60', prof && 'bg-oxblood')} />
                    <span className="text-xs uppercase tracking-wider text-ink-faded">{k}</span>
                    <span className="ml-auto font-display text-lg text-ink">{formatMod(bonus)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Action economy */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10">
            <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-2">
              <Swords className="h-4 w-4" /> Action Economy
            </h3>
            <div className="ink-divider my-2" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(['Action', 'Bonus Action', 'Reaction', 'Free / Movement'] as const).map((slot) => (
                <div key={slot} className="stat-block rounded-sm p-3">
                  <div className="font-display text-sm text-ink">{slot}</div>
                  <div className="mt-1 text-xs italic text-ink-faded">
                    {slot === 'Action' && 'Attack, Cast, Dash, Dodge, Help, Hide, Ready, Search, Study, Utilize, Magic'}
                    {slot === 'Bonus Action' && 'Class/spell features'}
                    {slot === 'Reaction' && 'Opportunity Attack, Shield, Counterspell'}
                    {slot === 'Free / Movement' && `${c.speed} ft speed${d.exhaustionPenalty ? `; -${c.exhaustion * 5} from exhaustion` : ''}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weapons */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-2">
                <Swords className="h-4 w-4" /> Attacks
              </h3>
            </div>
            <div className="ink-divider my-2" />
            {c.weapons.length === 0 ? (
              <p className="text-sm italic text-ink-faded">No weapons configured.</p>
            ) : (
              <div className="space-y-2">
                {c.weapons.map((w) => {
                  const mod = abilityMod(c.abilities[w.ability]) + (w.proficient ? d.pb : 0) + (w.bonus ?? 0) - d.exhaustionPenalty;
                  const dmgMod = abilityMod(c.abilities[w.ability]) + (w.bonus ?? 0);
                  const mastery = WEAPON_MASTERIES.find((m) => m.id === w.masteryId);
                  const masteryDc = mastery ? 8 + d.pb + abilityMod(c.abilities[w.ability]) : null;
                  return (
                    <div key={w.id} className="stat-block rounded-sm p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <div className="font-display text-base text-ink">{w.name}</div>
                          <div className="text-xs text-ink-faded">
                            {w.ability.toUpperCase()} · {w.damageType}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>
                            <span className="text-ink-faded">Atk </span>
                            <span className="font-display text-ink">{formatMod(mod)}</span>
                          </div>
                          <div>
                            <span className="text-ink-faded">Dmg </span>
                            <span className="font-display text-ink">{w.damageDice}{formatMod(dmgMod)}</span>
                          </div>
                        </div>
                      </div>
                      {mastery && (
                        <div className="mt-2 rounded-sm border border-gold/40 bg-gold/10 p-2 text-xs">
                          <div className="font-semibold text-ink">
                            Mastery: {mastery.name}
                            {masteryDc !== null && <span className="ml-2 text-ink-faded">DC {masteryDc}</span>}
                          </div>
                          <div className="text-ink-faded"><KeywordText text={mastery.description} /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Quick stats */}
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">AC</div>
              <Input
                type="number"
                value={c.ac ?? 10}
                onChange={(e) => update(c.id, { ac: parseInt(e.target.value || '10', 10) })}
                className="mx-auto h-12 w-16 text-center font-display text-2xl"
              />
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Initiative</div>
              <div className="font-display text-3xl text-ink">{formatMod(d.initiative - d.exhaustionPenalty)}</div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Speed</div>
              <div className="font-display text-2xl text-ink">{c.speed - c.exhaustion * 5}<span className="text-sm text-ink-faded"> ft</span></div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded flex items-center justify-center gap-1"><Eye className="h-3 w-3" />Passive Perception</div>
              <div className="font-display text-2xl text-ink">{d.passivePerception - d.exhaustionPenalty}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Proficiency Bonus</div>
              <div className="font-display text-3xl text-oxblood-deep">+{d.pb}</div>
            </div>
          </div>
        </section>

        {/* Concentration */}
        <section className="parchment-panel rounded-md p-4">
          <div className="relative z-10">
            <h3 className="font-display text-base text-oxblood-deep flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Concentration
            </h3>
            <div className="ink-divider my-2" />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.concentration.active}
                onChange={(e) => update(c.id, { concentration: { ...c.concentration, active: e.target.checked } })}
                className="h-4 w-4 accent-oxblood"
              />
              <span className="text-sm">Active</span>
            </label>
            {c.concentration.active && (
              <Input
                placeholder="Spell name"
                value={c.concentration.spellName ?? ''}
                onChange={(e) => update(c.id, { concentration: { ...c.concentration, spellName: e.target.value } })}
                className="mt-2 h-9"
              />
            )}
          </div>
        </section>

        {/* Exhaustion */}
        <section className="parchment-panel rounded-md p-4">
          <div className="relative z-10">
            <h3 className="font-display text-base text-oxblood-deep flex items-center gap-2">
              <FlameKindling className="h-4 w-4" /> Exhaustion
            </h3>
            <div className="ink-divider my-2" />
            <Pips
              total={6}
              used={c.exhaustion}
              onChange={(u) => update(c.id, { exhaustion: u })}
              shape="square"
            />
            <p className="mt-2 text-xs italic text-ink-faded">
              Each level: −2 to D20 Tests, −5 ft Speed. Six = death.
            </p>
          </div>
        </section>

        {/* Death saves */}
        {c.hpCurrent === 0 && (
          <section className="parchment-panel rounded-md p-4">
            <div className="relative z-10">
              <h3 className="font-display text-base text-oxblood-deep">Death Saves</h3>
              <div className="ink-divider my-2" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-sm text-forest">Successes</span>
                  <Pips total={3} used={c.deathSaves.successes} onChange={(u) => update(c.id, { deathSaves: { ...c.deathSaves, successes: u } })} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-sm text-oxblood-deep">Failures</span>
                  <Pips total={3} used={c.deathSaves.failures} onChange={(u) => update(c.id, { deathSaves: { ...c.deathSaves, failures: u } })} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Spell slots */}
        {(d.spellSlots.length > 0 || d.pactSlots) && (
          <section className="parchment-panel rounded-md p-4">
            <div className="relative z-10">
              <h3 className="font-display text-base text-oxblood-deep">Spell Slots</h3>
              <div className="ink-divider my-2" />
              <div className="space-y-2">
                {d.spellSlots.map((max, i) => {
                  const lvl = i + 1;
                  const used = c.spellSlotsUsed[lvl] ?? 0;
                  return (
                    <div key={lvl} className="flex items-center gap-3">
                      <span className="w-10 text-sm font-display text-ink">L{lvl}</span>
                      <Pips total={max} used={used} shape="square" onChange={(u) => setSpellSlotUsed(c.id, lvl, u)} />
                    </div>
                  );
                })}
                {d.pactSlots && (
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-sm font-display text-oxblood-deep">Pact L{d.pactSlots.level}</span>
                    <Pips total={d.pactSlots.count} used={c.pactSlotsUsed ?? 0} shape="square" onChange={(u) => setPactSlotUsed(c.id, u)} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Skills (compact) */}
        <section className="parchment-panel rounded-md p-4">
          <div className="relative z-10">
            <h3 className="font-display text-base text-oxblood-deep">Skills</h3>
            <div className="ink-divider my-2" />
            <div className="space-y-1 text-sm">
              {SKILLS.map((s) => {
                const lvl = c.skills[s.id] ?? 'none';
                const bonus = skillBonus(c.abilities, lvl, s.ability, d.pb) - d.exhaustionPenalty;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        'inline-block h-2 w-2 rounded-full border border-ink/60',
                        lvl === 'prof' && 'bg-oxblood',
                        lvl === 'expert' && 'bg-gold ring-1 ring-oxblood',
                      )} />
                      {s.name}
                      <span className="text-[0.65rem] uppercase text-ink-faded">{s.ability}</span>
                    </span>
                    <span className="font-display text-ink">{formatMod(bonus)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Features (full width below) */}
      {c.features.length > 0 && (
        <section className="parchment-panel rounded-md p-5 lg:col-span-3">
          <div className="relative z-10">
            <h3 className="font-display text-lg text-oxblood-deep">Features &amp; Resources</h3>
            <div className="ink-divider my-2" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {c.features.map((f) => {
                const max = f.usesFormula ? evalFormula(f.usesFormula, { pb: d.pb, level: c.level, abilities: c.abilities }) : 0;
                const tier = activeTierValue(f.tiers, c.level);
                return (
                  <div key={f.id} className="stat-block rounded-sm p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-display text-base text-ink">{f.name}</div>
                        <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                          <SourceTag source={f.source} label={f.sourceLabel} />
                          {f.reset && f.reset !== 'none' && (
                            <span className="text-[0.65rem] uppercase tracking-wider text-ink-faded">
                              {f.reset} rest
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-ink-faded"><KeywordText text={f.description} /></p>
                    {tier && (
                      <p className="mt-1 text-xs italic text-oxblood-deep">Tier (L{c.level}): {tier}</p>
                    )}
                    {max > 0 && (
                      <div className="mt-2">
                        <Pips total={max} used={Math.min(max, f.used ?? 0)} onChange={(u) => setFeatureUsed(c.id, f.id, u)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
