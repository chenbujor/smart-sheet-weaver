import type { Character, AbilityKey, CharacterAction, ActionTime } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { WEAPON_MASTERIES } from '@/lib/srd';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Sparkle, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Derived } from '@/lib/rules';
import { abilityMod, formatMod, SKILLS } from '@/lib/rules';
import { LibraryPicker } from '@/components/LibraryPicker';
import { SmartTextarea } from '@/components/SmartText';
import { KeywordText } from '@/components/KeywordText';

interface Props { character: Character; derived: Derived }

const ABIL: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ACTION_TIMES: ActionTime[] = ['action', 'bonus', 'reaction', 'free', 'special'];

export const EquipmentView = ({ character: c, derived: d }: Props) => {
  const addWeapon = useAppStore((s) => s.addWeapon);
  const removeWeapon = useAppStore((s) => s.removeWeapon);
  const updateWeapon = useAppStore((s) => s.updateWeapon);
  const addInventory = useAppStore((s) => s.addInventory);
  const removeInventory = useAppStore((s) => s.removeInventory);
  const updateInventory = useAppStore((s) => s.updateInventory);
  const addAction = useAppStore((s) => s.addAction);
  const removeAction = useAppStore((s) => s.removeAction);
  const updateAction = useAppStore((s) => s.updateAction);

  const totalWeight = c.inventory.reduce((sum, i) => sum + (i.weight ?? 0) * i.qty, 0);
  const actions = c.actions ?? [];

  // Resolve the bonus added to the d20 for this action.
  // Skill: ability mod of skill's native ability + (PB if proficient)
  // Ability: ability mod + (PB if proficient)
  const actionBonus = (a: CharacterAction): { value: number; label: string } => {
    if (a.skill) {
      const skill = SKILLS.find((s) => s.id === a.skill);
      const ab = skill?.ability ?? 'str';
      const profTier = c.skills[a.skill] ?? (a.proficient ? 'prof' : 'none');
      const pbAdd = profTier === 'expert' ? d.pb * 2 : profTier === 'prof' ? d.pb : 0;
      return {
        value: abilityMod(d.effectiveAbilities[ab]) + pbAdd,
        label: `${skill?.name ?? a.skill} (${ab.toUpperCase()})`,
      };
    }
    const ab = a.ability ?? 'str';
    const pbAdd = a.proficient ? d.pb : 0;
    return {
      value: abilityMod(d.effectiveAbilities[ab]) + pbAdd,
      label: ab.toUpperCase(),
    };
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Weapons */}
      <section className="parchment-panel rounded-md p-5 lg:col-span-2">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-display text-lg text-oxblood-deep">Weapons & Attacks</h3>
            <div className="flex items-center gap-1.5">
              <LibraryPicker characterId={c.id} category="weapons" label="From Library" />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addWeapon(c.id, {
                    name: 'New Weapon',
                    ability: 'str',
                    damageDice: '1d6',
                    damageType: 'slashing',
                    proficient: true,
                  })
                }
                className="border-oxblood text-oxblood-deep hover:bg-oxblood/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
          <div className="ink-divider my-2" />
          {c.weapons.length === 0 ? (
            <p className="text-sm italic text-ink-faded">No weapons. Add one to track attacks.</p>
          ) : (
            <div className="space-y-3">
              {c.weapons.map((w) => {
                const atk = abilityMod(c.abilities[w.ability]) + (w.proficient ? d.pb : 0) + (w.bonus ?? 0);
                const dmg = abilityMod(c.abilities[w.ability]) + (w.bonus ?? 0);
                return (
                  <div key={w.id} className="stat-block rounded-sm p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={w.name}
                        onChange={(e) => updateWeapon(c.id, w.id, { name: e.target.value })}
                        className="flex-1 font-display"
                      />
                      <button
                        onClick={() => removeWeapon(c.id, w.id)}
                        className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="text-xs text-ink-faded">
                        Ability
                        <select
                          value={w.ability}
                          onChange={(e) => updateWeapon(c.id, w.id, { ability: e.target.value as AbilityKey })}
                          className="mt-0.5 block w-full rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 text-sm uppercase"
                        >
                          {ABIL.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-ink-faded">
                        Damage
                        <Input
                          value={w.damageDice}
                          onChange={(e) => updateWeapon(c.id, w.id, { damageDice: e.target.value })}
                          className="mt-0.5 h-8"
                        />
                      </label>
                      <label className="text-xs text-ink-faded">
                        Type
                        <Input
                          value={w.damageType}
                          onChange={(e) => updateWeapon(c.id, w.id, { damageType: e.target.value })}
                          className="mt-0.5 h-8"
                        />
                      </label>
                      <label className="text-xs text-ink-faded">
                        Bonus
                        <Input
                          type="number"
                          value={w.bonus ?? 0}
                          onChange={(e) => updateWeapon(c.id, w.id, { bonus: parseInt(e.target.value || '0', 10) })}
                          className="mt-0.5 h-8"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={w.proficient ?? false}
                          onChange={(e) => updateWeapon(c.id, w.id, { proficient: e.target.checked })}
                          className="h-3.5 w-3.5 accent-oxblood"
                        />
                        Proficient
                      </label>
                      <label className="flex items-center gap-1.5 flex-1">
                        Mastery:
                        <select
                          value={w.masteryId ?? ''}
                          onChange={(e) => updateWeapon(c.id, w.id, { masteryId: e.target.value || undefined })}
                          className="flex-1 rounded-sm border border-ink/40 bg-parchment-light px-1.5 py-0.5"
                        >
                          <option value="">— none —</option>
                          {WEAPON_MASTERIES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </label>
                      <div className="ml-auto font-display text-ink">
                        Atk {formatMod(atk)} · {w.damageDice}{formatMod(dmg)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Inventory */}
      <section className="parchment-panel rounded-md p-5 lg:col-span-2">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-display text-lg text-oxblood-deep">Inventory</h3>
            <div className="flex items-center gap-1.5">
              <LibraryPicker characterId={c.id} category="items" label="From Library" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => addInventory(c.id, { name: 'New Item', qty: 1 })}
                className="border-oxblood text-oxblood-deep hover:bg-oxblood/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
          </div>
          <div className="ink-divider my-2" />
          <div className="mb-2 text-xs text-ink-faded">
            {c.inventory.length} item{c.inventory.length === 1 ? '' : 's'} · Total weight: {totalWeight.toFixed(1)} lb
          </div>
          {c.inventory.length === 0 ? (
            <p className="text-sm italic text-ink-faded">Your pack is empty. Add gear, treasure, or trinkets.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {c.inventory.map((i) => (
                <div key={i.id} className="stat-block rounded-sm p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      value={i.qty}
                      onChange={(e) => updateInventory(c.id, i.id, { qty: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                      className="w-12 h-7 px-1 text-center font-display"
                    />
                    <Input
                      value={i.name}
                      onChange={(e) => updateInventory(c.id, i.id, { name: e.target.value })}
                      className="flex-1 h-7 font-display text-sm"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="lb"
                      value={i.weight ?? ''}
                      onChange={(e) => updateInventory(c.id, i.id, { weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-12 h-7 px-1 text-center text-xs"
                    />
                    <button
                      onClick={() => removeInventory(c.id, i.id)}
                      className="rounded p-1 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem]">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={i.equipped ?? false}
                        onChange={(e) => updateInventory(c.id, i.id, { equipped: e.target.checked })}
                        className="h-3 w-3 accent-oxblood"
                      />
                      Equipped
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={i.attunable ?? false}
                        onChange={(e) => updateInventory(c.id, i.id, { attunable: e.target.checked, attuned: e.target.checked ? i.attuned : false })}
                        className="h-3 w-3 accent-oxblood"
                      />
                      Attunable
                    </label>
                    {i.attunable && (
                      <label className={cn(
                        'flex items-center gap-1 rounded-sm px-1 py-0.5',
                        i.attuned && 'bg-gold/20 text-oxblood-deep'
                      )}>
                        <input
                          type="checkbox"
                          checked={i.attuned ?? false}
                          onChange={(e) => updateInventory(c.id, i.id, { attuned: e.target.checked })}
                          className="h-3 w-3 accent-oxblood"
                        />
                        <Sparkle className="h-2.5 w-2.5" /> Attuned
                      </label>
                    )}
                  </div>
                  <SmartTextarea
                    value={i.description ?? ''}
                    onValueChange={(v) => updateInventory(c.id, i.id, { description: v })}
                    placeholder="Description (use \ to reference glossary)"
                    rows={2}
                    className="bg-parchment-light border-ink/30 text-xs min-h-[2.5rem]"
                  />
                  {i.description && (
                    <div className="text-[0.7rem] text-ink-faded leading-snug">
                      <KeywordText text={i.description} />
                    </div>
                  )}
                  <Input
                    value={i.notes ?? ''}
                    onChange={(e) => updateInventory(c.id, i.id, { notes: e.target.value })}
                    placeholder="Quick note…"
                    className="h-6 text-[0.7rem] px-1.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Attuned Items */}
      {(() => {
        const attunedItems = c.inventory.filter((i) => i.attuned);
        const maxAttunement = 3 + (c.bonuses?.attunementSlots ?? 0);
        const slots = Array.from({ length: Math.max(maxAttunement, attunedItems.length) }, (_, idx) => attunedItems[idx]);
        return (
          <section className="parchment-panel rounded-md p-5 lg:col-span-2">
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-1.5">
                  <Sparkle className="h-4 w-4" /> Attuned Items
                </h3>
                <div className={cn(
                  'text-xs font-display',
                  attunedItems.length > maxAttunement ? 'text-oxblood-deep' : 'text-ink-faded'
                )}>
                  {attunedItems.length} / {maxAttunement} slots
                </div>
              </div>
              <div className="ink-divider my-2" />
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {slots.map((item, idx) => (
                  <div
                    key={item?.id ?? `empty-${idx}`}
                    className={cn(
                      'stat-block rounded-sm p-2.5 min-h-16 flex flex-col justify-center',
                      item ? 'bg-gold/15 border-gold/40' : 'border-dashed opacity-60',
                      idx >= maxAttunement && 'border-oxblood/60 bg-oxblood/10'
                    )}
                  >
                    {item ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Sparkle className="h-3 w-3 text-oxblood-deep" />
                          <span className="font-display text-sm text-ink truncate">{item.name}</span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-[0.7rem] italic text-ink-faded line-clamp-2">{item.notes}</p>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-xs italic text-ink-faded">
                        Empty slot {idx + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {attunedItems.length > maxAttunement && (
                <p className="mt-2 text-xs italic text-oxblood-deep">
                  Over attunement limit. Increase via Bonuses & Modifiers, or unattune an item.
                </p>
              )}
            </div>
          </section>
        );
      })()}

      {/* Actions */}
      <section className="parchment-panel rounded-md p-5 lg:col-span-2">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-display text-lg text-oxblood-deep flex items-center gap-1.5">
              <Swords className="h-4 w-4" /> Actions
            </h3>
            <div className="flex items-center gap-1.5">
              <LibraryPicker characterId={c.id} category="actions" label="From Library" />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addAction(c.id, {
                    name: 'New Action',
                    actionTime: 'action',
                    ability: 'str',
                    proficient: true,
                    description: '',
                  })
                }
                className="border-oxblood text-oxblood-deep hover:bg-oxblood/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
          <div className="ink-divider my-2" />
          {actions.length === 0 ? (
            <p className="text-sm italic text-ink-faded">
              No actions. Add Shove, Grapple, or homebrew abilities — or pull templates from the Library.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {actions.map((a) => {
                const useSkill = !!a.skill;
                const bonus = actionBonus(a);
                return (
                  <div key={a.id} className="stat-block rounded-sm p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={a.name}
                        onChange={(e) => updateAction(c.id, a.id, { name: e.target.value })}
                        className="flex-1 font-display"
                      />
                      <select
                        value={a.actionTime ?? 'action'}
                        onChange={(e) => updateAction(c.id, a.id, { actionTime: e.target.value as ActionTime })}
                        className="rounded-sm border border-ink/40 bg-parchment-light px-2 py-1.5 text-xs capitalize"
                      >
                        {ACTION_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        onClick={() => removeAction(c.id, a.id)}
                        className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                      <label className="flex flex-col text-ink-faded">
                        Roll
                        <select
                          value={useSkill ? 'skill' : 'ability'}
                          onChange={(e) => {
                            if (e.target.value === 'skill') {
                              updateAction(c.id, a.id, { skill: a.skill ?? 'athletics', ability: undefined });
                            } else {
                              updateAction(c.id, a.id, { ability: a.ability ?? 'str', skill: undefined });
                            }
                          }}
                          className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-1.5 py-1 h-8"
                        >
                          <option value="ability">Ability</option>
                          <option value="skill">Skill</option>
                        </select>
                      </label>
                      {useSkill ? (
                        <label className="flex flex-col text-ink-faded col-span-2">
                          Skill (override)
                          <select
                            value={a.skill ?? 'athletics'}
                            onChange={(e) => updateAction(c.id, a.id, { skill: e.target.value })}
                            className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-1.5 py-1 h-8"
                          >
                            {SKILLS.map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({s.ability.toUpperCase()})</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="flex flex-col text-ink-faded col-span-2">
                          Ability (override)
                          <select
                            value={a.ability ?? 'str'}
                            onChange={(e) => updateAction(c.id, a.id, { ability: e.target.value as AbilityKey })}
                            className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-1.5 py-1 h-8 uppercase"
                          >
                            {ABIL.map((k) => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </label>
                      )}
                      <label className="flex flex-col text-ink-faded">
                        Range
                        <Input
                          value={a.range ?? ''}
                          onChange={(e) => updateAction(c.id, a.id, { range: e.target.value })}
                          className="mt-0.5 h-8"
                          placeholder="5 ft"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={a.proficient ?? false}
                          onChange={(e) => updateAction(c.id, a.id, { proficient: e.target.checked })}
                          className="accent-oxblood"
                        />
                        Proficient
                      </label>
                      {(a.damageDice || a.damageType) && (
                        <span className="text-ink-faded">
                          Dmg: {a.damageDice} {a.damageType}
                        </span>
                      )}
                      {a.saveAbility && (
                        <span className="text-ink-faded">
                          Save: {a.saveAbility.toUpperCase()}
                          {a.saveAbility2 ? ` or ${a.saveAbility2.toUpperCase()}` : ''}
                        </span>
                      )}
                      <div className="ml-auto font-display text-ink">
                        {bonus.label}: {formatMod(bonus.value)}
                      </div>
                    </div>
                    {a.description && (
                      <p className="text-xs text-ink-faded whitespace-pre-wrap">
                        <KeywordText text={a.description} />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
