export interface Word {
  id: string;
  term: string;
  meaning: string;     // core meaning of the word (required)
  definition: string;  // general description (optional)
  category: string;  // user-defined category, '' = uncategorized
  emoji: string;     // lucide icon name (legacy: emoji character), '' = none
  tags: string[];
  source: string;    // where the word was learned from, '' = none
  createdAt: number;
  updatedAt: number;
}

export type View = 'hub' | 'add' | 'detail' | 'edit';

export interface AppState {
  currentView: View;
  selectedWordId: string | null;
  searchQuery: string;
}
