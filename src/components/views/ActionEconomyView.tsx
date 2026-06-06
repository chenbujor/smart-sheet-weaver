import { useState } from 'react';
import type { Character, CharacterAction, SpellEntry, ActionTime } from '@/lib/types';
import type { Derived } from '@/lib/rules';
import { abilityMod, formatMod, SKILLS } from '@/lib/rules';
import { KeywordText } from '@/components/KeywordText';
import { Swords, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Basic actions available to any character (PHB 2024)
const BASIC_ACTIONS: Record<Slot, { name: string; description: string; meta?: string }[]> = {
  action: [
    { name: 'Attack', description: 'Make one melee or ranged attack. Some features (like Extra Attack) let you make more.', meta: 'Standard combat action' },
    { name: 'Unarmed Strike', description: 'Choose Damage, Grapple, or Shove. Damage: melee attack, 1 + STR bludgeoning. Grapple: target makes STR or DEX save vs your Unarmed Strike DC (8 + STR + PB), on fail it is Grappled. Shove: same save, push 5 ft or knock Prone.', meta: 'Melee · 5 ft' },
    { name: 'Dash', description: 'Gain extra movement equal to your Speed for the current turn.' },
    { name: 'Disengage', description: 'Your movement doesn\'t provoke Opportunity Attacks for the rest of the turn.' },
    { name: 'Dodge', description: 'Until the start of your next turn, attack rolls against you have Disadvantage (if you can see the attacker) and you have Advantage on DEX saves. Lost if Incapacitated or Speed 0.' },
    { name: 'Help', description: 'Aid an ally: give them Advantage on their next ability check (within 5 ft, before your next turn) OR Advantage on the next attack roll against a creature within 5 ft of you.' },
    { name: 'Hide', description: 'Make a DEX (Stealth) check while out of any enemy\'s line of sight to gain the Invisible condition.' },
    { name: 'Influence', description: 'Interact socially to change a creature\'s attitude. The DM may call for a Charisma check (Deception, Intimidation, Performance, or Persuasion) or Wisdom (Animal Handling).', meta: 'Social' },
    { name: 'Magic', description: 'Cast a spell with a casting time of an action, or use a magic feature that requires a Magic action.' },
    { name: 'Ready', description: 'Choose a trigger and a prepared action or movement. When the trigger occurs before the start of your next turn, you may use your Reaction to act. Concentration is required.' },
    { name: 'Search', description: 'Make a Wisdom check (Insight, Medicine, Perception, or Survival) to look for something.' },
    { name: 'Study', description: 'Make an Intelligence check (Arcana, History, Investigation, Nature, or Religion) to recall lore or analyze.' },
    { name: 'Utilize', description: 'Use a non-magical object, such as drinking a potion you give to another creature or activating a mundane device.' },
  ],
  bonus: [
    { name: 'Two-Weapon Fighting (offhand)', description: 'After taking the Attack action with a Light weapon in one hand, use a Bonus Action to attack with a different Light weapon in the other hand. No ability mod on damage unless negative.' },
  ],
  reaction: [
    { name: 'Opportunity Attack', description: 'When a creature you can see moves out of your reach, use your Reaction to make one melee attack against it.' },
    { name: 'Ready (triggered)', description: 'When the trigger from a Ready action occurs, take the prepared action as your Reaction.' },
  ],
};

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
