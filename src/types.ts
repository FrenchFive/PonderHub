export interface Word {
  id: string;
  term: string;
  definition: string;
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
