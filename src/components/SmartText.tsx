import * as React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { searchGlossary, type GlossaryEntry } from '@/lib/glossary';

/**
 * Backslash-triggered glossary autocomplete shared by SmartInput and SmartTextarea.
 *
 * When the caret follows a `\word` fragment in the value, a small popover lists
 * matching glossary entries. Arrow keys / Enter / click pick; Esc / space dismisses.
 * Picking replaces the `\word` fragment with the chosen term's display name. The
 * inserted name is plain text — auto-matching at render time handles the underline.
 */

interface UseAutocompleteResult {
  popover: React.ReactNode;
  handlers: {
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
  };
}

const useGlossaryAutocomplete = (
  value: string,
  setValue: (next: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  onChangeProp?: (e: React.ChangeEvent<any>) => void,
): UseAutocompleteResult => {
  const glossary = useAppStore((s) => s.library.glossary);
  const customs = useAppStore((s) => s.library.custom);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const [anchorRect, setAnchorRect] = React.useState<{ top: number; left: number } | null>(null);

  const matches = React.useMemo<GlossaryEntry[]>(() => {
    if (!open) return [];
    return searchGlossary(glossary, customs, query, 8);
  }, [open, glossary, customs, query]);

  const detectTrigger = (el: HTMLInputElement | HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? 0;
    const before = el.value.slice(0, caret);
    // Match the most recent backslash that has only word chars after it.
    const m = /\\([A-Za-z]*)$/.exec(before);
    if (!m) {
      setOpen(false);
      return;
    }
    setQuery(m[1]);
    setHighlight(0);
    setOpen(true);
    // Anchor below the input bounding rect (close enough; avoids canvas measuring).
    const rect = el.getBoundingClientRect();
    setAnchorRect({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX + 8 });
  };

  const insertChoice = (entry: GlossaryEntry) => {
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const before = el.value.slice(0, caret);
    const after = el.value.slice(caret);
    const m = /\\([A-Za-z]*)$/.exec(before);
    if (!m) return;
    const start = caret - m[0].length;
    const next = before.slice(0, start) + entry.name + after;
    setValue(next);
    setOpen(false);
    // restore caret after the inserted name
    requestAnimationFrame(() => {
      const pos = start + entry.name.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    onChangeProp?.(e);
    setValue(e.target.value);
    detectTrigger(e.currentTarget);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(matches.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (matches[highlight]) {
        e.preventDefault();
        insertChoice(matches[highlight]);
      }
    } else if (e.key === 'Escape' || e.key === ' ') {
      setOpen(false);
    }
  };

  const onBlur = () => setTimeout(() => setOpen(false), 120);

  const popover =
    open && matches.length > 0 && anchorRect ? (
      <div
        role="listbox"
        className="z-50 fixed min-w-56 max-w-xs rounded-md border border-ink/30 bg-parchment-light shadow-parchment-card overflow-hidden"
        style={{ top: anchorRect.top, left: anchorRect.left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="px-2 py-1 text-[0.65rem] uppercase tracking-wider text-ink-faded border-b border-ink/15">
          Glossary — {query ? `\\${query}` : '\\'}
        </div>
        <ul className="max-h-64 overflow-y-auto">
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                className={cn(
                  'block w-full px-2 py-1.5 text-left text-sm hover:bg-secondary',
                  i === highlight && 'bg-oxblood/15 text-oxblood-deep',
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => insertChoice(m)}
              >
                <div className="font-display text-ink">{m.name}</div>
                <div className="text-[0.7rem] text-ink-faded line-clamp-1">{m.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return { popover, handlers: { onChange, onKeyDown, onBlur } };
};

// ---------------------------------------------------------------------------
// SmartTextarea
// ---------------------------------------------------------------------------

export interface SmartTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (next: string) => void;
}

export const SmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  ({ value, onValueChange, className, onKeyDown, onBlur, ...rest }, _ref) => {
    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    const { popover, handlers } = useGlossaryAutocomplete(value, onValueChange, inputRef);
    return (
      <>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => handlers.onChange(e)}
          onKeyDown={(e) => {
            handlers.onKeyDown(e);
            onKeyDown?.(e);
          }}
          onBlur={(e) => {
            handlers.onBlur();
            onBlur?.(e);
          }}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          {...rest}
        />
        {popover}
      </>
    );
  },
);
SmartTextarea.displayName = 'SmartTextarea';

// ---------------------------------------------------------------------------
// SmartInput
// ---------------------------------------------------------------------------

export interface SmartInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (next: string) => void;
}

export const SmartInput = React.forwardRef<HTMLInputElement, SmartInputProps>(
  ({ value, onValueChange, className, onKeyDown, onBlur, ...rest }, _ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const { popover, handlers } = useGlossaryAutocomplete(value, onValueChange, inputRef);
    return (
      <>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handlers.onChange(e)}
          onKeyDown={(e) => {
            handlers.onKeyDown(e);
            onKeyDown?.(e);
          }}
          onBlur={(e) => {
            handlers.onBlur();
            onBlur?.(e);
          }}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          {...rest}
        />
        {popover}
      </>
    );
  },
);
SmartInput.displayName = 'SmartInput';
