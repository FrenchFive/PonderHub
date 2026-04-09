import type { Word, Preferences, Stats } from './types';

const STORAGE_KEY = 'ponderhub_words';
const PREFS_KEY = 'ponderhub_prefs';
const STATS_KEY = 'ponderhub_stats';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Words CRUD ────────────────────────────────────────────────────────────

export function getAllWords(): Word[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Back-compat: fill in category/emoji/source for entries saved before these fields existed
    return (JSON.parse(raw) as Partial<Word>[]).map((w) => ({
      meaning: '',
      category: '',
      emoji: '',
      source: '',
      example: '',
      linkedWords: [],
      ...w,
    })) as Word[];
  } catch {
    return [];
  }
}

function saveAll(words: Word[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

/** Returns all unique, non-empty categories in use, sorted alphabetically. */
export function getCategories(): string[] {
  const cats = getAllWords()
    .map((w) => w.category.trim())
    .filter(Boolean);
  return [...new Set(cats)].sort((a, b) => a.localeCompare(b));
}

/** Returns all unique, non-empty sources in use, sorted alphabetically. */
export function getSources(): string[] {
  const sources = getAllWords()
    .map((w) => w.source.trim())
    .filter(Boolean);
  return [...new Set(sources)].sort((a, b) => a.localeCompare(b));
}

export function addWord(
  term: string,
  meaning: string,
  definition: string,
  example: string,
  category: string,
  emoji: string,
  tags: string[],
  linkedWords: string[],
  source: string,
): Word {
  const words = getAllWords();
  const now = Date.now();
  const word: Word = {
    id: generateId(),
    term: term.trim(),
    meaning: meaning.trim(),
    definition: definition.trim(),
    example: example.trim(),
    category: category.trim(),
    emoji: emoji.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
    linkedWords,
    source: source.trim(),
    createdAt: now,
    updatedAt: now,
  };
  words.push(word);
  saveAll(words);
  return word;
}

export function updateWord(
  id: string,
  term: string,
  meaning: string,
  definition: string,
  example: string,
  category: string,
  emoji: string,
  tags: string[],
  linkedWords: string[],
  source: string,
): Word | null {
  const words = getAllWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = {
    ...words[idx],
    term: term.trim(),
    meaning: meaning.trim(),
    definition: definition.trim(),
    example: example.trim(),
    category: category.trim(),
    emoji: emoji.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
    linkedWords,
    source: source.trim(),
    updatedAt: Date.now(),
  };
  saveAll(words);
  return words[idx];
}

export function deleteWord(id: string): void {
  const words = getAllWords().filter((w) => w.id !== id);
  saveAll(words);
}

/** Import words from a JSON array. Skips duplicates (by id). Returns count of newly added words. */
export function importWords(imported: Partial<Word>[]): number {
  const existing = getAllWords();
  const existingIds = new Set(existing.map((w) => w.id));
  let count = 0;
  for (const raw of imported) {
    if (!raw || typeof raw !== 'object') continue;
    // Require at least a term
    if (!raw.term || typeof raw.term !== 'string') continue;
    // Skip if id already exists
    if (raw.id && existingIds.has(raw.id)) continue;
    const word: Word = {
      id: raw.id && typeof raw.id === 'string' ? raw.id : generateId(),
      term: String(raw.term ?? '').trim(),
      meaning: String(raw.meaning ?? '').trim(),
      definition: String(raw.definition ?? '').trim(),
      example: String(raw.example ?? '').trim(),
      category: String(raw.category ?? '').trim(),
      emoji: String(raw.emoji ?? '').trim(),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean) : [],
      linkedWords: Array.isArray(raw.linkedWords) ? raw.linkedWords.map(String).filter(Boolean) : [],
      source: String(raw.source ?? '').trim(),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    };
    existing.push(word);
    existingIds.add(word.id);
    count++;
  }
  saveAll(existing);
  return count;
}

export function getWord(id: string): Word | null {
  return getAllWords().find((w) => w.id === id) ?? null;
}

/** Returns all terms + all linkedWords values used across all words, deduplicated and sorted. */
export function getAllLinkedWordSuggestions(): string[] {
  const words = getAllWords();
  const set = new Set<string>();
  for (const w of words) {
    set.add(w.term);
    for (const lw of w.linkedWords) set.add(lw);
  }
  return [...set].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export function searchWords(query: string): Word[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllWords();
  return getAllWords().filter(
    (w) =>
      w.term.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      w.example.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q) ||
      w.tags.some((t) => t.toLowerCase().includes(q)) ||
      w.source.toLowerCase().includes(q),
  );
}

// ── Preferences ────────────────────────────────────────────────────────────

const DEFAULT_PREFS: Preferences = {
  notificationsEnabled: false,
  notificationHour: 10,
  notificationMinute: 0,
  excludedCategories: [],
};

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePreferences(prefs: Preferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ── Stats ──────────────────────────────────────────────────────────────────

const DEFAULT_STATS: Stats = { totalCardsSwiped: 0 };

export function getStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function incrementCardsSwiped(): void {
  const stats = getStats();
  stats.totalCardsSwiped++;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
