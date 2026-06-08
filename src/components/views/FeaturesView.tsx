import type { Character, CharacterFeature, SourceType } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Pips } from '@/components/Pips';
import { SourceTag } from '@/components/SourceTag';
import { KeywordText } from '@/components/KeywordText';
import { evalFormula, activeTierValue, type Derived } from '@/lib/rules';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BonusesPanel } from '@/components/BonusesPanel';
import { LibraryPicker } from '@/components/LibraryPicker';
import { LockableTextarea } from '@/components/LockableTextarea';
import { spellMatchesConstraints } from '@/components/GrantsEditor';
import type { Grant } from '@/lib/types';

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
  const libraryClasses = useAppStore((s) => s.library.classes);

  const [openId, setOpenId] = useState<string | null>(null);

  // ---- Auto-sync class features from the class library based on level ----
  useEffect(() => {
    const cls = libraryClasses.find((cl) => cl.id === c.classId);
    const expected = (cls?.features ?? []).filter((f) => (f.level ?? 1) <= c.level);
    const expectedRefs = new Set(expected.map((f) => `class:${c.classId}:${f.id}`));

    const existing = c.features;
    const keptNonAuto = existing.filter((f) => !f.auto);
    const existingAutoByRef = new Map(
      existing.filter((f) => f.auto && f.sourceRef).map((f) => [f.sourceRef!, f]),
    );

    // Build the new auto list: refresh from library, preserve `used` (feature + per-grant).
    const autoNext = expected.map((libF) => {
      const ref = `class:${c.classId}:${libF.id}`;
      const prev = existingAutoByRef.get(ref);
      const prevGrantUsed = new Map(
        (prev?.grants ?? []).map((g) => [g.id, g.uses?.used ?? 0]),
      );
      // Preserve player choices for spell-choice grants across auto-sync.
      const prevGrantChoice = new Map(
        (prev?.grants ?? [])
          .filter((g) => g.kind === 'spell-choice')
          .map((g) => [g.id, (g as { chosenSpellId?: string }).chosenSpellId]),
      );
      const grants = libF.grants?.map((g) => {
        let next: typeof g = g;
        if (g.uses) {
          next = { ...g, uses: { ...g.uses, used: prevGrantUsed.get(g.id) ?? g.uses.used ?? 0 } } as typeof g;
        }
        if (g.kind === 'spell-choice' && prevGrantChoice.has(g.id)) {
          next = { ...(next as typeof g & { kind: 'spell-choice' }), chosenSpellId: prevGrantChoice.get(g.id) };
        }
        return next;
      });
      return {
        ...libF,
        grants,
        id: prev?.id ?? `auto-${ref}`,
        source: 'class' as const,
        sourceLabel: libF.sourceLabel ?? cls?.name,
        used: prev?.used ?? 0,
        auto: true,
        sourceRef: ref,
      };
    });

    // Detect changes (avoid infinite loop when nothing differs).
    const prevAutos = existing.filter((f) => f.auto);
    const sameCount = prevAutos.length === autoNext.length;
    const sameRefs = sameCount && prevAutos.every((p) => expectedRefs.has(p.sourceRef ?? ''));
    const sameContent =
      sameRefs &&
      autoNext.every((a) => {
        const p = existingAutoByRef.get(a.sourceRef!);
        return (
          p &&
          p.name === a.name &&
          p.description === a.description &&
          p.usesFormula === a.usesFormula &&
          p.reset === a.reset &&
          p.rechargeFormula === a.rechargeFormula &&
          p.level === a.level
        );
      });
    if (sameContent) return;

    update(c.id, { features: [...autoNext, ...keptNonAuto] });
  }, [c.id, c.classId, c.level, libraryClasses, c.features, update]);

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
              {f.auto && (
                <span
                  className="text-[0.6rem] uppercase tracking-wider rounded-sm border border-oxblood/40 bg-oxblood/10 px-1 py-0.5 text-oxblood-deep"
                  title={`Auto-granted at level ${f.level ?? 1}`}
                >
                  Auto · L{f.level ?? 1}
                </span>
              )}
              {f.reset && f.reset !== 'none' && (
                <span className="text-[0.65rem] uppercase tracking-wider text-ink-faded">
                  {f.reset} rest
                </span>
              )}
            </div>
            {f.description && (
              <p className="mt-1 text-sm text-ink-faded whitespace-pre-wrap">
                <KeywordText text={f.description} />
              </p>
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
          {!f.auto && (
            <button
              onClick={() => removeFeature(c.id, f.id)}
              className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
              aria-label="Remove feature"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>


        {open && (f.grants ?? []).some((g) => g.kind === 'spell-choice') && (
          <div className="border-t border-ink/15 p-3 space-y-2 bg-parchment-light/40">
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Spell Choices</div>
            {(f.grants ?? [])
              .filter((g): g is Extract<Grant, { kind: 'spell-choice' }> => g.kind === 'spell-choice')
              .map((g) => (
                <SpellChoicePicker
                  key={g.id}
                  grant={g}
                  onPick={(spellId) => {
                    const nextGrants = (f.grants ?? []).map((x) =>
                      x.id === g.id ? ({ ...x, chosenSpellId: spellId || undefined } as Grant) : x,
                    );
                    updateFeature(c.id, f.id, { grants: nextGrants });
                  }}
                />
              ))}
          </div>
        )}

        {open && f.auto && (
          <div className="border-t border-ink/15 p-3 text-xs italic text-ink-faded bg-parchment-light/40">
            This feature is granted automatically by your class at level {f.level ?? 1}. Edit it in
            the class library to change its description or usage.
          </div>
        )}

        {open && !f.auto && (
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
                  placeholder="e.g. 3, PB, 1 + CHA"
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
              {f.reset && f.reset !== 'none' && (
                <label className="text-xs text-ink-faded sm:col-span-2">
                  Recharge amount <span className="italic">(blank = all; e.g. 1, 1d4, PB)</span>
                  <Input
                    value={f.rechargeFormula ?? ''}
                    onChange={(e) => updateFeature(c.id, f.id, { rechargeFormula: e.target.value })}
                    placeholder="all"
                    className="mt-0.5 h-8 font-mono text-sm"
                  />
                </label>
              )}
            </div>
            <label className="text-xs text-ink-faded block">
              Description
              <LockableTextarea
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-display text-lg text-oxblood-deep">{g.group}</h3>
                <div className="flex items-center gap-1.5">
                  <LibraryPicker characterId={c.id} category="features" label="From Library" />
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
        <BonusesPanel character={c} derived={d} />
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

// ---------------------------------------------------------------------------
// Spell choice picker — lets the player select a library spell that satisfies
// a grant's constraints (e.g. Magic Initiate, Fey Touched).
// ---------------------------------------------------------------------------

const SpellChoicePicker = ({
  grant,
  onPick,
}: {
  grant: Extract<Grant, { kind: 'spell-choice' }>;
  onPick: (spellId: string) => void;
}) => {
  const librarySpells = useAppStore((s) => s.library.spells);
  const candidates = librarySpells
    .filter((sp) => spellMatchesConstraints(sp, grant.constraints))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const summary: string[] = [];
  const k = grant.constraints;
  if (k.minLevel !== undefined || k.maxLevel !== undefined) {
    summary.push(
      `level ${k.minLevel ?? 0}–${k.maxLevel ?? 9}`,
    );
  }
  if (k.schools?.length) summary.push(k.schools.join(' / '));
  if (k.classes?.length) summary.push(`${k.classes.join(' / ')} list`);
  if (k.ritualOnly) summary.push('ritual only');
  const limits = summary.length ? summary.join(' · ') : 'any spell';

  return (
    <div className="rounded-sm border border-ink/15 bg-parchment-light p-2 text-xs">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="italic text-ink-faded">Pick a spell — {limits}</span>
        {grant.chosenSpellId && (
          <button
            type="button"
            onClick={() => onPick('')}
            className="text-[0.65rem] text-ink-faded hover:text-oxblood-deep"
          >
            clear
          </button>
        )}
      </div>
      {candidates.length === 0 ? (
        <p className="italic text-ink-faded">
          No spell in your library matches these limits. Add spells (and tag them with school / class / ritual) in the Library.
        </p>
      ) : (
        <select
          value={grant.chosenSpellId ?? ''}
          onChange={(e) => onPick(e.target.value)}
          className="w-full rounded-sm border border-ink/40 bg-parchment px-2 py-1 text-sm"
        >
          <option value="">— choose a spell —</option>
          {candidates.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name} ({sp.level === 0 ? 'C' : `L${sp.level}`} · {sp.school}
              {sp.ritual ? ' · R' : ''})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
