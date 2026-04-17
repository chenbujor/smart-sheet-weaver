import { cn } from '@/lib/utils';

interface PipsProps {
  total: number;
  used: number;
  onChange: (used: number) => void;
  shape?: 'round' | 'square';
  className?: string;
}

export const Pips = ({ total, used, onChange, shape = 'round', className }: PipsProps) => {
  if (total <= 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {Array.from({ length: total }).map((_, i) => {
        const isUsed = i < used;
        const cls = shape === 'square' ? 'square-pip' : 'pip';
        return (
          <button
            key={i}
            type="button"
            aria-label={isUsed ? 'Used' : 'Available'}
            className={cn(cls, isUsed && 'used')}
            onClick={() => {
              // clicking a used pip restores it; clicking next available marks it used
              if (isUsed) onChange(i);
              else onChange(i + 1);
            }}
          />
        );
      })}
    </div>
  );
};
