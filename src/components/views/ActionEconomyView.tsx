import { useState } from 'react';
import type { Character, CharacterAction, SpellEntry, ActionTime } from '@/lib/types';
import type { Derived } from '@/lib/rules';
import { abilityMod, formatMod, SKILLS } from '@/lib/rules';
import { KeywordText } from '@/components/KeywordText';
import { Swords, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Props { character: Character; derived: Derived }

type Slot = 'action' | 'bonus' | 'reaction';
type SourceKey = 'basic' | 'weapon' | 'spell' | 'feature' | 'item' | 'custom';

interface Entry {
  key: string;
  name: string;
  sourceKey: SourceKey;
  source: string;
  detail?: string;
  description?: string;
  meta?: string;
}

const SLOT_META: Record<Slot, { label: string; icon: typeof Swords; tint: string }> = {
  action:   { label: 'Actions',        icon: Swords,       tint: 'text-oxblood-deep' },
  bonus:    { label: 'Bonus Actions',  icon: Zap,          tint: 'text-gold' },
  reaction: { label: 'Reactions',      icon: ShieldAlert,  tint: 'text-royal' },
};

const SOURCE_META: Record<SourceKey, { label: string }> = {
  basic:   { label: 'Basic' },
  weapon:  { label: 'Weapons' },
  spell:   { label: 'Spells' },
  feature: { label: 'Features' },
  item:    { label: 'Items' },
  custom:  { label: 'Custom' },
};

const ALL_SOURCES: SourceKey[] = ['basic', 'weapon', 'spell', 'feature', 'item', 'custom'];

export const ActionEconomyView = ({ character: c, derived: d }: Props) => {
  const basicActions = useAppStore((s) => s.library.basicActions);

export const ActionEconomyView = ({ character: c, derived: d }: Props) => {
  const [filters, setFilters] = useState<Record<Slot, Set<SourceKey>>>(() => ({
    action: new Set(ALL_SOURCES),
    bonus: new Set(ALL_SOURCES),
    reaction: new Set(ALL_SOURCES),
  }));

  const toggle = (slot: Slot, src: SourceKey) => {
    setFilters((prev) => {
      const next = new Set(prev[slot]);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return { ...prev, [slot]: next };
    });
  };

  const actionBonus = (a: CharacterAction): { value: number; label: string } => {
    if (a.skill) {
      const skill = SKILLS.find((s) => s.id === a.skill);
      const ab = skill?.ability ?? 'str';
      const profTier = c.skills[a.skill] ?? (a.proficient ? 'prof' : 'none');
      const pbAdd = profTier === 'expert' ? d.pb * 2 : profTier === 'prof' ? d.pb : 0;
      return { value: abilityMod(d.effectiveAbilities[ab]) + pbAdd, label: `${skill?.name ?? a.skill}` };
    }
    const ab = a.ability ?? 'str';
    const pbAdd = a.proficient ? d.pb : 0;
    return { value: abilityMod(d.effectiveAbilities[ab]) + pbAdd, label: ab.toUpperCase() };
  };

  const buckets: Record<Slot, Entry[]> = { action: [], bonus: [], reaction: [] };

  // Basic
  for (const slot of ['action', 'bonus', 'reaction'] as Slot[]) {
    for (const a of BASIC_ACTIONS[slot]) {
      buckets[slot].push({
        key: `basic:${slot}:${a.name}`,
        name: a.name,
        sourceKey: 'basic',
        source: 'Basic',
        meta: a.meta,
        description: a.description,
      });
    }
  }

  // Weapons
  for (const it of c.inventory ?? []) {
    if (!it.weapon) continue;
    const w = it.weapon;
    const atk = abilityMod(c.abilities[w.ability]) + (w.proficient ? d.pb : 0) + (w.bonus ?? 0);
    const dmg = abilityMod(c.abilities[w.ability]) + (w.bonus ?? 0);
    buckets.action.push({
      key: `weapon:${it.id}`,
      name: it.name,
      sourceKey: 'weapon',
      source: it.equipped ? 'Weapon (equipped)' : 'Weapon',
      detail: `Atk ${formatMod(atk)} · ${w.damageDice}${formatMod(dmg)} ${w.damageType}`,
      description: it.description,
    });
  }

  // Custom actions
  for (const a of c.actions ?? []) {
    const slot = (a.actionTime ?? 'action') as ActionTime;
    if (slot !== 'action' && slot !== 'bonus' && slot !== 'reaction') continue;
    const b = actionBonus(a);
    const parts: string[] = [];
    if (a.range) parts.push(a.range);
    if (a.damageDice) parts.push(`${a.damageDice}${a.damageType ? ' ' + a.damageType : ''}`);
    if (a.saveAbility) parts.push(`Save ${a.saveAbility.toUpperCase()}${a.saveAbility2 ? '/' + a.saveAbility2.toUpperCase() : ''}`);
    buckets[slot].push({
      key: `action:${a.id}`,
      name: a.name,
      sourceKey: 'custom',
      source: 'Custom',
      detail: `${b.label}: ${formatMod(b.value)}`,
      meta: parts.join(' · ') || undefined,
      description: a.description,
    });
  }

  // Granted actions (from features/items) — classify class vs item by ref
  for (const a of d.grantedActions ?? []) {
    const slot = (a.actionTime ?? 'action') as ActionTime;
    if (slot !== 'action' && slot !== 'bonus' && slot !== 'reaction') continue;
    const b = actionBonus(a as CharacterAction);
    const parts: string[] = [];
    if (a.range) parts.push(a.range);
    if (a.damageDice) parts.push(`${a.damageDice}${a.damageType ? ' ' + a.damageType : ''}`);
    const refKind = (a as any).grantRef?.kind as 'feature' | 'item' | undefined;
    const sourceKey: SourceKey = refKind === 'item' ? 'item' : 'feature';
    buckets[slot].push({
      key: `granted:${a.id}`,
      name: a.name,
      sourceKey,
      source: `Granted by ${(a as any).grantedBy ?? 'feature'}`,
      detail: `${b.label}: ${formatMod(b.value)}`,
      meta: parts.join(' · ') || undefined,
      description: a.description,
    });
  }

  // Spells
  const classifySpellTime = (castingTime: string | undefined): Slot | null => {
    if (!castingTime) return null;
    const t = castingTime.toLowerCase();
    if (t.includes('reaction')) return 'reaction';
    if (t.includes('bonus')) return 'bonus';
    if (t.includes('action')) return 'action';
    return null;
  };

  const allSpells: (SpellEntry & { grantedBy?: string })[] = [
    ...(c.spells ?? []),
    ...((d.grantedSpells ?? []) as any[]),
  ];
  for (const s of allSpells) {
    const slot = classifySpellTime(s.castingTime);
    if (!slot) continue;
    const parts: string[] = [];
    parts.push(s.level === 0 ? 'Cantrip' : `Lv ${s.level}`);
    if (s.range) parts.push(s.range);
    if (s.concentration) parts.push('Concentration');
    buckets[slot].push({
      key: `spell:${s.id}`,
      name: s.name,
      sourceKey: 'spell',
      source: (s as any).grantedBy ? `Spell · granted by ${(s as any).grantedBy}` : 'Spell',
      meta: parts.join(' · '),
      description: s.description,
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {(['action', 'bonus', 'reaction'] as Slot[]).map((slot) => {
        const active = filters[slot];
        const entries = buckets[slot].filter((e) => active.has(e.sourceKey));
        const meta = SLOT_META[slot];
        const Icon = meta.icon;
        return (
          <section key={slot} className="parchment-panel rounded-md p-4">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h3 className={cn('font-display text-lg flex items-center gap-1.5', meta.tint)}>
                  <Icon className="h-4 w-4" /> {meta.label}
                </h3>
                <span className="text-xs text-ink-faded">{entries.length}</span>
              </div>
              <div className="ink-divider my-2" />
              <div className="flex flex-wrap gap-1 mb-2">
                {ALL_SOURCES.map((src) => {
                  const on = active.has(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggle(slot, src)}
                      className={cn(
                        'text-[0.65rem] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border transition-colors',
                        on
                          ? 'bg-ink text-parchment border-ink'
                          : 'bg-transparent text-ink-faded border-ink/30 hover:border-ink/60',
                      )}
                    >
                      {SOURCE_META[src].label}
                    </button>
                  );
                })}
              </div>
              {entries.length === 0 ? (
                <p className="text-xs italic text-ink-faded">Nothing available.</p>
              ) : (
                <ul className="space-y-2">
                  {entries.map((e) => (
                    <li key={e.key} className="stat-block rounded-sm p-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-sm text-ink flex-1">{e.name}</span>
                        {e.detail && <span className="font-display text-xs text-ink">{e.detail}</span>}
                      </div>
                      <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">{e.source}</div>
                      {e.meta && <div className="text-[0.7rem] text-ink-faded mt-0.5">{e.meta}</div>}
                      {e.description && (
                        <p className="mt-1 text-[0.72rem] text-ink-faded leading-snug line-clamp-3">
                          <KeywordText text={e.description} />
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
