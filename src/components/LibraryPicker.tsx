import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookMarked, Search } from 'lucide-react';
import type { ReactNode } from 'react';

type Category = 'spells' | 'features' | 'weapons' | 'items' | 'actions';

interface Props {
  characterId: string;
  category: Category;
  trigger?: ReactNode;
  label?: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  spells: 'Spell',
  features: 'Feature',
  weapons: 'Weapon',
  items: 'Item',
  actions: 'Action',
};

export const LibraryPicker = ({ characterId, category, trigger, label }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const entries = useAppStore((s) => s.library[category]) as Array<any>;
  const copyFromLibrary = useAppStore((s) => s.copyFromLibrary);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => (e.name ?? '').toLowerCase().includes(q));
  }, [entries, search]);

  const meta = (e: any): string => {
    if (category === 'spells') return e.level === 0 ? `Cantrip · ${e.school ?? ''}` : `L${e.level} · ${e.school ?? ''}`;
    if (category === 'features') return [e.sourceLabel, e.reset && e.reset !== 'none' ? `${e.reset} rest` : null].filter(Boolean).join(' · ');
    if (category === 'weapons') return [e.damageDice, e.damageType].filter(Boolean).join(' ');
    if (category === 'items') return e.qty ? `qty ${e.qty}` : '';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="border-royal/60 text-royal hover:bg-royal/10">
            <BookMarked className="h-3.5 w-3.5 mr-1" /> {label ?? 'From Library'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="parchment-card max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-oxblood-deep">
            Add {CATEGORY_LABELS[category]} from Library
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faded" />
          <Input
            placeholder={`Search your ${category}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>
        {entries.length === 0 ? (
          <p className="text-sm italic text-ink-faded text-center py-8">
            Your library has no {category} yet. Add some from the Library page.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm italic text-ink-faded text-center py-8">No matches.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.map((e) => (
              <button
                key={e.id}
                className="w-full rounded-sm border border-ink/20 bg-parchment-light p-2 text-left hover:bg-secondary"
                onClick={() => {
                  copyFromLibrary(characterId, category, e.id);
                  setOpen(false);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-ink">{e.name}</span>
                  <span className="text-xs text-ink-faded">{meta(e)}</span>
                </div>
                {e.description && (
                  <p className="mt-0.5 text-xs text-ink-faded line-clamp-2">{e.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
