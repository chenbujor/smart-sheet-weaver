import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore, exportAllJson, exportCharacterJson, downloadJson, parseImport, newCharacter } from '@/lib/store';
import { CLASSES } from '@/lib/srd';
import { proficiencyBonus } from '@/lib/rules';
import { useRef } from 'react';
import { Plus, Download, Upload, Trash2, ScrollText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const Library = () => {
  const navigate = useNavigate();
  const characters = useAppStore((s) => s.characters);
  const addCharacter = useAppStore((s) => s.addCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const importCharacters = useAppStore((s) => s.importCharacters);
  const fileInput = useRef<HTMLInputElement>(null);

  const list = Object.values(characters).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreate = () => {
    const id = addCharacter(newCharacter('New Adventurer'));
    navigate(`/character/${id}`);
  };

  const handleExportAll = () => {
    if (!list.length) return toast.error('No characters to export');
    downloadJson(`dnd2024-vault-${Date.now()}.json`, exportAllJson());
    toast.success('Exported vault');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const chars = parseImport(text);
      importCharacters(chars);
      toast.success(`Imported ${chars.length} character${chars.length === 1 ? '' : 's'}`);
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/20 bg-gradient-aged">
        <div className="container py-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <Sparkles className="h-7 w-7 text-oxblood-deep" />
            <h1 className="font-display text-5xl font-bold text-ink tracking-wide">
              The Adventurer's Codex
            </h1>
            <p className="font-script text-lg italic text-ink-faded">
              A vault of heroes — D&amp;D 2024 character manager
            </p>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Your Characters</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreate} className="bg-oxblood text-primary-foreground hover:bg-oxblood-deep">
              <Plus className="mr-1.5 h-4 w-4" /> New Character
            </Button>
            <Button variant="outline" onClick={handleExportAll} className="border-ink/40 bg-parchment-light hover:bg-secondary">
              <Download className="mr-1.5 h-4 w-4" /> Export All
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInput.current?.click()}
              className="border-ink/40 bg-parchment-light hover:bg-secondary"
            >
              <Upload className="mr-1.5 h-4 w-4" /> Import JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="parchment-panel rounded-md p-12 text-center">
            <ScrollText className="mx-auto mb-3 h-12 w-12 text-ink/40" />
            <p className="font-display text-xl text-ink">An empty codex awaits.</p>
            <p className="mt-2 text-ink-faded">Create your first character or import an existing vault.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => {
              const cls = CLASSES.find((x) => x.id === c.classId);
              const pb = proficiencyBonus(c.level);
              return (
                <div key={c.id} className="parchment-panel rounded-md p-5 animate-fade-in">
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/character/${c.id}`} className="block flex-1 group">
                        <h3 className="font-display text-2xl text-ink group-hover:text-oxblood-deep transition-colors">
                          {c.name}
                        </h3>
                        <p className="text-sm text-ink-faded italic">
                          Level {c.level} {c.species} {cls?.name ?? 'Adventurer'}
                        </p>
                      </Link>
                      <div className="flex gap-1">
                        <button
                          aria-label="Export"
                          className="rounded p-1.5 text-ink/60 hover:bg-secondary hover:text-ink"
                          onClick={() => {
                            const json = exportCharacterJson(c.id);
                            if (json) downloadJson(`${c.name.replace(/\s+/g, '_')}.json`, json);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Delete"
                          className="rounded p-1.5 text-ink/60 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
                              deleteCharacter(c.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="ink-divider my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="stat-block rounded-sm p-2">
                        <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">PB</div>
                        <div className="font-display text-lg text-ink">+{pb}</div>
                      </div>
                      <div className="stat-block rounded-sm p-2">
                        <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">HP</div>
                        <div className="font-display text-lg text-ink">{c.hpCurrent}</div>
                      </div>
                      <div className="stat-block rounded-sm p-2">
                        <div className="text-[0.65rem] uppercase tracking-wider text-ink-faded">AC</div>
                        <div className="font-display text-lg text-ink">{c.ac ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="pt-8 text-center text-xs text-ink-faded">
          All data is stored locally in your browser · Export regularly to back up your vault
        </p>
      </main>
    </div>
  );
};

export default Library;
