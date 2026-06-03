import { useMemo, useState, Fragment, type ReactNode } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { buildGlossaryMap, lookupTerm, type GlossaryEntry } from '@/lib/glossary';

/**
 * Split text into segments separated by *...* bold markers.
 * Single asterisks with no closing pair are treated as literal text.
 */
const splitBoldSegments = (text: string): { bold: boolean; text: string }[] => {
  const out: { bold: boolean; text: string }[] = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ bold: false, text: text.slice(last, m.index) });
    out.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ bold: false, text: text.slice(last) });
  return out;
};

/**
 * Render text into nodes: tokenize words for glossary highlighting, while
 * honoring *bold* segments. When `interactive` is true, glossary terms become
 * interactive Keyword buttons; otherwise they're styled inline spans and
 * collected into `nested` for side-card rendering.
 */
const renderText = (
  text: string,
  map: Map<string, GlossaryEntry>,
  opts: {
    excludeId?: string;
    interactive: boolean;
    nested?: Map<string, GlossaryEntry>;
    keyPrefix?: string;
  },
): ReactNode[] => {
  const segments = splitBoldSegments(text);
  const nodes: ReactNode[] = [];
  segments.forEach((seg, si) => {
    const tokens = seg.text.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
    const inner: ReactNode[] = tokens.map((tok, i) => {
      if (!tok) return null;
      const entry = lookupTerm(map, tok);
      const key = `${opts.keyPrefix ?? ''}${si}-${i}`;
      if (entry && entry.id !== opts.excludeId) {
        if (opts.interactive) {
          return <Keyword key={key} token={tok} entry={entry} map={map} />;
        }
        if (opts.nested && !opts.nested.has(entry.id)) opts.nested.set(entry.id, entry);
        return <span key={key} className="keyword-inline">{tok}</span>;
      }
      return <span key={key}>{tok}</span>;
    });
    if (seg.bold) {
      nodes.push(<strong key={`b-${si}`} className="font-semibold text-ink">{inner}</strong>);
    } else {
      nodes.push(<Fragment key={`f-${si}`}>{inner}</Fragment>);
    }
  });
  return nodes;
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

  const { nodes, nested } = useMemo(() => {
    const nestedMap = new Map<string, GlossaryEntry>();
    const ns = renderText(entry.description, map, {
      excludeId: entry.id,
      interactive: false,
      nested: nestedMap,
    });
    return { nodes: ns, nested: Array.from(nestedMap.values()) };
  }, [entry, map]);

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
                  {renderText(sub.description, map, { interactive: false })}
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

  return (
    <span className="leading-relaxed whitespace-pre-wrap">
      {renderText(text, map, { interactive: true })}
    </span>
  );
};
