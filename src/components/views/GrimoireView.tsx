import { useMemo, useState } from 'react';
import type { Character } from '@/lib/types';
import type { Derived } from '@/lib/rules';
import { CLASSES, SAMPLE_SPELLS } from '@/lib/srd';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, BookOpen, Search } from 'lucide-react';
import { KeywordText } from '@/components/KeywordText';
import { SourceTag } from '@/components/SourceTag';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { abilityMod } from '@/lib/rules';
import type { AbilityKey } from '@/lib/types';
import { ABILITY_KEYS } from '@/lib/types';
import { LibraryPicker } from '@/components/LibraryPicker';

interface Props { character: Character; derived: Derived }

export const GrimoireView = ({ character: c, derived: d }: Props) => {
  const addSpell = useAppStore((s) => s.addSpell);
  const removeSpell = useAppStore((s) => s.removeSpell);
  const updateSpell = useAppStore((s) => s.updateSpell);
  const cls = CLASSES.find((x) => x.id === c.classId);

  const [spellAbility, setSpellAbility] = useState<AbilityKey>(
    cls?.caster === 'pact' ? 'cha' :
    cls?.caster === 'full' || cls?.caster === 'half' ? (cls.primaryAbility[0] as AbilityKey) :
    'int'
  );

  const [search, setSearch] = useState('');
  const grouped = useMemo(() => {
    const list = c.spells.filter((s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<number, typeof list>();
    list.forEach((s) => {
      const arr = map.get(s.level) ?? [];
      arr.push(s);
      map.set(s.level, arr);
    });
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [c.spells, search]);

  const dc = 8 + d.pb + abilityMod(c.abilities[spellAbility]);
  const atk = d.pb + abilityMod(c.abilities[spellAbility]);

  return (
    <div className="space-y-3">
      <section className="parchment-panel rounded-md p-3">
        <div className="relative z-10 grid gap-2 sm:grid-cols-4">
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
          <LibraryPicker characterId={c.id} category="spells" label="From Library" />
          <AddSpellDialog onAdd={(sp) => addSpell(c.id, sp)} />
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="parchment-panel rounded-md p-8 text-center">
          <BookOpen className="mx-auto mb-2 h-10 w-10 text-ink/40" />
          <p className="text-ink-faded">Your spellbook is empty. Add spells from the SRD library or scribe your own.</p>
        </div>
      ) : (
        grouped.map(([lvl, spells]) => (
          <section key={lvl} className="parchment-panel rounded-md p-3">
            <div className="relative z-10">
              <h3 className="font-display text-base text-oxblood-deep">
                {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
                <span className="ml-2 text-xs text-ink-faded font-sans">{spells.length}</span>
              </h3>
              <div className="ink-divider my-1.5" />
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {spells.map((sp) => (
                  <div key={sp.id} className="stat-block rounded-sm p-2 flex flex-col">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => updateSpell(c.id, sp.id, { prepared: !sp.prepared })}
                            disabled={sp.alwaysPrepared}
                            className={cn(
                              'h-3.5 w-3.5 rounded-sm border-1.5 border-ink/70 flex-shrink-0',
                              (sp.prepared || sp.alwaysPrepared) && 'bg-oxblood border-oxblood',
                              sp.alwaysPrepared && 'cursor-not-allowed opacity-80'
                            )}
                            aria-label="Prepared"
                            title={sp.alwaysPrepared ? 'Always prepared' : 'Toggle prepared'}
                          />
                          <span className="font-display text-[0.95rem] text-ink leading-tight">{sp.name}</span>
                          {sp.concentration && <span className="rounded-sm border border-oxblood/50 px-1 text-[0.6rem] uppercase tracking-wider text-oxblood-deep">Conc.</span>}
                          {sp.ritual && <span className="rounded-sm border border-royal/50 px-1 text-[0.6rem] uppercase tracking-wider text-royal">Ritual</span>}
                          {sp.source && <SourceTag source={sp.source} label={sp.sourceLabel} />}
                        </div>
                        <div className="mt-1 text-[0.72rem] text-ink-faded leading-snug">
                          <span className="text-ink">{sp.school}</span> · {sp.castingTime} · {sp.range} · {sp.duration}
                          <span className="block">{sp.components}{sp.alwaysPrepared && <span className="ml-1 text-forest uppercase tracking-wider">· Always Prepared</span>}</span>
                        </div>
                      </div>
                      <button
                        aria-label="Remove"
                        className="rounded p-0.5 text-ink/50 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                        onClick={() => removeSpell(c.id, sp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
                ))}
              </div>
            </div>
          </section>
        ))
      )}
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
