import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Search, BookMarked, Sparkles, Sword, Backpack, Wand2, ScrollText, Swords, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { SmartInput, SmartTextarea } from '@/components/SmartText';
import { KeywordText } from '@/components/KeywordText';
import { cn } from '@/lib/utils';
import type {
  GlossaryTerm, CustomEntry, SpellEntry, CharacterFeature, Weapon, InventoryItem,
  AbilityKey, SourceType, ResetType, LibraryCategory, LibraryAction, ActionTime,
  ClassEntry, CasterType,
} from '@/lib/types';
import { ABILITY_KEYS } from '@/lib/types';
import { WEAPON_MASTERIES } from '@/lib/srd';
import { SKILLS } from '@/lib/rules';

type TabKey = LibraryCategory;

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'glossary', label: 'Glossary', icon: BookMarked },
  { key: 'classes', label: 'Classes', icon: Shield },
  { key: 'spells', label: 'Spells', icon: Wand2 },
  { key: 'features', label: 'Features', icon: Sparkles },
  { key: 'weapons', label: 'Weapons', icon: Sword },
  { key: 'items', label: 'Items', icon: Backpack },
  { key: 'actions', label: 'Actions', icon: Swords },
  { key: 'custom', label: 'Custom', icon: ScrollText },
];

const LibraryPage = () => {
  const [tab, setTab] = useState<TabKey>('glossary');

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-ink/20 bg-gradient-aged">
        <div className="container py-6 space-y-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-faded hover:text-oxblood-deep">
            <ArrowLeft className="h-4 w-4" /> Library home
          </Link>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-4xl text-ink tracking-wide">The Codex Library</h1>
              <p className="font-script italic text-ink-faded">
                Reusable templates, glossary terms, and homebrew. Available across all characters.
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-t-md px-4 py-1.5 font-display text-sm transition-colors flex items-center gap-1.5',
                    tab === t.key
                      ? 'bg-oxblood text-primary-foreground'
                      : 'bg-parchment-dark/40 text-ink-faded hover:bg-secondary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container py-6 animate-fade-in">
        {tab === 'glossary' && <GlossaryTab />}
        {tab === 'classes' && <ClassesTab />}
        {tab === 'spells' && <SpellsTab />}
        {tab === 'features' && <FeaturesTab />}
        {tab === 'weapons' && <WeaponsTab />}
        {tab === 'items' && <ItemsTab />}
        {tab === 'actions' && <ActionsTab />}
        {tab === 'custom' && <CustomTab />}
      </main>
    </div>
  );
};

export default LibraryPage;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative max-w-sm flex-1">
    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faded" />
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="parchment-panel rounded-md p-8 text-center text-ink-faded italic">{message}</div>
);

// ---------------------------------------------------------------------------
// Glossary tab
// ---------------------------------------------------------------------------

