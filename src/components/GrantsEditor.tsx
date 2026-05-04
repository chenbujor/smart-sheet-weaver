// Shared editor for adding action/spell/bonus grants to a feature or item.
// Used in Library Features tab, Library Items tab, and per-feature editors of the Classes tab.

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Wand2, Swords, Sparkles } from 'lucide-react';
import { ABILITY_KEYS, type Grant, type AbilityKey, type ScalarBonusKey, type BonusTarget, type LibraryAction, type ActionTime } from '@/lib/types';
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
  const librarySpells = useAppStore((s) => s.library.spells);
  const list = grants ?? [];

  const update = (id: string, patch: Partial<Grant>) =>
    onChange(list.map((g) => (g.id === id ? ({ ...g, ...patch } as Grant) : g)));
  const remove = (id: string) => onChange(list.filter((g) => g.id !== id));

  const addAction = () =>
    onChange([
      ...list,
      {
        id: uid(),
        kind: 'inline-action',
        action: { name: 'New Action', actionTime: 'action' } as Omit<LibraryAction, 'id'>,
      },
    ]);
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
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={addAction} className="h-7 text-xs">
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
          {list.map((g) => {
            if (g.kind === 'inline-action') {
              return (
                <div key={g.id} className="rounded-sm bg-parchment-light p-1.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Swords className="h-3 w-3 text-ink-faded flex-shrink-0" />
                    <span className="text-ink-faded">Action</span>
                    <Input
                      value={g.action.name}
                      onChange={(e) => update(g.id, { action: { ...g.action, name: e.target.value } } as Partial<Grant>)}
                      className="h-6 flex-1 px-1.5 text-xs font-display"
                      placeholder="Action name"
                    />
                    <button
                      onClick={() => remove(g.id)}
                      className="rounded p-0.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10 flex-shrink-0"
                      aria-label="Remove grant"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <InlineActionEditor
                    action={g.action}
                    onChange={(action) => update(g.id, { action } as Partial<Grant>)}
                  />
                </div>
              );
            }
            return (
              <div key={g.id} className="flex items-center gap-2 rounded-sm bg-parchment-light p-1.5 text-xs">
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
            );
          })}
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

// ---------------------------------------------------------------------------
// Inline action editor — author an action that's specific to this grant source
// ---------------------------------------------------------------------------

const ACTION_TIMES: { v: ActionTime; label: string }[] = [
  { v: 'action', label: 'Action' },
  { v: 'bonus', label: 'Bonus' },
  { v: 'reaction', label: 'Reaction' },
  { v: 'free', label: 'Free' },
  { v: 'special', label: 'Special' },
];

const InlineActionEditor = ({
  action,
  onChange,
}: {
  action: Omit<LibraryAction, 'id'>;
  onChange: (a: Omit<LibraryAction, 'id'>) => void;
}) => {
  const set = (patch: Partial<Omit<LibraryAction, 'id'>>) => onChange({ ...action, ...patch });
  const useSkill = !!action.skill;

  return (
    <div className="space-y-1.5 rounded-sm border border-ink/15 bg-parchment/60 p-1.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Time
          <select
            value={action.actionTime ?? 'action'}
            onChange={(e) => set({ actionTime: e.target.value as ActionTime })}
            className="mt-0.5 h-6 rounded-sm border border-ink/30 bg-parchment px-1"
          >
            {ACTION_TIMES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Range
          <Input
            value={action.range ?? ''}
            onChange={(e) => set({ range: e.target.value })}
            className="mt-0.5 h-6 px-1.5"
            placeholder="5 ft"
          />
        </label>
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Damage
          <Input
            value={action.damageDice ?? ''}
            onChange={(e) => set({ damageDice: e.target.value || undefined })}
            className="mt-0.5 h-6 px-1.5"
            placeholder="1d8"
          />
        </label>
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Damage type
          <Input
            value={action.damageType ?? ''}
            onChange={(e) => set({ damageType: e.target.value || undefined })}
            className="mt-0.5 h-6 px-1.5"
            placeholder="fire"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 items-end">
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Roll with
          <select
            value={useSkill ? 'skill' : 'ability'}
            onChange={(e) => {
              if (e.target.value === 'skill') set({ skill: 'athletics', ability: undefined });
              else set({ skill: undefined, ability: action.ability ?? 'str' });
            }}
            className="mt-0.5 h-6 rounded-sm border border-ink/30 bg-parchment px-1"
          >
            <option value="ability">Ability</option>
            <option value="skill">Skill</option>
          </select>
        </label>
        {!useSkill ? (
          <label className="flex flex-col text-[0.65rem] text-ink-faded">
            Ability
            <select
              value={action.ability ?? ''}
              onChange={(e) => set({ ability: (e.target.value || undefined) as AbilityKey | undefined })}
              className="mt-0.5 h-6 rounded-sm border border-ink/30 bg-parchment px-1 uppercase"
            >
              <option value="">—</option>
              {ABILITY_KEYS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col text-[0.65rem] text-ink-faded">
            Skill
            <select
              value={action.skill ?? 'athletics'}
              onChange={(e) => set({ skill: e.target.value })}
              className="mt-0.5 h-6 rounded-sm border border-ink/30 bg-parchment px-1"
            >
              {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col text-[0.65rem] text-ink-faded">
          Save vs
          <select
            value={action.saveAbility ?? ''}
            onChange={(e) => set({ saveAbility: (e.target.value || undefined) as AbilityKey | undefined })}
            className="mt-0.5 h-6 rounded-sm border border-ink/30 bg-parchment px-1 uppercase"
          >
            <option value="">—</option>
            {ABILITY_KEYS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[0.65rem] text-ink-faded h-6">
          <input
            type="checkbox"
            checked={action.proficient ?? false}
            onChange={(e) => set({ proficient: e.target.checked })}
            className="accent-oxblood"
          />
          Proficient
        </label>
      </div>
      <Input
        value={action.description ?? ''}
        onChange={(e) => set({ description: e.target.value || undefined })}
        className="h-7 px-2 text-xs"
        placeholder="Description / notes"
      />
    </div>
  );
};
