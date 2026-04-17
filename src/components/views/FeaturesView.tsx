import type { Character, CharacterFeature, SourceType } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Pips } from '@/components/Pips';
import { SourceTag } from '@/components/SourceTag';
import { KeywordText } from '@/components/KeywordText';
import { evalFormula, activeTierValue, type Derived } from '@/lib/rules';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BonusesPanel } from '@/components/BonusesPanel';

interface Props { character: Character; derived: Derived }

const SOURCES: { key: SourceType; label: string; group: string }[] = [
  { key: 'class', label: 'Class', group: 'Class Features' },
  { key: 'species', label: 'Species', group: 'Species Traits' },
  { key: 'feat', label: 'Feat', group: 'Feats' },
  { key: 'background', label: 'Background', group: 'Background' },
  { key: 'item', label: 'Item', group: 'Item Features' },
  { key: 'custom', label: 'Special', group: 'Special Features' },
];

const RESETS = ['none', 'short', 'long', 'dawn'] as const;

export const FeaturesView = ({ character: c, derived: d }: Props) => {
  const update = useAppStore((s) => s.updateCharacter);
  const addFeature = useAppStore((s) => s.addFeature);
  const removeFeature = useAppStore((s) => s.removeFeature);
  const updateFeature = useAppStore((s) => s.updateFeature);
  const setFeatureUsed = useAppStore((s) => s.setFeatureUsed);

  const [openId, setOpenId] = useState<string | null>(null);

  const profs = c.proficiencies ?? {};
  const setProfs = (patch: Partial<NonNullable<Character['proficiencies']>>) =>
    update(c.id, { proficiencies: { ...profs, ...patch } });

  const grouped = SOURCES.map((s) => ({
    ...s,
    features: c.features.filter((f) => f.source === s.key),
  }));

  const renderFeature = (f: CharacterFeature) => {
    const open = openId === f.id;
    const max = f.usesFormula
      ? evalFormula(f.usesFormula, { pb: d.pb, level: c.level, abilities: c.abilities })
      : 0;
    const tier = activeTierValue(f.tiers, c.level);
    return (
      <div key={f.id} className="stat-block rounded-sm">
        <div className="flex items-start gap-2 p-3">
          <button
            onClick={() => setOpenId(open ? null : f.id)}
            className="mt-0.5 text-ink-faded hover:text-ink"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-base text-ink">{f.name}</span>
              <SourceTag source={f.source} label={f.sourceLabel} />
              {f.reset && f.reset !== 'none' && (
                <span className="text-[0.65rem] uppercase tracking-wider text-ink-faded">
                  {f.reset} rest
                </span>
              )}
            </div>
            {!open && f.description && (
              <p className="mt-1 text-sm text-ink-faded line-clamp-1">{f.description}</p>
            )}
            {tier && (
              <p className="mt-0.5 text-xs italic text-oxblood-deep">Tier (L{c.level}): {tier}</p>
            )}
            {max > 0 && (
              <div className="mt-2">
                <Pips total={max} used={Math.min(max, f.used ?? 0)} onChange={(u) => setFeatureUsed(c.id, f.id, u)} />
              </div>
            )}
          </div>
          <button
            onClick={() => removeFeature(c.id, f.id)}
            className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
            aria-label="Remove feature"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div className="border-t border-ink/15 p-3 space-y-2 bg-parchment-light/40">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-ink-faded">
                Name
                <Input
                  value={f.name}
                  onChange={(e) => updateFeature(c.id, f.id, { name: e.target.value })}
                  className="mt-0.5 h-8"
                />
              </label>
              <label className="text-xs text-ink-faded">
                Source label (e.g. "Fighter", "Elf")
                <Input
                  value={f.sourceLabel ?? ''}
                  onChange={(e) => updateFeature(c.id, f.id, { sourceLabel: e.target.value })}
                  className="mt-0.5 h-8"
                />
              </label>
              <label className="text-xs text-ink-faded">
                Uses formula <span className="italic">(PB, LEVEL, STR…)</span>
                <Input
                  value={f.usesFormula ?? ''}
                  onChange={(e) => updateFeature(c.id, f.id, { usesFormula: e.target.value })}
                  placeholder="e.g. PB or 1 + CHA"
                  className="mt-0.5 h-8 font-mono text-sm"
                />
              </label>
              <label className="text-xs text-ink-faded">
                Reset
                <select
                  value={f.reset ?? 'none'}
                  onChange={(e) => updateFeature(c.id, f.id, { reset: e.target.value as typeof RESETS[number] })}
                  className="mt-0.5 block w-full rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 text-sm h-8"
                >
                  {RESETS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <label className="text-xs text-ink-faded block">
              Description
              <textarea
                value={f.description}
                onChange={(e) => updateFeature(c.id, f.id, { description: e.target.value })}
                rows={3}
                className="mt-0.5 block w-full rounded-sm border border-ink/30 bg-parchment-light p-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>
    );
  };

  const profField = (
    key: keyof NonNullable<Character['proficiencies']>,
    label: string,
    placeholder: string,
  ) => (
    <label className="block">
      <span className="text-[0.65rem] uppercase tracking-wider text-ink-faded">{label}</span>
      <Input
        value={(profs[key] ?? []).join(', ')}
        onChange={(e) =>
          setProfs({
            [key]: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder={placeholder}
        className="mt-0.5"
      />
      {(profs[key] ?? []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {(profs[key] ?? []).map((p, i) => (
            <span key={i} className="rounded-sm border border-ink/30 bg-parchment-light px-1.5 py-0.5 text-xs">
              {p}
            </span>
          ))}
        </div>
      )}
    </label>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Features groups */}
      <div className="lg:col-span-2 space-y-4">
        {grouped.map((g) => (
          <section key={g.key} className="parchment-panel rounded-md p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-oxblood-deep">{g.group}</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addFeature(c.id, {
                      name: `New ${g.label} Feature`,
                      source: g.key,
                      description: '',
                      reset: 'none',
                    });
                  }}
                  className="border-oxblood text-oxblood-deep hover:bg-oxblood/10"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="ink-divider my-2" />
              {g.features.length === 0 ? (
                <p className="text-sm italic text-ink-faded">None yet.</p>
              ) : (
                <div className="space-y-2">{g.features.map(renderFeature)}</div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Right column */}
      <div className="space-y-4">
        <BonusesPanel character={c} />
        <section className="parchment-panel rounded-md p-5">
          <div className="relative z-10 space-y-3">
            <h3 className="font-display text-lg text-oxblood-deep">Proficiencies</h3>
            <div className="ink-divider" />
            <p className="text-xs italic text-ink-faded">Comma-separated lists.</p>
            {profField('armor', 'Armor', 'Light, Medium, Shields')}
            {profField('weapons', 'Weapons', 'Simple, Martial, Longbow')}
            {profField('tools', 'Tools', "Thieves' Tools, Smith's Tools")}
            {profField('languages', 'Languages', 'Common, Elvish, Draconic')}
          </div>
        </section>
      </div>
    </div>
  );
};