const GlossaryTab = () => {
  const list = useAppStore((s) => s.library.glossary);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const reset = useAppStore((s) => s.resetGlossary);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((g) => !q || g.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search glossary..." />
        <Button
          onClick={() => add('glossary', { name: 'New Term', description: '' } as Omit<GlossaryTerm, 'id'>)}
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Term
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm('Re-seed SRD conditions into the glossary? Existing entries are kept.')) reset();
          }}
          className="border-ink/40 bg-parchment-light hover:bg-secondary"
        >
          Re-seed SRD Conditions
        </Button>
      </div>
      <p className="text-xs italic text-ink-faded">
        Glossary names are auto-underlined with hover descriptions wherever they appear in any text. Type
        <span className="font-mono px-1">\</span> in any description to autocomplete a term.
      </p>
      {filtered.length === 0 ? (
        <EmptyState message="No glossary terms match." />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((g) => (
            <div key={g.id} className="parchment-panel rounded-md p-3 space-y-2">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <SmartInput
                    value={g.name}
                    onValueChange={(v) => update('glossary', g.id, { name: v })}
                    className="font-display"
                  />
                  <button
                    onClick={() => remove('glossary', g.id)}
                    className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <SmartTextarea
                  value={g.description}
                  onValueChange={(v) => update('glossary', g.id, { description: v })}
                  placeholder="Description (use \ to reference other terms)"
                  rows={3}
                  className="bg-parchment-light border-ink/30"
                />
                <Input
                  value={(g.aliases ?? []).join(', ')}
                  onChange={(e) =>
                    update('glossary', g.id, {
                      aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Aliases (comma-separated)"
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Spells tab
// ---------------------------------------------------------------------------

const SpellsTab = () => {
  const list = useAppStore((s) => s.library.spells);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () => list.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search spell templates..." />
        <Button
          onClick={() =>
            add('spells', {
              name: 'New Spell', level: 0, school: 'Evocation',
              castingTime: 'Action', range: '60 ft', components: 'V, S',
              duration: 'Instantaneous', description: '',
            } as Omit<SpellEntry, 'id'>)
          }
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Spell
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No spell templates yet. Create one and quick-add it to any character's grimoire." />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const open = openId === s.id;
            return (
              <div key={s.id} className="parchment-panel rounded-md p-3">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOpenId(open ? null : s.id)}
                      className="font-display text-base text-ink hover:text-oxblood-deep flex-1 text-left"
                    >
                      {s.name} <span className="text-xs italic text-ink-faded">— {s.level === 0 ? 'Cantrip' : `L${s.level}`} · {s.school}</span>
                    </button>
                    <button
                      onClick={() => remove('spells', s.id)}
                      className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {!open && s.description && (
                    <p className="text-sm text-ink-faded line-clamp-2">{s.description}</p>
                  )}
                  {open && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <SmartInput value={s.name} onValueChange={(v) => update('spells', s.id, { name: v })} placeholder="Name" />
                        <Input
                          type="number" min={0} max={9} value={s.level}
                          onChange={(e) => update('spells', s.id, { level: parseInt(e.target.value || '0', 10) })}
                          placeholder="Level"
                        />
                        <SmartInput value={s.school} onValueChange={(v) => update('spells', s.id, { school: v })} placeholder="School" />
                        <SmartInput value={s.castingTime} onValueChange={(v) => update('spells', s.id, { castingTime: v })} placeholder="Casting Time" />
                        <SmartInput value={s.range} onValueChange={(v) => update('spells', s.id, { range: v })} placeholder="Range" />
                        <SmartInput value={s.components} onValueChange={(v) => update('spells', s.id, { components: v })} placeholder="Components" />
                        <SmartInput value={s.duration} onValueChange={(v) => update('spells', s.id, { duration: v })} placeholder="Duration" />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s.concentration ?? false}
                          onChange={(e) => update('spells', s.id, { concentration: e.target.checked })}
                          className="accent-oxblood"
                        />
                        Concentration
                      </label>
                      <SmartTextarea
                        value={s.description}
                        onValueChange={(v) => update('spells', s.id, { description: v })}
                        placeholder="Description"
                        rows={3}
                        className="bg-parchment-light border-ink/30"
                      />
                      <SmartTextarea
                        value={s.higherLevels ?? ''}
                        onValueChange={(v) => update('spells', s.id, { higherLevels: v || undefined })}
                        placeholder="At Higher Levels (scaling)"
                        rows={2}
                        className="bg-parchment-light border-ink/30"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Features tab
// ---------------------------------------------------------------------------

const SOURCES: SourceType[] = ['class', 'species', 'feat', 'background', 'item', 'custom'];
const RESETS: ResetType[] = ['none', 'short', 'long', 'dawn'];

const FeaturesTab = () => {
  const list = useAppStore((s) => s.library.features);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search features..." />
        <Button
          onClick={() =>
            add('features', { name: 'New Feature', source: 'class', description: '', reset: 'none' } as Omit<CharacterFeature, 'id'>)
          }
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Feature
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No feature templates yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div key={f.id} className="parchment-panel rounded-md p-3">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <SmartInput
                    value={f.name}
                    onValueChange={(v) => update('features', f.id, { name: v })}
                    className="font-display flex-1"
                  />
                  <select
                    value={f.source}
                    onChange={(e) => update('features', f.id, { source: e.target.value as SourceType })}
                    className="rounded-sm border border-ink/40 bg-parchment-light px-2 py-1.5 text-sm"
                  >
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => remove('features', f.id)}
                    className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    value={f.sourceLabel ?? ''}
                    onChange={(e) => update('features', f.id, { sourceLabel: e.target.value })}
                    placeholder="Source label (e.g. Fighter)"
                  />
                  <Input
                    value={f.usesFormula ?? ''}
                    onChange={(e) => update('features', f.id, { usesFormula: e.target.value })}
                    placeholder="Uses formula (PB, LEVEL, CHA…)"
                    className="font-mono text-sm"
                  />
                  <select
                    value={f.reset ?? 'none'}
                    onChange={(e) => update('features', f.id, { reset: e.target.value as ResetType })}
                    className="rounded-sm border border-ink/40 bg-parchment-light px-2 py-1.5 text-sm"
                  >
                    {RESETS.map((r) => <option key={r} value={r}>{r} rest</option>)}
                  </select>
                </div>
                <SmartTextarea
                  value={f.description}
                  onValueChange={(v) => update('features', f.id, { description: v })}
                  placeholder="Description"
                  rows={3}
                  className="bg-parchment-light border-ink/30"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Weapons tab
// ---------------------------------------------------------------------------

const ABIL: AbilityKey[] = ABILITY_KEYS;

const WeaponsTab = () => {
  const list = useAppStore((s) => s.library.weapons);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search weapons..." />
        <Button
          onClick={() =>
            add('weapons', { name: 'New Weapon', ability: 'str', damageDice: '1d6', damageType: 'slashing', proficient: true } as Omit<Weapon, 'id'>)
          }
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Weapon
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No weapon templates yet." />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((w) => (
            <div key={w.id} className="parchment-panel rounded-md p-3 space-y-2">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <SmartInput value={w.name} onValueChange={(v) => update('weapons', w.id, { name: v })} className="font-display" />
                  <button onClick={() => remove('weapons', w.id)} className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  <label className="flex flex-col text-ink-faded">
                    Ability
                    <select
                      value={w.ability}
                      onChange={(e) => update('weapons', w.id, { ability: e.target.value as AbilityKey })}
                      className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 uppercase"
                    >
                      {ABIL.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col text-ink-faded">
                    Damage
                    <Input value={w.damageDice} onChange={(e) => update('weapons', w.id, { damageDice: e.target.value })} className="mt-0.5 h-8" />
                  </label>
                  <label className="flex flex-col text-ink-faded">
                    Type
                    <Input value={w.damageType} onChange={(e) => update('weapons', w.id, { damageType: e.target.value })} className="mt-0.5 h-8" />
                  </label>
                  <label className="flex flex-col text-ink-faded">
                    Bonus
                    <Input type="number" value={w.bonus ?? 0} onChange={(e) => update('weapons', w.id, { bonus: parseInt(e.target.value || '0', 10) })} className="mt-0.5 h-8" />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={w.proficient ?? false} onChange={(e) => update('weapons', w.id, { proficient: e.target.checked })} className="accent-oxblood" />
                    Proficient
                  </label>
                  <label className="flex items-center gap-1.5 flex-1">
                    Mastery:
                    <select
                      value={w.masteryId ?? ''}
                      onChange={(e) => update('weapons', w.id, { masteryId: e.target.value || undefined })}
                      className="flex-1 rounded-sm border border-ink/40 bg-parchment-light px-1.5 py-0.5"
                    >
                      <option value="">— none —</option>
                      {WEAPON_MASTERIES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Items tab
// ---------------------------------------------------------------------------

const ItemsTab = () => {
  const list = useAppStore((s) => s.library.items);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search items..." />
        <Button
          onClick={() => add('items', { name: 'New Item', qty: 1 } as Omit<InventoryItem, 'id'>)}
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Item
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No item templates yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <div key={i.id} className="parchment-panel rounded-md p-3">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <SmartInput value={i.name} onValueChange={(v) => update('items', i.id, { name: v })} className="font-display flex-1" />
                  <Input type="number" min={1} value={i.qty} onChange={(e) => update('items', i.id, { qty: Math.max(1, parseInt(e.target.value || '1', 10)) })} className="w-16 text-center" />
                  <Input type="number" step="0.1" placeholder="lb" value={i.weight ?? ''} onChange={(e) => update('items', i.id, { weight: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-16 text-center" />
                  <button onClick={() => remove('items', i.id)} className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={i.attunable ?? false} onChange={(e) => update('items', i.id, { attunable: e.target.checked })} className="accent-oxblood" />
                    Attunable
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={i.equipped ?? false} onChange={(e) => update('items', i.id, { equipped: e.target.checked })} className="accent-oxblood" />
                    Equipped by default
                  </label>
                </div>
                <SmartTextarea
                  value={i.description ?? ''}
                  onValueChange={(v) => update('items', i.id, { description: v })}
                  placeholder="Description (use \ to reference glossary)"
                  rows={3}
                  className="bg-parchment-light border-ink/30"
                />
                <SmartTextarea
                  value={i.notes ?? ''}
                  onValueChange={(v) => update('items', i.id, { notes: v })}
                  placeholder="Quick notes / properties"
                  rows={1}
                  className="bg-parchment-light border-ink/30 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Custom tab
// ---------------------------------------------------------------------------

const CustomTab = () => {
  const list = useAppStore((s) => s.library.custom);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search custom (race, faction, lore…)" />
        <Button
          onClick={() => add('custom', { name: 'New Entry', category: 'Race', description: '' } as Omit<CustomEntry, 'id'>)}
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Entry
        </Button>
      </div>
      <p className="text-xs italic text-ink-faded">
        For things outside the standard categories — races, factions, world lore, homebrew rules. Tick
        <span className="font-semibold"> "Treat as glossary term"</span> to make the entry's name auto-underline and
        appear in <span className="font-mono">\</span> autocomplete like a glossary entry.
      </p>
      {filtered.length === 0 ? (
        <EmptyState message="No custom entries yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="parchment-panel rounded-md p-3">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <SmartInput value={c.name} onValueChange={(v) => update('custom', c.id, { name: v })} className="font-display flex-1" />
                  <Input
                    value={c.category}
                    onChange={(e) => update('custom', c.id, { category: e.target.value })}
                    placeholder="Category"
                    className="w-40"
                  />
                  <button onClick={() => remove('custom', c.id)} className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <SmartTextarea
                  value={c.description}
                  onValueChange={(v) => update('custom', c.id, { description: v })}
                  placeholder="Description"
                  rows={3}
                  className="bg-parchment-light border-ink/30"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={c.treatAsGlossary ?? false}
                      onChange={(e) => update('custom', c.id, { treatAsGlossary: e.target.checked })}
                      className="accent-oxblood"
                    />
                    Treat as glossary term
                  </label>
                  {c.treatAsGlossary && (
                    <Input
                      value={(c.aliases ?? []).join(', ')}
                      onChange={(e) => update('custom', c.id, { aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="Aliases (comma-separated)"
                      className="text-xs flex-1 min-w-40"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Actions tab
// ---------------------------------------------------------------------------

const ACTION_TIMES: ActionTime[] = ['action', 'bonus', 'reaction', 'free', 'special'];

const ActionsTab = () => {
  const list = useAppStore((s) => s.library.actions);
  const add = useAppStore((s) => s.addLibraryEntry);
  const update = useAppStore((s) => s.updateLibraryEntry);
  const remove = useAppStore((s) => s.removeLibraryEntry);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => list.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase())),
    [list, q],
  );

  // Toggle between rolling with a flat ability or a skill
  const setRoll = (id: string, kind: 'ability' | 'skill', value: string) => {
    if (kind === 'ability') {
      update('actions', id, { ability: value as AbilityKey, skill: undefined });
    } else {
      update('actions', id, { skill: value, ability: undefined });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={q} onChange={setQ} placeholder="Search actions..." />
        <Button
          onClick={() =>
            add('actions', {
              name: 'New Action',
              actionTime: 'action',
              ability: 'str',
              proficient: true,
              description: '',
            } as Omit<LibraryAction, 'id'>)
          }
          className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Action
        </Button>
      </div>
      <p className="text-xs italic text-ink-faded">
        Combat actions like Shove, Grapple, or homebrew. Each one defaults to a specific ability score
        or skill — when added to a character you can override which one to roll with.
      </p>
      {filtered.length === 0 ? (
        <EmptyState message="No actions yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const useSkill = !!a.skill;
            return (
              <div key={a.id} className="parchment-panel rounded-md p-3">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <SmartInput
                      value={a.name}
                      onValueChange={(v) => update('actions', a.id, { name: v })}
                      className="font-display flex-1"
                    />
                    <select
                      value={a.actionTime ?? 'action'}
                      onChange={(e) => update('actions', a.id, { actionTime: e.target.value as ActionTime })}
                      className="rounded-sm border border-ink/40 bg-parchment-light px-2 py-1.5 text-sm capitalize"
                    >
                      {ACTION_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => remove('actions', a.id)}
                      className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <label className="flex flex-col text-ink-faded">
                      Roll type
                      <select
                        value={useSkill ? 'skill' : 'ability'}
                        onChange={(e) => {
                          if (e.target.value === 'skill') {
                            setRoll(a.id, 'skill', a.skill ?? 'athletics');
                          } else {
                            setRoll(a.id, 'ability', a.ability ?? 'str');
                          }
                        }}
                        className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1"
                      >
                        <option value="ability">Ability check</option>
                        <option value="skill">Skill check</option>
                      </select>
                    </label>
                    {useSkill ? (
                      <label className="flex flex-col text-ink-faded">
                        Skill
                        <select
                          value={a.skill ?? 'athletics'}
                          onChange={(e) => setRoll(a.id, 'skill', e.target.value)}
                          className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1"
                        >
                          {SKILLS.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.ability.toUpperCase()})</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="flex flex-col text-ink-faded">
                        Ability
                        <select
                          value={a.ability ?? 'str'}
                          onChange={(e) => setRoll(a.id, 'ability', e.target.value)}
                          className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 uppercase"
                        >
                          {ABILITY_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="flex flex-col text-ink-faded">
                      Range
                      <Input
                        value={a.range ?? ''}
                        onChange={(e) => update('actions', a.id, { range: e.target.value })}
                        placeholder="5 ft"
                        className="mt-0.5 h-8"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <label className="flex flex-col text-ink-faded">
                      Damage dice (optional)
                      <Input
                        value={a.damageDice ?? ''}
                        onChange={(e) => update('actions', a.id, { damageDice: e.target.value })}
                        placeholder="1d6"
                        className="mt-0.5 h-8"
                      />
                    </label>
                    <label className="flex flex-col text-ink-faded">
                      Damage type
                      <Input
                        value={a.damageType ?? ''}
                        onChange={(e) => update('actions', a.id, { damageType: e.target.value })}
                        placeholder="bludgeoning"
                        className="mt-0.5 h-8"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <label className="flex flex-col text-ink-faded">
                      Save ability (optional)
                      <select
                        value={a.saveAbility ?? ''}
                        onChange={(e) => update('actions', a.id, { saveAbility: (e.target.value || undefined) as AbilityKey | undefined })}
                        className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 uppercase"
                      >
                        <option value="">— none —</option>
                        {ABILITY_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col text-ink-faded">
                      Or alternate ability (target's choice)
                      <select
                        value={a.saveAbility2 ?? ''}
                        onChange={(e) => update('actions', a.id, { saveAbility2: (e.target.value || undefined) as AbilityKey | undefined })}
                        disabled={!a.saveAbility}
                        className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 uppercase disabled:opacity-50"
                      >
                        <option value="">— none —</option>
                        {ABILITY_KEYS.filter((k) => k !== a.saveAbility).map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={a.proficient ?? false}
                      onChange={(e) => update('actions', a.id, { proficient: e.target.checked })}
                      className="accent-oxblood"
                    />
                    Add proficiency bonus
                  </label>
                  <SmartTextarea
                    value={a.description ?? ''}
                    onValueChange={(v) => update('actions', a.id, { description: v })}
                    placeholder="Description (use \ to reference glossary)"
                    rows={3}
                    className="bg-parchment-light border-ink/30"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
