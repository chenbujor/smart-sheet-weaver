import { useMemo, useState } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm, type GlossaryEntry } from '@/lib/glossary';

/**
 * Click a keyword to open its glossary description. The popover stays open
 * until the user clicks the keyword again or clicks outside (anywhere else).
 * Hovering also previews the term, but the click-pin takes precedence.
 */
const Keyword = ({ token, entry }: { token: string; entry: GlossaryEntry }) => {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const visible = open || hovering;

  return (
    <Popover open={visible} onOpenChange={(o) => { if (!o) { setOpen(false); setHovering(false); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="keyword"
          onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {token}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="parchment-card max-w-sm w-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="font-display text-base text-oxblood-deep">{entry.name}</div>
        <div className="ink-divider my-2" />
        <p className="text-sm text-ink-faded whitespace-pre-wrap">{entry.description}</p>
      </PopoverContent>
    </Popover>
  );
};

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
          return <Keyword key={i} token={tok} entry={entry} />;
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
};
