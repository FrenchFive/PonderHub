import type { Word, AppState } from './types';
import { getAllWords, addWord, updateWord, deleteWord, searchWords, getWord } from './storage';

const state: AppState = {
  currentView: 'hub',
  selectedWordId: null,
  searchQuery: '',
};

function navigate(view: AppState['currentView'], wordId?: string): void {
  state.currentView = view;
  state.selectedWordId = wordId ?? null;
  render();
}

// ── helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function renderTagChips(tags: string[]): string {
  return tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
}

// ── view builders ──────────────────────────────────────────────────────────

function buildHubView(): string {
  const words = getAllWords().sort((a, b) =>
    a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
  );

  if (words.length === 0) {
    return `
      <section class="view" id="view-hub">
        <h2 class="view-title">Your Hub</h2>
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <p class="empty-msg">Your personal encyclopedia is empty.<br>
            Start by adding your first word!</p>
          <button class="btn btn-primary" data-action="goto-add">＋ Add a Word</button>
        </div>
      </section>`;
  }

  const items = words
    .map(
      (w) => `
      <li class="word-card" data-action="goto-detail" data-id="${escapeHtml(w.id)}" tabindex="0" role="button"
          aria-label="View definition of ${escapeHtml(w.term)}">
        <div class="word-card__body">
          <span class="word-card__term">${escapeHtml(w.term)}</span>
          <p class="word-card__preview">${escapeHtml(w.definition.slice(0, 90))}${w.definition.length > 90 ? '…' : ''}</p>
          ${w.tags.length ? `<div class="word-card__tags">${renderTagChips(w.tags.slice(0, 4))}</div>` : ''}
        </div>
        <span class="word-card__arrow" aria-hidden="true">›</span>
      </li>`,
    )
    .join('');

  return `
    <section class="view" id="view-hub">
      <h2 class="view-title">Your Hub <span class="count">${words.length}</span></h2>
      <ul class="word-list" role="list">${items}</ul>
    </section>`;
}

function buildSearchView(): string {
  const q = state.searchQuery;
  const results = searchWords(q).sort((a, b) =>
    a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
  );

  const items =
    q && results.length === 0
      ? `<p class="no-results">No words found for "<em>${escapeHtml(q)}</em>".</p>`
      : results
          .map(
            (w) => `
        <li class="word-card" data-action="goto-detail" data-id="${escapeHtml(w.id)}" tabindex="0" role="button"
            aria-label="View definition of ${escapeHtml(w.term)}">
          <div class="word-card__body">
            <span class="word-card__term">${escapeHtml(w.term)}</span>
            <p class="word-card__preview">${escapeHtml(w.definition.slice(0, 90))}${w.definition.length > 90 ? '…' : ''}</p>
            ${w.tags.length ? `<div class="word-card__tags">${renderTagChips(w.tags.slice(0, 4))}</div>` : ''}
          </div>
          <span class="word-card__arrow" aria-hidden="true">›</span>
        </li>`,
          )
          .join('');

  return `
    <section class="view" id="view-search">
      <h2 class="view-title">Search</h2>
      <div class="search-bar">
        <span class="search-bar__icon" aria-hidden="true">🔍</span>
        <input
          id="search-input"
          class="search-bar__input"
          type="search"
          placeholder="Word, definition, tag…"
          value="${escapeHtml(q)}"
          autocomplete="off"
          aria-label="Search your hub"
        />
      </div>
      <div id="search-results">
        ${q || results.length ? `<ul class="word-list" role="list">${items}</ul>` : ''}
      </div>
    </section>`;
}

function buildAddView(): string {
  return `
    <section class="view" id="view-add">
      <h2 class="view-title">Add a Word</h2>
      <form class="word-form" data-action="submit-add" novalidate>
        <div class="form-group">
          <label class="form-label" for="add-term">Word / Term <span class="required">*</span></label>
          <input id="add-term" class="form-input" type="text" name="term"
            placeholder="e.g. Epistemology" autocomplete="off" required />
          <span class="form-error" id="add-term-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-def">Definition <span class="required">*</span></label>
          <textarea id="add-def" class="form-textarea" name="definition"
            placeholder="Describe what this word means to you…" rows="5" required></textarea>
          <span class="form-error" id="add-def-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-tags">Tags <span class="hint">(comma separated)</span></label>
          <input id="add-tags" class="form-input" type="text" name="tags"
            placeholder="e.g. philosophy, knowledge" autocomplete="off" />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Save Word</button>
      </form>
    </section>`;
}

