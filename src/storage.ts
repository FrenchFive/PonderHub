import type { Word } from './types';

const STORAGE_KEY = 'ponderhub_words';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

export function addWord(
  term: string,
  meaning: string,
  definition: string,
  category: string,
  emoji: string,
  tags: string[],
  source: string,
): Word {
  const words = getAllWords();
  const now = Date.now();
  const word: Word = {
    id: generateId(),
    term: term.trim(),
    meaning: meaning.trim(),
    definition: definition.trim(),
    category: category.trim(),
    emoji: emoji.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
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
  category: string,
  emoji: string,
  tags: string[],
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
    category: category.trim(),
    emoji: emoji.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
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

export function getWord(id: string): Word | null {
  return getAllWords().find((w) => w.id === id) ?? null;
}

export function searchWords(query: string): Word[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllWords();
  return getAllWords().filter(
    (w) =>
      w.term.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q) ||
      w.tags.some((t) => t.toLowerCase().includes(q)) ||
      w.source.toLowerCase().includes(q),
  );
}
