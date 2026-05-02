// Shared editor for adding action/spell/bonus grants to a feature or item.
// Used in Library Features tab, Library Items tab, and per-feature editors of the Classes tab.

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Wand2, Swords, Sparkles } from 'lucide-react';
import { ABILITY_KEYS, type Grant, type AbilityKey, type ScalarBonusKey, type BonusTarget } from '@/lib/types';
import { SKILLS } from '@/lib/rules';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const SCALARS: { key: ScalarBonusKey; label: string }[] = [
  { key: 'hpMax', label: 'Max HP' },
  { key: 'ac', label: 'AC' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'speed', label: 'Speed' },
  { key: 'passivePerception', label: 'Passive Perception' },
  { key: 'spellSaveDc', label: 'Spell Save DC' },
  { key: 'spellAttack', label: 'Spell Attack' },
  { key: 'maxConcentrations', label: 'Max Concentrations' },
  { key: 'attunementSlots', label: 'Attunement Slots' },
];

interface Props {
  grants: Grant[] | undefined;
  onChange: (next: Grant[]) => void;
}

export const GrantsEditor = ({ grants, onChange }: Props) => {
  const libraryActions = useAppStore((s) => s.library.actions);
  const librarySpells = useAppStore((s) => s.library.spells);
  const list = grants ?? [];

  const update = (id: string, patch: Partial<Grant>) =>
    onChange(list.map((g) => (g.id === id ? ({ ...g, ...patch } as Grant) : g)));
  const remove = (id: string) => onChange(list.filter((g) => g.id !== id));

  const addAction = () =>
    onChange([...list, { id: uid(), kind: 'action', libraryActionId: libraryActions[0]?.id ?? '' }]);
  const addSpell = () =>
    onChange([...list, { id: uid(), kind: 'spell', librarySpellId: librarySpells[0]?.id ?? '', alwaysPrepared: true }]);
  const addBonus = () =>
    onChange([...list, { id: uid(), kind: 'bonus', target: { type: 'scalar', key: 'ac' }, value: 1 }]);

  return (
    <div className="space-y-2 rounded-sm border border-ink/20 bg-parchment-light/50 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-display uppercase tracking-wider text-ink-faded">
          Grants {list.length > 0 && <span className="text-ink">({list.length})</span>}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={addAction} className="h-7 text-xs" disabled={!libraryActions.length}>
            <Swords className="h-3 w-3 mr-1" /> Action
          </Button>
          <Button size="sm" variant="outline" onClick={addSpell} className="h-7 text-xs" disabled={!librarySpells.length}>
            <Wand2 className="h-3 w-3 mr-1" /> Spell
          </Button>
          <Button size="sm" variant="outline" onClick={addBonus} className="h-7 text-xs">
            <Sparkles className="h-3 w-3 mr-1" /> Bonus
          </Button>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-[0.7rem] italic text-ink-faded">
          Auto-grant an action, a spell, or a numeric bonus while this is active.
        </p>
      ) : (
        <div className="space-y-1.5">
          {list.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-sm bg-parchment-light p-1.5 text-xs">
              {g.kind === 'action' && (
                <>
                  <Swords className="h-3 w-3 text-ink-faded flex-shrink-0" />
                  <span className="text-ink-faded">Action</span>
                  <select
                    value={g.libraryActionId}
                    onChange={(e) => update(g.id, { libraryActionId: e.target.value } as Partial<Grant>)}
                    className="flex-1 rounded-sm border border-ink/30 bg-parchment px-1 py-0.5"
                  >
                    {libraryActions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </>
              )}
              {g.kind === 'spell' && (
                <>
                  <Wand2 className="h-3 w-3 text-ink-faded flex-shrink-0" />
                  <span className="text-ink-faded">Spell</span>
                  <select
                    value={g.librarySpellId}
                    onChange={(e) => update(g.id, { librarySpellId: e.target.value } as Partial<Grant>)}
                    className="flex-1 rounded-sm border border-ink/30 bg-parchment px-1 py-0.5"
                  >
                    {librarySpells.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.name} {sp.level === 0 ? '(C)' : `L${sp.level}`}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[0.65rem] text-ink-faded">
                    <input
                      type="checkbox"
                      checked={g.alwaysPrepared ?? true}
                      onChange={(e) => update(g.id, { alwaysPrepared: e.target.checked } as Partial<Grant>)}
                      className="accent-oxblood"
                    />
                    Always prepared
                  </label>
                </>
              )}
              {g.kind === 'bonus' && (
                <BonusGrantRow
                  target={g.target}
                  value={g.value}
                  onTarget={(t) => update(g.id, { target: t } as Partial<Grant>)}
                  onValue={(v) => update(g.id, { value: v } as Partial<Grant>)}
                />
              )}
              <button
                onClick={() => remove(g.id)}
                className="rounded p-0.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10 flex-shrink-0"
                aria-label="Remove grant"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BonusGrantRow = ({
  target, value, onTarget, onValue,
}: {
  target: BonusTarget;
  value: number;
  onTarget: (t: BonusTarget) => void;
  onValue: (n: number) => void;
}) => {
  return (
    <>
      <Sparkles className="h-3 w-3 text-ink-faded flex-shrink-0" />
      <select
        value={target.type}
        onChange={(e) => {
          const t = e.target.value as BonusTarget['type'];
          if (t === 'ability') onTarget({ type: 'ability', key: 'str' });
          else if (t === 'save') onTarget({ type: 'save', key: 'str' });
          else if (t === 'skill') onTarget({ type: 'skill', skillId: 'athletics' });
          else onTarget({ type: 'scalar', key: 'ac' });
        }}
        className="rounded-sm border border-ink/30 bg-parchment px-1 py-0.5"
      >
        <option value="scalar">Stat</option>
        <option value="ability">Ability</option>
        <option value="save">Save</option>
        <option value="skill">Skill</option>
      </select>
      {target.type === 'scalar' && (
        <select
          value={target.key}
          onChange={(e) => onTarget({ type: 'scalar', key: e.target.value as ScalarBonusKey })}
          className="flex-1 rounded-sm border border-ink/30 bg-parchment px-1 py-0.5"
        >
          {SCALARS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )}
      {(target.type === 'ability' || target.type === 'save') && (
        <select
          value={target.key}
          onChange={(e) => onTarget({ type: target.type, key: e.target.value as AbilityKey } as BonusTarget)}
          className="flex-1 rounded-sm border border-ink/30 bg-parchment px-1 py-0.5 uppercase"
        >
          {ABILITY_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      )}
      {target.type === 'skill' && (
        <select
          value={target.skillId}
          onChange={(e) => onTarget({ type: 'skill', skillId: e.target.value })}
          className="flex-1 rounded-sm border border-ink/30 bg-parchment px-1 py-0.5"
        >
          {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <Input
        type="number"
        value={value}
        onChange={(e) => onValue(parseInt(e.target.value || '0', 10))}
        className="h-6 w-14 px-1 text-center"
      />
    </>
  );
};
