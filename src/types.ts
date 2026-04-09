export interface Word {
  id: string;
  term: string;
  meaning: string;     // core meaning of the word (required)
  definition: string;  // general description (optional)
  example: string;     // usage example sentence (optional)
  category: string;  // user-defined category, '' = uncategorized
  emoji: string;     // lucide icon name (legacy: emoji character), '' = none
  tags: string[];
  linkedWords: string[];  // related/similar/synonym word IDs
  source: string;    // where the word was learned from, '' = none
  createdAt: number;
  updatedAt: number;
}

export type View = 'hub' | 'add' | 'detail' | 'edit' | 'memo' | 'settings' | 'map';

export interface AppState {
  currentView: View;
  selectedWordId: string | null;
  searchQuery: string;
  filterCategory: string;
  filterSource: string;
}

export interface Preferences {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  excludedCategories: string[];
}

export interface Stats {
  totalCardsSwiped: number;
}
