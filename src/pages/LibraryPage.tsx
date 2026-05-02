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

type TabKeyExt = Exclude<TabKey, 'weapons'>;

const TABS: { key: TabKeyExt; label: string; icon: any }[] = [
  { key: 'glossary', label: 'Glossary', icon: BookMarked },
  { key: 'classes', label: 'Classes', icon: Shield },
  { key: 'spells', label: 'Spells', icon: Wand2 },
  { key: 'features', label: 'Features', icon: Sparkles },
  { key: 'items', label: 'Items', icon: Backpack },
  { key: 'actions', label: 'Actions', icon: Swords },
  { key: 'custom', label: 'Custom', icon: ScrollText },
];

const LibraryPage = () => {
  const [tab, setTab] = useState<TabKeyExt>('glossary');

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
                      <SpellListsField
                        value={s.spellLists ?? []}
                        onChange={(v) => update('spells', s.id, { spellLists: v.length ? v : undefined })}
                      />
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

// (Weapons tab removed — weapon stats live inside Items now.)


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

// ---------------------------------------------------------------------------
// SpellListsField — multi-select chips of class names
// ---------------------------------------------------------------------------

const SpellListsField = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const classes = useAppStore((s) => s.library.classes);
  const allNames = useMemo(() => classes.map((c) => c.name), [classes]);
  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((n) => n !== name));
    else onChange([...value, name]);
  };
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded mb-1">Spell Lists</div>
      <div className="flex flex-wrap gap-1">
        {allNames.length === 0 && (
          <span className="text-xs italic text-ink-faded">No classes in library — add some in the Classes tab.</span>
        )}
        {allNames.map((name) => {
          const on = value.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs transition-colors',
                on
                  ? 'bg-oxblood text-primary-foreground border-oxblood'
                  : 'border-ink/40 bg-parchment-light text-ink-faded hover:bg-secondary'
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Classes tab
// ---------------------------------------------------------------------------

const CASTERS: CasterType[] = ['none', 'full', 'half', 'third', 'pact'];
const HIT_DICE = [6, 8, 10, 12];

const ClassesTab = () => {
  const classes = useAppStore((s) => s.library.classes);
  const addClass = useAppStore((s) => s.addClass);
  const updateClass = useAppStore((s) => s.updateClass);
  const removeClass = useAppStore((s) => s.removeClass);
  const resetClasses = useAppStore((s) => s.resetClasses);
  const addSubclass = useAppStore((s) => s.addSubclass);
  const updateSubclass = useAppStore((s) => s.updateSubclass);
  const removeSubclass = useAppStore((s) => s.removeSubclass);
  const addClassFeature = useAppStore((s) => s.addClassFeature);
  const updateClassFeature = useAppStore((s) => s.updateClassFeature);
  const removeClassFeature = useAppStore((s) => s.removeClassFeature);

  const [selectedId, setSelectedId] = useState<string | null>(classes[0]?.id ?? null);
  const rawSelected = classes.find((c) => c.id === selectedId) ?? null;
  // Defensive: older persisted classes may be missing newer fields.
  const selected = rawSelected
    ? {
        ...rawSelected,
        primaryAbility: rawSelected.primaryAbility ?? [],
        saves: rawSelected.saves ?? [],
        features: rawSelected.features ?? [],
        subclasses: (rawSelected.subclasses ?? []).map((sb) => ({
          ...sb,
          features: sb.features ?? [],
        })),
        hitDie: rawSelected.hitDie ?? 8,
        caster: rawSelected.caster ?? 'none',
      }
    : null;

  return (
    <div className="grid gap-3 md:grid-cols-[260px,1fr]">
      <aside className="parchment-panel rounded-md p-2 space-y-1 h-fit">
        <div className="relative z-10 space-y-1">
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={() => {
                const id = addClass({ name: 'New Class' });
                setSelectedId(id);
              }}
              className="flex-1 bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Class
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetClasses()}
              className="border-ink/40 bg-parchment-light hover:bg-secondary"
              title="Re-seed missing SRD classes"
            >
              ↻
            </Button>
          </div>
          <div className="ink-divider my-1" />
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full rounded-sm px-2 py-1 text-left font-display text-sm transition-colors flex items-center justify-between',
                selectedId === c.id ? 'bg-oxblood text-primary-foreground' : 'hover:bg-secondary text-ink'
              )}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-[0.6rem] uppercase opacity-70">
                {c.builtin ? 'SRD' : 'Custom'}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {!selected ? (
        <EmptyState message="Select or create a class." />
      ) : (
        <div className="parchment-panel rounded-md p-3 space-y-3">
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SmartInput
                value={selected.name}
                onValueChange={(v) => updateClass(selected.id, { name: v })}
                disabled={selected.builtin}
                className="font-display text-lg flex-1 min-w-40"
              />
              {!selected.builtin && (
                <button
                  onClick={() => {
                    if (confirm(`Delete class "${selected.name}"?`)) {
                      removeClass(selected.id);
                      setSelectedId(classes.find((c) => c.id !== selected.id)?.id ?? null);
                    }
                  }}
                  className="rounded p-1.5 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                  aria-label="Delete class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-4 text-xs">
              <label className="flex flex-col text-ink-faded">
                Hit Die
                <select
                  value={selected.hitDie}
                  onChange={(e) => updateClass(selected.id, { hitDie: parseInt(e.target.value, 10) })}
                  disabled={selected.builtin}
                  className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 disabled:opacity-60"
                >
                  {HIT_DICE.map((d) => <option key={d} value={d}>d{d}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-ink-faded">
                Caster
                <select
                  value={selected.caster}
                  onChange={(e) => updateClass(selected.id, { caster: e.target.value as CasterType })}
                  disabled={selected.builtin}
                  className="mt-0.5 rounded-sm border border-ink/40 bg-parchment-light px-2 py-1 disabled:opacity-60"
                >
                  {CASTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-ink-faded">
                Primary Ability
                <Input
                  value={selected.primaryAbility.join(',')}
                  disabled={selected.builtin}
                  onChange={(e) => updateClass(selected.id, {
                    primaryAbility: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) as AbilityKey[],
                  })}
                  className="mt-0.5 h-8 disabled:opacity-60"
                />
              </label>
              <label className="flex flex-col text-ink-faded">
                Saves
                <Input
                  value={selected.saves.join(',')}
                  disabled={selected.builtin}
                  onChange={(e) => updateClass(selected.id, {
                    saves: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) as AbilityKey[],
                  })}
                  className="mt-0.5 h-8 disabled:opacity-60"
                />
              </label>
            </div>

            <ClassFeaturesSection
              title="Class Features"
              features={selected.features}
              onAdd={() => addClassFeature(selected.id, null)}
              onUpdate={(fid, patch) => updateClassFeature(selected.id, null, fid, patch)}
              onRemove={(fid) => removeClassFeature(selected.id, null, fid)}
            />

            <div className="ink-divider my-2" />
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base text-oxblood-deep">Subclasses</h4>
              <Button
                size="sm"
                onClick={() => addSubclass(selected.id, 'New Subclass')}
                className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Subclass
              </Button>
            </div>
            {selected.subclasses.length === 0 ? (
              <p className="text-sm italic text-ink-faded">No subclasses yet.</p>
            ) : (
              <div className="space-y-2">
                {selected.subclasses.map((sb) => (
                  <div key={sb.id} className="stat-block rounded-sm p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <SmartInput
                        value={sb.name}
                        onValueChange={(v) => updateSubclass(selected.id, sb.id, { name: v })}
                        className="font-display flex-1"
                      />
                      <button
                        onClick={() => {
                          if (confirm(`Delete subclass "${sb.name}"?`)) removeSubclass(selected.id, sb.id);
                        }}
                        className="rounded p-1 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ClassFeaturesSection
                      title="Subclass Features"
                      compact
                      features={sb.features}
                      onAdd={() => addClassFeature(selected.id, sb.id)}
                      onUpdate={(fid, patch) => updateClassFeature(selected.id, sb.id, fid, patch)}
                      onRemove={(fid) => removeClassFeature(selected.id, sb.id, fid)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ClassFeaturesSection = ({
  title, features, onAdd, onUpdate, onRemove, compact,
}: {
  title: string;
  features: CharacterFeature[];
  onAdd: () => void;
  onUpdate: (fid: string, patch: Partial<CharacterFeature>) => void;
  onRemove: (fid: string) => void;
  compact?: boolean;
}) => {
  const sorted = useMemo(
    () => [...features].sort((a, b) => (a.level ?? 1) - (b.level ?? 1) || a.name.localeCompare(b.name)),
    [features]
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={cn('font-display text-oxblood-deep', compact ? 'text-sm' : 'text-base')}>{title}</h4>
        <Button size="sm" onClick={onAdd} variant="outline" className="border-ink/40 bg-parchment-light hover:bg-secondary">
          <Plus className="mr-1 h-3.5 w-3.5" /> Feature
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs italic text-ink-faded">No features yet.</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((f) => (
            <div key={f.id} className="rounded-sm border border-ink/20 bg-parchment-light p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={f.level ?? 1}
                  onChange={(e) => onUpdate(f.id, { level: Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))) })}
                  className="w-14 h-8 text-center"
                  title="Level gained"
                />
                <SmartInput
                  value={f.name}
                  onValueChange={(v) => onUpdate(f.id, { name: v })}
                  className="font-display flex-1"
                />
                <button
                  onClick={() => onRemove(f.id)}
                  className="rounded p-1 text-ink-faded hover:text-oxblood-deep hover:bg-oxblood/10"
                  aria-label="Delete feature"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <SmartTextarea
                value={f.description}
                onValueChange={(v) => onUpdate(f.id, { description: v })}
                placeholder="Description"
                rows={2}
                className="bg-parchment text-sm border-ink/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
