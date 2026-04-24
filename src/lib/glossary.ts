import type { GlossaryTerm, CustomEntry } from './types';

export interface GlossaryEntry {
  id: string;
  name: string;
  description: string;
  source: 'glossary' | 'custom';
}

const stripPlural = (s: string) => s.toLowerCase().replace(/s$/, '');

/**
 * Build a normalized lookup map from the glossary + custom entries marked as glossary.
 * Includes aliases, lowercased + plural-stripped.
 */
export const buildGlossaryMap = (
  glossary: GlossaryTerm[],
  customs: CustomEntry[],
): Map<string, GlossaryEntry> => {
  const map = new Map<string, GlossaryEntry>();
  const add = (key: string, entry: GlossaryEntry) => {
    if (!key) return;
    const norm = stripPlural(key);
    if (!map.has(norm)) map.set(norm, entry);
    if (!map.has(key.toLowerCase())) map.set(key.toLowerCase(), entry);
  };
  for (const g of glossary) {
    const e: GlossaryEntry = { id: g.id, name: g.name, description: g.description, source: 'glossary' };
    add(g.name, e);
    (g.aliases ?? []).forEach((a) => add(a, e));
  }
  for (const c of customs) {
    if (!c.treatAsGlossary) continue;
    const e: GlossaryEntry = { id: c.id, name: c.name, description: c.description, source: 'custom' };
    add(c.name, e);
    (c.aliases ?? []).forEach((a) => add(a, e));
  }
  return map;
};

export const lookupTerm = (
  map: Map<string, GlossaryEntry>,
  token: string,
): GlossaryEntry | undefined => {
  if (!token) return undefined;
  return map.get(stripPlural(token)) ?? map.get(token.toLowerCase());
};

/** Return entries matching a prefix query, sorted by relevance. */
export const searchGlossary = (
  glossary: GlossaryTerm[],
  customs: CustomEntry[],
  query: string,
  limit = 8,
): GlossaryEntry[] => {
  const q = query.toLowerCase().trim();
  const all: GlossaryEntry[] = [
    ...glossary.map((g) => ({
      id: g.id, name: g.name, description: g.description, source: 'glossary' as const,
    })),
    ...customs
      .filter((c) => c.treatAsGlossary)
      .map((c) => ({
        id: c.id, name: c.name, description: c.description, source: 'custom' as const,
      })),
  ];
  if (!q) return all.slice(0, limit);
  const startsWith = all.filter((e) => e.name.toLowerCase().startsWith(q));
  const contains = all.filter((e) => !e.name.toLowerCase().startsWith(q) && e.name.toLowerCase().includes(q));
  return [...startsWith, ...contains].slice(0, limit);
};
