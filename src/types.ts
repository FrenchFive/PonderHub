export interface Word {
  id: string;
  term: string;
  definition: string;
  category: string;  // user-defined category, '' = uncategorized
  emoji: string;     // single emoji or short string, '' = none
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type View = 'hub' | 'add' | 'search' | 'detail' | 'edit';

export interface AppState {
  currentView: View;
  selectedWordId: string | null;
  searchQuery: string;
}
