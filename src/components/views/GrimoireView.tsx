import { useMemo, useState } from 'react';
import type { Character } from '@/lib/types';
import type { Derived } from '@/lib/rules';
import { CLASSES, SAMPLE_SPELLS } from '@/lib/srd';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, BookOpen, Search, ListFilter } from 'lucide-react';
import { KeywordText } from '@/components/KeywordText';
import { SourceTag } from '@/components/SourceTag';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { abilityMod, maxPreparedSpells } from '@/lib/rules';
import type { AbilityKey, SourceType, SpellEntry } from '@/lib/types';
import { ABILITY_KEYS } from '@/lib/types';
import { LibraryPicker } from '@/components/LibraryPicker';

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'class', label: 'Class' },
  { value: 'species', label: 'Race / Species' },
  { value: 'feat', label: 'Feat' },
  { value: 'item', label: 'Item' },
  { value: 'background', label: 'Background' },
  { value: 'custom', label: 'Special / Custom' },
];

const SourceEditor = ({
  source, label, onChange,
}: {
  source?: SourceType;
  label?: string;
  onChange: (patch: Partial<Pick<SpellEntry, 'source' | 'sourceLabel'>>) => void;
}) => {
  const current = source ?? 'custom';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Edit source"
        >
          {source ? (
            <SourceTag source={source} label={label} />
          ) : (
            <span className="rounded-sm border border-dashed border-ink/40 px-1 text-[0.6rem] uppercase tracking-wider text-ink-faded">
              + Source
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 parchment-card p-3 space-y-2">
        <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Source type</div>
        <select
          value={current}
          onChange={(e) => onChange({ source: e.target.value as SourceType })}
          className="w-full rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 text-sm text-ink"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Label (e.g. Wizard, Magic Initiate)</div>
        <Input
          value={label ?? ''}
          onChange={(e) => onChange({ sourceLabel: e.target.value || undefined })}
          placeholder="Optional custom label"
          className="h-8"
        />
        {source && (
          <button
            type="button"
            className="text-[0.7rem] text-destructive hover:underline"
            onClick={() => onChange({ source: undefined, sourceLabel: undefined })}
          >
            Clear source
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface Props { character: Character; derived: Derived }

export const GrimoireView = ({ character: c, derived: d }: Props) => {
  const addSpell = useAppStore((s) => s.addSpell);
  const removeSpell = useAppStore((s) => s.removeSpell);
  const updateSpell = useAppStore((s) => s.updateSpell);
  const copyFromLibrary = useAppStore((s) => s.copyFromLibrary);
  const libraryClasses = useAppStore((s) => s.library.classes);
  const librarySpells = useAppStore((s) => s.library.spells);
  const cls = libraryClasses.find((x) => x.id === c.classId) ?? CLASSES.find((x) => x.id === c.classId);

  const [spellAbility, setSpellAbility] = useState<AbilityKey>(
    cls?.caster === 'pact' ? 'cha' :
    cls?.caster === 'full' || cls?.caster === 'half' ? (cls.primaryAbility[0] as AbilityKey) :
    'int'
  );

  const [search, setSearch] = useState('');
  const [showLists, setShowLists] = useState(false);
  const [listClass, setListClass] = useState<string>(cls?.name ?? libraryClasses[0]?.name ?? '');
  const [dropTarget, setDropTarget] = useState<number | 'any' | null>(null);

  const grouped = useMemo(() => {
    const combined = [
      ...c.spells,
      ...d.grantedSpells.map((g) => ({ ...g, __granted: true } as SpellEntry & { __granted?: boolean; grantedBy?: string })),
    ];
    const list = combined.filter((s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<number, typeof list>();
    list.forEach((s) => {
      const arr = map.get(s.level) ?? [];
      arr.push(s);
      map.set(s.level, arr);
    });
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [c.spells, d.grantedSpells, search]);

  const filteredListSpells = useMemo(
    () => librarySpells.filter((s) => (s.spellLists ?? []).includes(listClass)),
    [librarySpells, listClass]
  );

  const dc = 8 + d.pb + abilityMod(c.abilities[spellAbility]);
  const atk = d.pb + abilityMod(c.abilities[spellAbility]);

  // Prepared count: non-cantrip spells flagged prepared (excluding alwaysPrepared per 2024 rules)
  const preparedCount = c.spells.filter(
    (s) => s.level > 0 && !s.alwaysPrepared && (s.prepared || s.source === 'class')
  ).length;
  const preparedMax = maxPreparedSpells(c.classId, c.level);
  const preparedOver = preparedMax !== null && preparedCount > preparedMax;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const spellId = e.dataTransfer.getData('text/spell-id');
    if (spellId) copyFromLibrary(c.id, 'spells', spellId);
  };

  return (
    <div className="space-y-3">
      <section className="parchment-panel rounded-md p-3">
        <div className="relative z-10 grid gap-2 sm:grid-cols-5">
          <div>
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Spell Ability</div>
            <select
              value={spellAbility}
              onChange={(e) => setSpellAbility(e.target.value as AbilityKey)}
              className="mt-1 w-full rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 font-display text-ink"
            >
              {ABILITY_KEYS.map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="stat-block rounded-sm p-1.5 text-center">
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Spell Save DC</div>
            <div className="font-display text-xl text-ink leading-tight">{dc}</div>
          </div>
          <div className="stat-block rounded-sm p-1.5 text-center">
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Spell Attack</div>
            <div className="font-display text-xl text-ink leading-tight">+{atk}</div>
          </div>
          <div className="stat-block rounded-sm p-1.5 text-center">
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Cantrip Tier</div>
            <div className="font-display text-xl text-ink leading-tight">L{d.cantripTier}</div>
          </div>
          <div className="stat-block rounded-sm p-1.5 text-center">
            <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">Prepared</div>
            <div className={cn('font-display text-xl leading-tight', preparedOver ? 'text-destructive' : 'text-ink')}>
              {preparedCount}{preparedMax !== null ? ` / ${preparedMax}` : ''}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faded" />
          <Input
            placeholder="Search your spells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLists((v) => !v)}
            className={cn('border-ink/40', showLists ? 'bg-secondary' : 'bg-parchment-light hover:bg-secondary')}
          >
            <ListFilter className="mr-1 h-3.5 w-3.5" /> Spell Lists
          </Button>
          <LibraryPicker characterId={c.id} category="spells" label="From Library" />
          <AddSpellDialog onAdd={(sp) => addSpell(c.id, sp)} />
        </div>
      </div>

      <div className={cn('grid gap-3', showLists ? 'md:grid-cols-[1fr,300px]' : 'grid-cols-1')}>
        <div className="space-y-3 min-w-0">
          {grouped.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDropTarget('any'); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={handleDrop}
              className={cn(
                'parchment-panel rounded-md p-8 text-center transition-all',
                dropTarget === 'any' && 'ring-2 ring-oxblood'
              )}
            >
              <BookOpen className="mx-auto mb-2 h-10 w-10 text-ink/40" />
              <p className="text-ink-faded">Your spellbook is empty. Add spells from the SRD library, drag from a spell list, or scribe your own.</p>
            </div>
          ) : (
            grouped.map(([lvl, spells]) => (
              <section
                key={lvl}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(lvl); }}
                onDragLeave={() => setDropTarget((t) => (t === lvl ? null : t))}
                onDrop={handleDrop}
                className={cn(
                  'parchment-panel rounded-md p-3 transition-all',
                  dropTarget === lvl && 'ring-2 ring-oxblood'
                )}
              >
                <div className="relative z-10">
                  <h3 className="font-display text-base text-oxblood-deep">
                    {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
                    <span className="ml-2 text-xs text-ink-faded font-sans">{spells.length}</span>
                  </h3>
                  <div className="ink-divider my-1.5" />
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {spells.map((sp) => {
                  const granted = (sp as any).__granted as boolean | undefined;
                  const grantedBy = (sp as any).grantedBy as string | undefined;
                  return (
                  <div key={sp.id} className={cn("stat-block rounded-sm p-2 flex flex-col", granted && "border-royal/50 bg-royal/5")}>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => !granted && updateSpell(c.id, sp.id, { prepared: !sp.prepared })}
                            disabled={sp.alwaysPrepared || granted}
                            className={cn(
                              'h-3.5 w-3.5 rounded-sm border-1.5 border-ink/70 flex-shrink-0',
                              (sp.prepared || sp.alwaysPrepared) && 'bg-oxblood border-oxblood',
                              (sp.alwaysPrepared || granted) && 'cursor-not-allowed opacity-80'
                            )}
                            aria-label="Prepared"
                            title={sp.alwaysPrepared ? 'Always prepared' : 'Toggle prepared'}
                          />
                          <span className="font-display text-[0.95rem] text-ink leading-tight">{sp.name}</span>
                          {sp.concentration && <span className="rounded-sm border border-oxblood/50 px-1 text-[0.6rem] uppercase tracking-wider text-oxblood-deep">Conc.</span>}
                          {sp.ritual && <span className="rounded-sm border border-royal/50 px-1 text-[0.6rem] uppercase tracking-wider text-royal">Ritual</span>}
                          {granted ? (
                            <span className="rounded-sm border border-royal/50 px-1 text-[0.6rem] uppercase tracking-wider text-royal" title={grantedBy}>
                              from {grantedBy}
                            </span>
                          ) : (
                            <SourceEditor
                              source={sp.source}
                              label={sp.sourceLabel}
                              onChange={(patch) => updateSpell(c.id, sp.id, patch)}
                            />
                          )}
                        </div>
                        <div className="mt-1 text-[0.72rem] text-ink-faded leading-snug">
                          <span className="text-ink">{sp.school}</span> · {sp.castingTime} · {sp.range} · {sp.duration}
                          <span className="block">{sp.components}{sp.alwaysPrepared && <span className="ml-1 text-forest uppercase tracking-wider">· Always Prepared</span>}</span>
                        </div>
                      </div>
                      {!granted && (
                        <button
                          aria-label="Remove"
                          className="rounded p-0.5 text-ink/50 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                          onClick={() => removeSpell(c.id, sp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-[0.85rem] text-ink leading-snug"><KeywordText text={sp.description} /></p>
                    {sp.cantripScaling && (
                      <p className="mt-1 text-[0.72rem] italic text-oxblood-deep leading-snug">
                        L5: {sp.cantripScaling[5]} · L11: {sp.cantripScaling[11]} · L17: {sp.cantripScaling[17]}
                        <span className="ml-1 text-ink-faded">(now L{d.cantripTier})</span>
                      </p>
                    )}
                    {sp.higherLevels && (
                      <p className="mt-1 text-[0.8rem] leading-snug"><b className="text-ink">Higher Levels.</b> <span className="text-ink-faded">{sp.higherLevels}</span></p>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))
      )}
        </div>

        {showLists && (
          <aside className="parchment-panel rounded-md p-3 h-fit md:sticky md:top-3">
            <div className="relative z-10 space-y-2">
              <h3 className="font-display text-sm text-oxblood-deep">Spell Lists</h3>
              <select
                value={listClass}
                onChange={(e) => setListClass(e.target.value)}
                className="w-full rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 text-sm"
              >
                {libraryClasses.map((cl) => (
                  <option key={cl.id} value={cl.name}>{cl.name}</option>
                ))}
              </select>
              <p className="text-[0.65rem] italic text-ink-faded">
                Drag a spell onto a level section to add it to your grimoire.
              </p>
              {filteredListSpells.length === 0 ? (
                <p className="text-xs italic text-ink-faded text-center py-4">
                  No spells in your library tagged for {listClass || 'this class'}.
                </p>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {filteredListSpells
                    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                    .map((sp) => (
                      <div
                        key={sp.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/spell-id', sp.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => copyFromLibrary(c.id, 'spells', sp.id)}
                        className="cursor-grab active:cursor-grabbing rounded-sm border border-ink/20 bg-parchment-light p-1.5 hover:bg-secondary"
                        title="Drag to a level, or click to add"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm text-ink truncate">{sp.name}</span>
                          <span className="text-[0.6rem] text-ink-faded flex-shrink-0">
                            {sp.level === 0 ? 'Cantrip' : `L${sp.level}`}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

const AddSpellDialog = ({ onAdd }: { onAdd: (s: Omit<import('@/lib/types').SpellEntry, 'id'>) => void }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'srd' | 'custom'>('srd');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState({
    name: '', level: 0, school: 'Evocation', castingTime: 'Action',
    range: '60 ft', components: 'V, S', duration: 'Instantaneous',
    description: '', higherLevels: '', concentration: false,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep">
          <Plus className="mr-1.5 h-4 w-4" /> Add Spell
        </Button>
      </DialogTrigger>
      <DialogContent className="parchment-card max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-oxblood-deep">Add Spell</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'srd' ? 'default' : 'outline'} onClick={() => setTab('srd')}>SRD Library</Button>
          <Button size="sm" variant={tab === 'custom' ? 'default' : 'outline'} onClick={() => setTab('custom')}>Custom / Homebrew</Button>
        </div>
        {tab === 'srd' && (
          <div>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {SAMPLE_SPELLS
                .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    className="w-full rounded-sm border border-ink/20 bg-parchment-light p-2 text-left hover:bg-secondary"
                    onClick={() => { const { id: _id, ...rest } = s; onAdd({ ...rest, source: 'class' }); setOpen(false); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-ink">{s.name}</span>
                      <span className="text-xs text-ink-faded">{s.level === 0 ? 'Cantrip' : `L${s.level}`} · {s.school}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
        {tab === 'custom' && (
          <div className="space-y-2">
            <Input placeholder="Name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} max={9} placeholder="Level (0=cantrip)" value={custom.level}
                onChange={(e) => setCustom({ ...custom, level: parseInt(e.target.value || '0', 10) })} />
              <Input placeholder="School" value={custom.school} onChange={(e) => setCustom({ ...custom, school: e.target.value })} />
              <Input placeholder="Casting Time" value={custom.castingTime} onChange={(e) => setCustom({ ...custom, castingTime: e.target.value })} />
              <Input placeholder="Range" value={custom.range} onChange={(e) => setCustom({ ...custom, range: e.target.value })} />
              <Input placeholder="Components" value={custom.components} onChange={(e) => setCustom({ ...custom, components: e.target.value })} />
              <Input placeholder="Duration" value={custom.duration} onChange={(e) => setCustom({ ...custom, duration: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={custom.concentration} onChange={(e) => setCustom({ ...custom, concentration: e.target.checked })} />
              Concentration
            </label>
            <textarea
              placeholder="Description"
              value={custom.description}
              onChange={(e) => setCustom({ ...custom, description: e.target.value })}
              className="w-full rounded-sm border border-ink/40 bg-parchment-light p-2 text-sm min-h-24"
            />
            <label className="block text-xs text-ink-faded">
              At Higher Levels (scaling)
              <textarea
                placeholder="e.g. The damage increases by 1d6 for each spell slot level above 3rd. (Or for cantrips: 2d10 at L5, 3d10 at L11, 4d10 at L17.)"
                value={custom.higherLevels}
                onChange={(e) => setCustom({ ...custom, higherLevels: e.target.value })}
                className="mt-0.5 w-full rounded-sm border border-ink/40 bg-parchment-light p-2 text-sm min-h-16"
              />
            </label>
            <Button
              className="w-full bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
              onClick={() => {
                if (!custom.name) return;
                const { higherLevels, ...rest } = custom;
                onAdd({
                  ...rest,
                  source: 'custom',
                  ...(higherLevels.trim() ? { higherLevels: higherLevels.trim() } : {}),
                });
                setOpen(false);
              }}
            >
              Add Custom Spell
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
