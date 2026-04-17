import { CONDITIONS } from '@/lib/srd';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

const map = new Map(CONDITIONS.map((c) => [c.name.toLowerCase(), c]));

/**
 * Renders text and converts known condition names to clickable popovers.
 * Matches whole-word, case-insensitive, plurals stripped.
 */
export const KeywordText = ({ text }: { text: string }) => {
  if (!text) return null;
  const tokens = text.split(/(\b[A-Za-z]+\b)/g);
  return (
    <span className="leading-relaxed">
      {tokens.map((tok, i) => {
        const key = tok.toLowerCase().replace(/s$/, '');
        const cond = map.get(key) || map.get(tok.toLowerCase());
        if (cond) {
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button type="button" className="keyword">{tok}</button>
              </PopoverTrigger>
              <PopoverContent className="parchment-card max-w-sm">
                <div className="font-display text-base text-oxblood-deep">{cond.name}</div>
                <div className="ink-divider my-2" />
                <p className="text-sm text-ink-faded">{cond.description}</p>
              </PopoverContent>
            </Popover>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
};
