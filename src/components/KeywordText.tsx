import { useMemo, useState } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm, type GlossaryEntry } from '@/lib/glossary';

/**
 * Tokenize text into plain spans, highlighting glossary terms with a styled
 * span (non-interactive). Returns both the rendered nodes and the unique set
 * of nested entries discovered (excluding `excludeId`).
 */
const tokenizeWithNested = (
  text: string,
  map: Map<string, GlossaryEntry>,
  excludeId: string | undefined,
) => {
  const tokens = text.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
  const nested = new Map<string, GlossaryEntry>();
  const nodes = tokens.map((tok, i) => {
    if (!tok) return null;
    const entry = lookupTerm(map, tok);
    if (entry && entry.id !== excludeId) {
      if (!nested.has(entry.id)) nested.set(entry.id, entry);
      return <span key={i} className="keyword-inline">{tok}</span>;
    }
    return <span key={i}>{tok}</span>;
  });
  return { nodes, nested: Array.from(nested.values()) };
};

/**
 * Top-level keyword: click/hover to open. Nested keywords inside the
 * description are NOT interactive — instead, their descriptions are rendered
 * automatically as side cards next to the main popover.
 */
const Keyword = ({
  token,
  entry,
  map,
}: {
  token: string;
  entry: GlossaryEntry;
  map: Map<string, GlossaryEntry>;
}) => {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const visible = open || hovering;

  const { nodes, nested } = useMemo(
    () => tokenizeWithNested(entry.description, map, entry.id),
    [entry, map],
  );

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
        side="bottom"
        align="start"
        className="parchment-card max-w-sm w-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="font-display text-base text-oxblood-deep">{entry.name}</div>
        <div className="ink-divider my-2" />
        <p className="text-sm text-ink-faded whitespace-pre-wrap leading-relaxed">
          {nodes}
        </p>

        {nested.length > 0 && (
          <div
            className="absolute top-0 left-full ml-2 flex flex-col gap-2 w-72"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {nested.map((sub) => (
              <div key={sub.id} className="parchment-card rounded-md border bg-popover p-4 shadow-md">
                <div className="font-display text-base text-oxblood-deep">{sub.name}</div>
                <div className="ink-divider my-2" />
                <p className="text-sm text-ink-faded whitespace-pre-wrap leading-relaxed">
                  {sub.description}
                </p>
              </div>
            ))}
          </div>
        )}
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
          return <Keyword key={i} token={tok} entry={entry} map={map} />;
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
};
