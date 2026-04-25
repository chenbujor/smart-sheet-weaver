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
      <section className="parchment-panel rounded-md p-5">
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
      <section className="parchment-panel rounded-md p-5">
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
            <div className="space-y-2">
              {c.inventory.map((i) => (
                <div key={i.id} className="stat-block rounded-sm p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={i.qty}
                      onChange={(e) => updateInventory(c.id, i.id, { qty: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                      className="w-14 h-8 text-center font-display"
                    />
                    <Input
                      value={i.name}
                      onChange={(e) => updateInventory(c.id, i.id, { name: e.target.value })}
                      className="flex-1 h-8 font-display"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="lb"
                      value={i.weight ?? ''}
                      onChange={(e) => updateInventory(c.id, i.id, { weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-16 h-8 text-center"
                    />
                    <button
                      onClick={() => removeInventory(c.id, i.id)}
                      className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={i.equipped ?? false}
                        onChange={(e) => updateInventory(c.id, i.id, { equipped: e.target.checked })}
                        className="h-3.5 w-3.5 accent-oxblood"
                      />
                      Equipped
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={i.attunable ?? false}
                        onChange={(e) => updateInventory(c.id, i.id, { attunable: e.target.checked, attuned: e.target.checked ? i.attuned : false })}
                        className="h-3.5 w-3.5 accent-oxblood"
                      />
                      Attunable
                    </label>
                    {i.attunable && (
                      <label className={cn(
                        'flex items-center gap-1.5 rounded-sm px-1.5 py-0.5',
                        i.attuned && 'bg-gold/20 text-oxblood-deep'
                      )}>
                        <input
                          type="checkbox"
                          checked={i.attuned ?? false}
                          onChange={(e) => updateInventory(c.id, i.id, { attuned: e.target.checked })}
                          className="h-3.5 w-3.5 accent-oxblood"
                        />
                        <Sparkle className="h-3 w-3" /> Attuned
                      </label>
                    )}
                    <Input
                      value={i.notes ?? ''}
                      onChange={(e) => updateInventory(c.id, i.id, { notes: e.target.value })}
                      placeholder="Notes…"
                      className="ml-auto h-7 flex-1 min-w-32 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
