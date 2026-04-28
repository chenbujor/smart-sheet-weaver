import * as React from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartTextarea, type SmartTextareaProps } from '@/components/SmartText';

/**
 * Edit-lock wrapper for multi-line description fields on the character sheet.
 *
 * The textarea renders read-only with a small pencil button overlaid in the
 * top-right corner. Click the pencil to unlock and focus the field; it
 * auto-locks again as soon as focus leaves.
 */

interface EditButtonProps {
  editing: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const EditButton: React.FC<EditButtonProps> = ({ editing, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={editing ? 'Editing' : 'Edit'}
    tabIndex={-1}
    className={cn(
      'absolute top-1 right-1 z-10 grid h-5 w-5 place-items-center rounded-sm border border-ink/30 bg-parchment-light/90 text-ink-faded transition-colors hover:text-oxblood hover:border-oxblood/60',
      editing && 'border-oxblood/70 text-oxblood',
    )}
  >
    <Pencil className="h-3 w-3" />
  </button>
);

// ---------------------------------------------------------------------------
// Plain textarea variant
// ---------------------------------------------------------------------------

export interface LockableTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const LockableTextarea = React.forwardRef<HTMLTextAreaElement, LockableTextareaProps>(
  ({ className, onBlur, readOnly, ...rest }, _ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    const [editing, setEditing] = React.useState(false);

    const enable = () => {
      setEditing(true);
      requestAnimationFrame(() => {
        const el = innerRef.current;
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      });
    };

    return (
      <div className="relative">
        <textarea
          ref={innerRef}
          {...rest}
          readOnly={readOnly || !editing}
          onBlur={(e) => {
            setEditing(false);
            onBlur?.(e);
          }}
          className={cn(
            className,
            !editing && 'cursor-default opacity-90',
            'pr-7',
          )}
        />
        <EditButton editing={editing} onClick={enable} />
      </div>
    );
  },
);
LockableTextarea.displayName = 'LockableTextarea';

// ---------------------------------------------------------------------------
// SmartTextarea variant (keeps glossary autocomplete)
// ---------------------------------------------------------------------------

export const LockableSmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  ({ className, onBlur, ...rest }, _ref) => {
    const [editing, setEditing] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const enable = () => {
      setEditing(true);
      requestAnimationFrame(() => {
        const el = wrapperRef.current?.querySelector('textarea');
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      });
    };

    return (
      <div ref={wrapperRef} className="relative">
        <SmartTextarea
          {...rest}
          readOnly={!editing}
          onBlur={(e) => {
            setEditing(false);
            onBlur?.(e);
          }}
          className={cn(className, !editing && 'cursor-default opacity-90', 'pr-7')}
        />
        <EditButton editing={editing} onClick={enable} />
      </div>
    );
  },
);
LockableSmartTextarea.displayName = 'LockableSmartTextarea';
