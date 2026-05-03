import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { CLASSES } from '@/lib/srd';
import { deriveCharacter } from '@/lib/rules';
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { DashboardView } from '@/components/views/DashboardView';
import { GrimoireView } from '@/components/views/GrimoireView';
import { ClassicView } from '@/components/views/ClassicView';
import { EquipmentView } from '@/components/views/EquipmentView';
import { FeaturesView } from '@/components/views/FeaturesView';
import { Button } from '@/components/ui/button';
import { RestControls } from '@/components/RestControls';
import { cn } from '@/lib/utils';

type ViewKey = 'dashboard' | 'features' | 'equipment' | 'grimoire' | 'classic';

const CharacterPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const character = useAppStore((s) => (id ? s.characters[id] : undefined));
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const [view, setView] = useState<ViewKey>('dashboard');

  if (!character) {
    return (
      <div className="container py-20 text-center">
        <p className="font-display text-2xl text-ink">Character not found</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back to Library</Button>
      </div>
    );
  }

  const cls = CLASSES.find((c) => c.id === character.classId);
  const library = useAppStore((s) => s.library);
  const derived = deriveCharacter(character, cls, library);

  const tabs: { key: ViewKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'features', label: 'Features' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'grimoire', label: 'Grimoire' },
    { key: 'classic', label: 'Classic Sheet' },
  ];

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 border-b border-ink/20 bg-parchment/95 backdrop-blur">
        <div className="container py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-sm text-ink-faded hover:text-oxblood-deep">
              <ArrowLeft className="h-4 w-4" /> Library
            </Link>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="font-display text-2xl text-ink">{character.name}</h1>
                <span className="text-sm italic text-ink-faded">
                  Lv {character.level} {character.species} {cls?.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Level up"
                onClick={() => updateCharacter(character.id, { level: Math.min(20, character.level + 1) })}
                className="rounded p-1.5 text-ink/60 hover:bg-secondary hover:text-ink"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="font-display text-sm w-6 text-center">{character.level}</span>
              <button
                aria-label="Level down"
                onClick={() => updateCharacter(character.id, { level: Math.max(1, character.level - 1) })}
                className="rounded p-1.5 text-ink/60 hover:bg-secondary hover:text-ink"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <RestControls character={character} derived={derived} />
          </div>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={cn(
                  'rounded-t-md px-4 py-1.5 font-display text-sm transition-colors',
                  view === t.key
                    ? 'bg-oxblood text-primary-foreground'
                    : 'bg-parchment-dark/40 text-ink-faded hover:bg-secondary'
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container py-5 animate-fade-in">
        {view === 'dashboard' && <DashboardView character={character} derived={derived} />}
        {view === 'features' && <FeaturesView character={character} derived={derived} />}
        {view === 'equipment' && <EquipmentView character={character} derived={derived} />}
        {view === 'grimoire' && <GrimoireView character={character} derived={derived} />}
        {view === 'classic' && <ClassicView character={character} derived={derived} />}
      </main>
    </div>
  );
};

export default CharacterPage;