function buildDetailView(word: Word): string {
  return `
    <section class="view" id="view-detail">
      <div class="detail-header">
        <button class="btn-back" data-action="goto-hub" aria-label="Back to hub">
          <span aria-hidden="true">←</span> Hub
        </button>
        <button class="btn-icon btn-edit" data-action="goto-edit" data-id="${escapeHtml(word.id)}" aria-label="Edit word">
          ✏️
        </button>
      </div>
      <h2 class="detail__term">${escapeHtml(word.term)}</h2>
      ${word.tags.length ? `<div class="detail__tags">${renderTagChips(word.tags)}</div>` : ''}
      <div class="detail__definition">${escapeHtml(word.definition).replace(/\n/g, '<br>')}</div>
      <div class="detail__meta">
        <span>Added ${formatDate(word.createdAt)}</span>
        ${word.updatedAt !== word.createdAt ? `<span>· Updated ${formatDate(word.updatedAt)}</span>` : ''}
      </div>
      <button class="btn btn-danger btn-full" data-action="delete-word" data-id="${escapeHtml(word.id)}">
        🗑 Delete Word
      </button>
    </section>`;
}

function buildEditView(word: Word): string {
  return `
    <section class="view" id="view-edit">
      <div class="detail-header">
        <button class="btn-back" data-action="goto-detail" data-id="${escapeHtml(word.id)}" aria-label="Cancel edit">
          <span aria-hidden="true">←</span> Cancel
        </button>
      </div>
      <h2 class="view-title">Edit Word</h2>
      <form class="word-form" data-action="submit-edit" data-id="${escapeHtml(word.id)}" novalidate>
        <div class="form-group">
          <label class="form-label" for="edit-term">Word / Term <span class="required">*</span></label>
          <input id="edit-term" class="form-input" type="text" name="term"
            value="${escapeHtml(word.term)}" required />
          <span class="form-error" id="edit-term-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-def">Definition <span class="required">*</span></label>
          <textarea id="edit-def" class="form-textarea" name="definition" rows="5" required>${escapeHtml(word.definition)}</textarea>
          <span class="form-error" id="edit-def-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-tags">Tags <span class="hint">(comma separated)</span></label>
          <input id="edit-tags" class="form-input" type="text" name="tags"
            value="${escapeHtml(word.tags.join(', '))}" />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Update Word</button>
      </form>
    </section>`;
}

function buildNav(): string {
  const tabs = [
    { id: 'hub', icon: '🏠', label: 'Hub' },
    { id: 'add', icon: '＋', label: 'Add' },
    { id: 'search', icon: '🔍', label: 'Search' },
  ] as const;

  const activeView = ['detail', 'edit'].includes(state.currentView) ? 'hub' : state.currentView;

  return `
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      ${tabs
        .map(
          (t) => `
        <button class="nav-btn ${activeView === t.id ? 'nav-btn--active' : ''}"
          data-action="goto-${t.id}"
          aria-label="${t.label}"
          ${activeView === t.id ? 'aria-current="page"' : ''}>
          <span class="nav-btn__icon" aria-hidden="true">${t.icon}</span>
          <span class="nav-btn__label">${t.label}</span>
        </button>`,
        )
        .join('')}
    </nav>`;
}

// ── main render ────────────────────────────────────────────────────────────

export function render(): void {
  const app = document.getElementById('app')!;

  let mainContent = '';
  if (state.currentView === 'hub') {
    mainContent = buildHubView();
  } else if (state.currentView === 'search') {
    mainContent = buildSearchView();
  } else if (state.currentView === 'add') {
    mainContent = buildAddView();
  } else if (state.currentView === 'detail' && state.selectedWordId) {
    const word = getWord(state.selectedWordId);
    if (word) {
      mainContent = buildDetailView(word);
    } else {
      state.currentView = 'hub';
      mainContent = buildHubView();
    }
  } else if (state.currentView === 'edit' && state.selectedWordId) {
    const word = getWord(state.selectedWordId);
    if (word) {
      mainContent = buildEditView(word);
    } else {
      state.currentView = 'hub';
      mainContent = buildHubView();
    }
  } else {
    state.currentView = 'hub';
    mainContent = buildHubView();
  }

  app.innerHTML = `
    <div class="shell">
      <header class="app-header">
        <div class="app-header__logo" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
            <text x="12" y="16.5" text-anchor="middle" font-size="12" font-family="Georgia, serif"
              fill="#fff" font-weight="bold">P</text>
          </svg>
        </div>
        <span class="app-header__title">PonderHub</span>
      </header>
      <main class="main-content" id="main-content" role="main">
        ${mainContent}
      </main>
      ${buildNav()}
    </div>`;

  attachEventListeners();
}

