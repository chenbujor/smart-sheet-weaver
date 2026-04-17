import { cn } from '@/lib/utils';
import type { SourceType } from '@/lib/types';

const labels: Record<SourceType, string> = {
  class: 'Class', species: 'Species', feat: 'Feat',
  item: 'Item', custom: 'Custom', background: 'Background',
};

const colorClass: Record<SourceType, string> = {
  class: 'bg-src-class',
  species: 'bg-src-species',
  feat: 'bg-src-feat',
  item: 'bg-src-item',
  custom: 'bg-src-custom',
  background: 'bg-forest',
};

export const SourceTag = ({ source, label, className }: { source: SourceType; label?: string; className?: string }) => (
  <span className={cn('source-tag', colorClass[source], className)}>
    {label ?? labels[source]}
  </span>
);
