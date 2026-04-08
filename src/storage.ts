import type { Word } from './types';

const STORAGE_KEY = 'ponderhub_words';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAllWords(): Word[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Word[];
  } catch {
    return [];
  }
}

function saveAll(words: Word[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

export function addWord(term: string, definition: string, tags: string[]): Word {
  const words = getAllWords();
  const now = Date.now();
  const word: Word = {
    id: generateId(),
    term: term.trim(),
    definition: definition.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
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
  definition: string,
  tags: string[],
): Word | null {
  const words = getAllWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = {
    ...words[idx],
    term: term.trim(),
    definition: definition.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
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
      w.definition.toLowerCase().includes(q) ||
      w.tags.some((t) => t.toLowerCase().includes(q)),
  );
}