// ── event delegation ───────────────────────────────────────────────────────

function attachEventListeners(): void {
  const app = document.getElementById('app')!;

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    requestAnimationFrame(() => searchInput.focus());
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value;
      const resultsEl = document.getElementById('search-results');
      if (!resultsEl) return;
      const q = state.searchQuery;
      const results = searchWords(q).sort((a, b) =>
        a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
      );
      if (!q) {
        resultsEl.innerHTML = '';
        return;
      }
      if (results.length === 0) {
        resultsEl.innerHTML = `<p class="no-results">No words found for "<em>${escapeHtml(q)}</em>".</p>`;
        return;
      }
      const items = results
        .map(
          (w) => `
          <li class="word-card" data-action="goto-detail" data-id="${escapeHtml(w.id)}" tabindex="0" role="button"
              aria-label="View definition of ${escapeHtml(w.term)}">
            <div class="word-card__body">
              <span class="word-card__term">${escapeHtml(w.term)}</span>
              <p class="word-card__preview">${escapeHtml(w.definition.slice(0, 90))}${w.definition.length > 90 ? '…' : ''}</p>
              ${w.tags.length ? `<div class="word-card__tags">${renderTagChips(w.tags.slice(0, 4))}</div>` : ''}
            </div>
            <span class="word-card__arrow" aria-hidden="true">›</span>
          </li>`,
        )
        .join('');
      resultsEl.innerHTML = `<ul class="word-list" role="list">${items}</ul>`;
      // No need to re-attach – click/keydown delegation is already on #app
    });
  }

  // Click / keyboard delegation (attached once per full render)
  app.addEventListener('click', handleAction);
  app.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      handleAction(e as unknown as MouseEvent);
    }
  });
}

function handleAction(e: MouseEvent): void {
  const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  switch (action) {
    case 'goto-hub':
      navigate('hub');
      break;
    case 'goto-add':
      navigate('add');
      break;
    case 'goto-search':
      navigate('search');
      break;
    case 'goto-detail':
      if (id) navigate('detail', id);
      break;
    case 'goto-edit':
      if (id) navigate('edit', id);
      break;
    case 'delete-word':
      if (id && confirm('Delete this word from your Hub?')) {
        deleteWord(id);
        navigate('hub');
      }
      break;
    case 'submit-add': {
      e.preventDefault();
      const form = target as HTMLFormElement;
      submitAddForm(form);
      break;
    }
    case 'submit-edit': {
      e.preventDefault();
      const form = target as HTMLFormElement;
      submitEditForm(form, id!);
      break;
    }
  }
}

// ── form handlers ──────────────────────────────────────────────────────────

function submitAddForm(form: HTMLFormElement): void {
  const termInput = form.querySelector<HTMLInputElement>('#add-term')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#add-def')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#add-tags')!;

  let valid = true;

  if (!termInput.value.trim()) {
    showError('add-term-error', 'Please enter a word or term.');
    valid = false;
  } else {
    clearError('add-term-error');
  }

  if (!defInput.value.trim()) {
    showError('add-def-error', 'Please enter a definition.');
    valid = false;
  } else {
    clearError('add-def-error');
  }

  if (!valid) return;

  addWord(termInput.value, defInput.value, parseTags(tagsInput.value));
  navigate('hub');
}

function submitEditForm(form: HTMLFormElement, wordId: string): void {
  const termInput = form.querySelector<HTMLInputElement>('#edit-term')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#edit-def')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#edit-tags')!;

  let valid = true;

  if (!termInput.value.trim()) {
    showError('edit-term-error', 'Please enter a word or term.');
    valid = false;
  } else {
    clearError('edit-term-error');
  }

  if (!defInput.value.trim()) {
    showError('edit-def-error', 'Please enter a definition.');
    valid = false;
  } else {
    clearError('edit-def-error');
  }

  if (!valid) return;

  updateWord(wordId, termInput.value, defInput.value, parseTags(tagsInput.value));
  navigate('detail', wordId);
}

function showError(id: string, msg: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function clearError(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}
