import { useMemo } from 'react';
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm } from '@/lib/glossary';

/**
 * Renders text and converts known glossary terms (incl. user-added customs flagged
 * as glossary) into hover-triggered popovers with their full description. Click
 * also opens (via focus) so the original behavior still works.
 *
 * Matches whole-word, case-insensitive, single trailing 's' stripped, and aliases.
 */
export const KeywordText = ({ text }: { text: string }) => {
  const glossary = useAppStore((s) => s.library.glossary);
  const customs = useAppStore((s) => s.library.custom);
  const map = useMemo(() => buildGlossaryMap(glossary, customs), [glossary, customs]);

  if (!text) return null;
  const tokens = text.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);

  return (
    <span className="leading-relaxed whitespace-pre-wrap">
      {tokens.map((tok, i) => {
        if (!tok) return null;
        const entry = lookupTerm(map, tok);
        if (entry) {
          return (
            <HoverCard key={i} openDelay={120} closeDelay={80}>
              <HoverCardTrigger asChild>
                <button type="button" className="keyword">{tok}</button>
              </HoverCardTrigger>
              <HoverCardContent className="parchment-card max-w-sm w-auto">
                <div className="font-display text-base text-oxblood-deep">{entry.name}</div>
                <div className="ink-divider my-2" />
                <p className="text-sm text-ink-faded whitespace-pre-wrap">{entry.description}</p>
              </HoverCardContent>
            </HoverCard>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
};
