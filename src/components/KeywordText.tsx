import { useMemo, useState } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm, type GlossaryEntry } from '@/lib/glossary';

/**
 * Tokenize text into keyword/non-keyword parts. Optionally exclude one entry
 * (used to prevent a term linking to itself inside its own description).
 */
const renderTokens = (
  text: string,
  map: Map<string, GlossaryEntry>,
  excludeId: string | undefined,
  depth: number,
) => {
  const tokens = text.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    const entry = lookupTerm(map, tok);
    if (entry && entry.id !== excludeId) {
      return <Keyword key={i} token={tok} entry={entry} map={map} depth={depth + 1} />;
    }
    return <span key={i}>{tok}</span>;
  });
};

/**
 * Click a keyword to open its glossary description. The popover stays open
 * until the user clicks the keyword again or clicks outside.
 *
 * Nested keywords inside the description render as side-attached popovers so
 * the user sees both the parent term and any referenced sub-terms at once.
 */
const Keyword = ({
  token,
  entry,
  map,
  depth = 0,
}: {
  token: string;
  entry: GlossaryEntry;
  map?: Map<string, GlossaryEntry>;
  depth?: number;
}) => {
  const storeGlossary = useAppStore((s) => s.library.glossary);
  const storeCustoms = useAppStore((s) => s.library.custom);
  const localMap = useMemo(
    () => map ?? buildGlossaryMap(storeGlossary, storeCustoms),
    [map, storeGlossary, storeCustoms],
  );

  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const visible = open || hovering;

  // Cap nesting so a chain of references can't recurse indefinitely.
  const allowNesting = depth < 3;

  return (
    <Popover open={visible} onOpenChange={(o) => { if (!o) { setOpen(false); setHovering(false); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="keyword"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {token}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={depth === 0 ? 'bottom' : 'right'}
        align="start"
        className="parchment-card max-w-sm w-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="font-display text-base text-oxblood-deep">{entry.name}</div>
        <div className="ink-divider my-2" />
        <p className="text-sm text-ink-faded whitespace-pre-wrap leading-relaxed">
          {allowNesting
            ? renderTokens(entry.description, localMap, entry.id, depth)
            : entry.description}
        </p>
      </PopoverContent>
    </Popover>
  );
};

export const KeywordText = ({ text }: { text: string }) => {
  const glossary = useAppStore((s) => s.library.glossary);
  const customs = useAppStore((s) => s.library.custom);
  const map = useMemo(() => buildGlossaryMap(glossary, customs), [glossary, customs]);

  if (!text) return null;

  return (
    <span className="leading-relaxed whitespace-pre-wrap">
      {renderTokens(text, map, undefined, 0)}
    </span>
  );
};
