import { useMemo } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm } from '@/lib/glossary';

/**
 * Renders text and converts known glossary terms (incl. user-added customs flagged
 * as glossary) into clickable popovers with their full description.
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
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button type="button" className="keyword">{tok}</button>
              </PopoverTrigger>
              <PopoverContent className="parchment-card max-w-sm">
                <div className="font-display text-base text-oxblood-deep">{entry.name}</div>
                <div className="ink-divider my-2" />
                <p className="text-sm text-ink-faded whitespace-pre-wrap">{entry.description}</p>
              </PopoverContent>
            </Popover>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
};
