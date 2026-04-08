import type { Word, AppState } from './types';
import {
  getAllWords,
  addWord,
  updateWord,
  deleteWord,
  searchWords,
  getWord,
  getCategories,
} from './storage';
import { createIcons,
  ArrowLeft, Plus, Search, Pencil, Trash2, ChevronRight, BookOpen,
  FileText, Calendar, Link2, Clock, X,
} from 'lucide';

// ── Icon registry for createIcons (UI only) ──────────────────────────────
const ICON_REGISTRY = {
  ArrowLeft, Plus, Search, Pencil, Trash2, ChevronRight, BookOpen,
  FileText, Calendar, Link2, Clock, X,
};

// ── Curated emoji picks for word personalisation ─────────────────────────
const EMOJI_PICKS = [
  '📖','🧠','💡','🔑','🌍','🎯','✨','🔬','🎨','🎭',
  '🌱','⚡','🔥','💎','🌊','🦋','🏆','🧩','🌀','💫',
  '🗺️','📝','🔭','⚗️','🎵','🌙','☀️','❄️','🌿','🦉',
  '💬','🫀','🪐','🧬','📐','🎲','🔮','🍀','🕊️','🧿',
];

// ── State ──────────────────────────────────────────────────────────────────
const state: AppState = {
  currentView: 'hub',
  selectedWordId: null,
  searchQuery: '',
};

/** The emoji currently chosen in the add/edit form */
let formEmojiValue = '';

function randomEmoji(): string {
  return EMOJI_PICKS[Math.floor(Math.random() * EMOJI_PICKS.length)];
}

function navigate(view: AppState['currentView'], wordId?: string): void {
  state.currentView = view;
  state.selectedWordId = wordId ?? null;
  if (view === 'hub') state.searchQuery = '';
  if (view === 'add') formEmojiValue = '';  // will be assigned a random emoji in buildAddView
  render();
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTags(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

function renderTagChips(tags: string[]): string {
  return tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
}

function renderCategoryBadge(category: string): string {
  if (!category) return '';
  return `<span class="category-badge">${escapeHtml(category)}</span>`;
}

/** Returns an <i> tag that createIcons will replace with an SVG */
function icon(name: string, cls = '', size = 20): string {
  return `<i data-lucide="${name}" class="${cls}" style="width:${size}px;height:${size}px"></i>`;
}

function renderEmojiField(prefix: string, value: string): string {
  const display = value || '📄';
  return `
    <div class="form-group">
      <label class="form-label">Emoji</label>
      <input id="${prefix}-emoji" type="hidden" name="emoji" value="${escapeHtml(value)}" />
      <button type="button" class="emoji-trigger" data-action="open-emoji-picker" data-target="${prefix}-emoji" aria-label="Choose emoji">
        <span class="emoji-trigger__preview">${display}</span>
        <span class="emoji-trigger__label">Tap to change</span>
        ${icon('chevron-right', 'emoji-trigger__arrow', 16)}
      </button>
    </div>`;
}

function buildEmojiDialog(currentValue: string, targetId: string): string {
  const items = EMOJI_PICKS.map(
    (em) =>
      `<button type="button" class="dialog-emoji-btn ${currentValue === em ? 'dialog-emoji-btn--selected' : ''}"
         data-action="select-emoji" data-emoji="${em}" data-target="${targetId}"
         aria-label="${em}">${em}</button>`,
  ).join('');

  return `
    <div class="emoji-dialog-backdrop" data-action="close-emoji-picker">
      <div class="emoji-dialog" role="dialog" aria-label="Choose an emoji">
        <div class="emoji-dialog__header">
          <span class="emoji-dialog__title">Choose Emoji</span>
          <button type="button" class="emoji-dialog__close" data-action="close-emoji-picker" aria-label="Close">
            ${icon('x', '', 20)}
          </button>
        </div>
        <div class="emoji-dialog__grid">${items}</div>
        <div class="emoji-dialog__custom">
          <input class="emoji-dialog__input" type="text" placeholder="Or type / paste your own emoji…"
            data-target="${targetId}" maxlength="10" autocomplete="off" />
          <button type="button" class="emoji-dialog__use-btn" data-action="use-custom-emoji" data-target="${targetId}">Use</button>
        </div>
      </div>
    </div>`;
}

function renderCategoryField(prefix: string, value = ''): string {
  const cats = getCategories();
  const chips = cats.map(
    (c) =>
      `<button type="button" class="category-chip ${value === c ? 'category-chip--selected' : ''}"
         data-action="pick-category" data-category="${escapeHtml(c)}" data-target="${prefix}-category">${escapeHtml(c)}</button>`,
  ).join('');
  return `
    <div class="form-group">
      <label class="form-label" for="${prefix}-category">
        Category <span class="hint">(optional)</span>
      </label>
      ${cats.length ? `<div class="category-chips">${chips}</div>` : ''}
      <input id="${prefix}-category" class="form-input" type="text" name="category"
        placeholder="Type a new category or tap above…"
        value="${escapeHtml(value)}"
        autocomplete="off" />
    </div>`;
}

function renderSourceField(prefix: string, value = ''): string {
  return `
    <div class="form-group">
      <label class="form-label" for="${prefix}-source">
        Source <span class="hint">(where you learned it)</span>
      </label>
      <input id="${prefix}-source" class="form-input" type="text" name="source"
        placeholder="e.g. Book, podcast, conversation…"
        value="${escapeHtml(value)}"
        autocomplete="off" />
    </div>`;
}

// ── View builders ──────────────────────────────────────────────────────────

function buildWordCardHtml(w: Word): string {
  const emojiDisplay = w.emoji
    ? `<div class="word-card__emoji" aria-hidden="true">${w.emoji}</div>`
    : `<div class="word-card__emoji word-card__emoji--placeholder" aria-hidden="true">📄</div>`;

  const meta = [
    w.category ? renderCategoryBadge(w.category) : '',
    ...w.tags.slice(0, 3).map((t) => `<span class="chip">${escapeHtml(t)}</span>`),
  ]
    .filter(Boolean)
    .join('');

  return `
    <li class="word-card" data-action="goto-detail" data-id="${escapeHtml(w.id)}"
        tabindex="0" role="button" aria-label="View definition of ${escapeHtml(w.term)}">
      ${emojiDisplay}
      <div class="word-card__body">
        <span class="word-card__term">${escapeHtml(w.term)}</span>
        <p class="word-card__preview">${escapeHtml(w.definition.slice(0, 80))}${w.definition.length > 80 ? '…' : ''}</p>
        ${meta ? `<div class="word-card__meta">${meta}</div>` : ''}
      </div>
      <span class="word-card__arrow" aria-hidden="true">${icon('chevron-right', '', 18)}</span>
    </li>`;
}

function buildHubView(): string {
  const q = state.searchQuery;
  const allWords = q ? searchWords(q) : getAllWords();
  const words = allWords.sort((a, b) =>
    a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
  );

  const listHtml = words.length === 0
    ? (q
      ? `<p class="no-results">No words found for "<em>${escapeHtml(q)}</em>".</p>`
      : `<div class="empty-state">
          <div class="empty-icon">${icon('book-open', '', 48)}</div>
          <p class="empty-msg">Your personal encyclopedia is empty.<br>
            Tap the button above to add your first word!</p>
        </div>`)
    : `<ul class="word-list" role="list">${words.map(buildWordCardHtml).join('')}</ul>`;

  return `
    <section class="view" id="view-hub">
      <div class="hub-toolbar">
        <div class="search-bar">
          <span class="search-bar__icon" aria-hidden="true">${icon('search', '', 18)}</span>
          <input id="search-input" class="search-bar__input" type="search"
            placeholder="Search words…"
            value="${escapeHtml(q)}" autocomplete="off" aria-label="Search your hub" />
        </div>
        <button class="btn-add" data-action="goto-add" aria-label="Add a word">
          ${icon('plus', '', 22)}
        </button>
      </div>
      ${!q && words.length > 0 ? `<div class="hub-count">${words.length} word${words.length !== 1 ? 's' : ''}</div>` : ''}
      <div id="search-results">${listHtml}</div>
    </section>`;
}

function buildAddView(): string {
  // Assign a random emoji for new words
  if (!formEmojiValue) formEmojiValue = randomEmoji();
  return `
    <section class="view" id="view-add">
      <div class="view-header">
        <button class="btn-back" data-action="goto-hub" aria-label="Back to hub">
          ${icon('arrow-left', '', 20)} <span>Hub</span>
        </button>
      </div>
      <h2 class="view-title">Add a Word</h2>
      <form class="word-form" data-action="submit-add" novalidate>
        ${renderEmojiField('add', formEmojiValue)}
        <div class="form-group">
          <label class="form-label" for="add-term">Word / Expression <span class="required">*</span></label>
          <input id="add-term" class="form-input" type="text" name="term"
            placeholder="e.g. Epistemology" autocomplete="off" required />
          <span class="form-error" id="add-term-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-def">Description <span class="required">*</span></label>
          <textarea id="add-def" class="form-textarea" name="definition"
            placeholder="Describe what this word means to you…" rows="4" required></textarea>
          <span class="form-error" id="add-def-error" aria-live="polite"></span>
        </div>
        ${renderSourceField('add')}
        ${renderCategoryField('add')}
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
  const emojiDisplay = word.emoji
    ? `<div class="detail__emoji">${word.emoji}</div>`
    : '';

  return `
    <section class="view" id="view-detail">
      <div class="view-header">
        <button class="btn-back" data-action="goto-hub" aria-label="Back to hub">
          ${icon('arrow-left', '', 20)} <span>Hub</span>
        </button>
        <button class="btn-icon-action" data-action="goto-edit" data-id="${escapeHtml(word.id)}" aria-label="Edit word">
          ${icon('pencil', '', 18)}
        </button>
      </div>
      ${emojiDisplay}
      <h2 class="detail__term">${escapeHtml(word.term)}</h2>
      ${word.category ? `<div class="detail__category">${renderCategoryBadge(word.category)}</div>` : ''}
      ${word.tags.length ? `<div class="detail__tags">${renderTagChips(word.tags)}</div>` : ''}
      <div class="detail__definition">${escapeHtml(word.definition).replace(/\n/g, '<br>')}</div>
      ${word.source ? `
        <div class="detail__source">
          ${icon('link-2', '', 14)}
          <span>${escapeHtml(word.source)}</span>
        </div>` : ''}
      <div class="detail__meta">
        <div class="detail__meta-item">
          ${icon('calendar', '', 14)}
          <span>Added ${formatDate(word.createdAt)} at ${formatTime(word.createdAt)}</span>
        </div>
        ${word.updatedAt !== word.createdAt ? `
          <div class="detail__meta-item">
            ${icon('clock', '', 14)}
            <span>Updated ${formatDate(word.updatedAt)} at ${formatTime(word.updatedAt)}</span>
          </div>` : ''}
      </div>
      <button class="btn btn-danger btn-full" data-action="delete-word" data-id="${escapeHtml(word.id)}">
        ${icon('trash-2', '', 16)} Delete Word
      </button>
    </section>`;
}

function buildEditView(word: Word): string {
  formEmojiValue = word.emoji || randomEmoji();
  return `
    <section class="view" id="view-edit">
      <div class="view-header">
        <button class="btn-back" data-action="goto-detail" data-id="${escapeHtml(word.id)}" aria-label="Cancel edit">
          ${icon('arrow-left', '', 20)} <span>Cancel</span>
        </button>
      </div>
      <h2 class="view-title">Edit Word</h2>
      <form class="word-form" data-action="submit-edit" data-id="${escapeHtml(word.id)}" novalidate>
        ${renderEmojiField('edit', formEmojiValue)}
        <div class="form-group">
          <label class="form-label" for="edit-term">Word / Expression <span class="required">*</span></label>
          <input id="edit-term" class="form-input" type="text" name="term"
            value="${escapeHtml(word.term)}" required />
          <span class="form-error" id="edit-term-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-def">Description <span class="required">*</span></label>
          <textarea id="edit-def" class="form-textarea" name="definition" rows="4" required>${escapeHtml(word.definition)}</textarea>
          <span class="form-error" id="edit-def-error" aria-live="polite"></span>
        </div>
        ${renderSourceField('edit', word.source)}
        ${renderCategoryField('edit', word.category)}
        <div class="form-group">
          <label class="form-label" for="edit-tags">Tags <span class="hint">(comma separated)</span></label>
          <input id="edit-tags" class="form-input" type="text" name="tags"
            value="${escapeHtml(word.tags.join(', '))}" />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Update Word</button>
      </form>
    </section>`;
}

// ── Main render ────────────────────────────────────────────────────────────

export function render(): void {
  const app = document.getElementById('app')!;

  let mainContent = '';
  if (state.currentView === 'hub') {
    mainContent = buildHubView();
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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="var(--accent)"/>
            <text x="14" y="19.5" text-anchor="middle" font-size="14" font-family="Georgia, serif"
              fill="#fff" font-weight="bold">P</text>
          </svg>
        </div>
        <span class="app-header__title">PonderHub</span>
      </header>
      <main class="main-content" id="main-content" role="main">
        ${mainContent}
      </main>
    </div>`;

  // Replace all <i data-lucide="..."> with SVGs
  createIcons({ icons: ICON_REGISTRY });

  attachEventListeners();
}

// ── Event delegation ───────────────────────────────────────────────────────

function attachEventListeners(): void {
  const app = document.getElementById('app')!;

  // Live search on hub
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    if (state.currentView === 'hub' && !state.searchQuery) {
      // Don't auto-focus on hub to avoid keyboard popping up on mobile
    }
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value;
      const resultsEl = document.getElementById('search-results');
      if (!resultsEl) return;
      const q = state.searchQuery;
      const results = q ? searchWords(q) : getAllWords();
      const sorted = results.sort((a, b) =>
        a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
      );

      if (sorted.length === 0) {
        resultsEl.innerHTML = q
          ? `<p class="no-results">No words found for "<em>${escapeHtml(q)}</em>".</p>`
          : `<div class="empty-state">
              <div class="empty-icon"><i data-lucide="book-open" style="width:48px;height:48px"></i></div>
              <p class="empty-msg">Your personal encyclopedia is empty.<br>
                Tap the button above to add your first word!</p>
            </div>`;
      } else {
        resultsEl.innerHTML = `<ul class="word-list" role="list">${sorted.map(buildWordCardHtml).join('')}</ul>`;
      }
      // Update count
      const countEl = document.querySelector('.hub-count');
      if (countEl) {
        countEl.textContent = q ? '' : `${sorted.length} word${sorted.length !== 1 ? 's' : ''}`;
      }
      createIcons({ icons: ICON_REGISTRY });
    });
  }

  // Click / keyboard delegation
  app.addEventListener('click', handleAction);
  app.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      handleAction(e as unknown as MouseEvent);
    }
  });

  // Dialog lives outside #app — use a single global listener
  document.removeEventListener('click', handleDialogAction);
  document.addEventListener('click', handleDialogAction);
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
    case 'open-emoji-picker': {
      const targetInputId = target.dataset.target;
      if (targetInputId) {
        const input = document.getElementById(targetInputId) as HTMLInputElement | null;
        const currentVal = input?.value ?? '';
        // Inject dialog into DOM
        const existing = document.querySelector('.emoji-dialog-backdrop');
        if (existing) existing.remove();
        const dialogHtml = buildEmojiDialog(currentVal, targetInputId);
        document.body.insertAdjacentHTML('beforeend', dialogHtml);
        createIcons({ icons: ICON_REGISTRY });
        // Animate in
        requestAnimationFrame(() => {
          document.querySelector('.emoji-dialog-backdrop')?.classList.add('emoji-dialog-backdrop--open');
        });
      }
      break;
    }
    case 'pick-category': {
      const cat = target.dataset.category ?? '';
      const targetInputId = target.dataset.target;
      if (targetInputId) {
        const input = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (input) {
          // Toggle: if already selected, clear it
          if (input.value === cat) {
            input.value = '';
          } else {
            input.value = cat;
          }
          // Update chip selection visuals
          document.querySelectorAll<HTMLButtonElement>('.category-chip').forEach((c) => {
            c.classList.toggle('category-chip--selected', c.dataset.category === input.value);
          });
        }
      }
      break;
    }
    // select-emoji and close-emoji-picker handled by handleDialogAction (dialog is outside #app)
    case 'submit-add': {
      e.preventDefault();
      submitAddForm(target as HTMLFormElement);
      break;
    }
    case 'submit-edit': {
      e.preventDefault();
      submitEditForm(target as HTMLFormElement, id!);
      break;
    }
  }
}

function handleDialogAction(e: MouseEvent): void {
  const el = e.target as HTMLElement;
  const backdrop = el.closest('.emoji-dialog-backdrop');
  if (!backdrop) return;

  const target = el.closest('[data-action]') as HTMLElement | null;
  if (!target) return;

  const action = target.dataset.action;
  if (action === 'select-emoji') {
    const emoji = target.dataset.emoji;
    const targetInputId = target.dataset.target;
    if (emoji && targetInputId) {
      applyEmojiSelection(emoji, targetInputId);
    }
    closeEmojiDialog();
  } else if (action === 'use-custom-emoji') {
    const targetInputId = target.dataset.target;
    const customInput = backdrop.querySelector<HTMLInputElement>('.emoji-dialog__input');
    if (targetInputId && customInput && customInput.value.trim()) {
      applyEmojiSelection(customInput.value.trim(), targetInputId);
      closeEmojiDialog();
    }
  } else if (action === 'close-emoji-picker') {
    closeEmojiDialog();
  }
}

function applyEmojiSelection(emoji: string, targetInputId: string): void {
  const input = document.getElementById(targetInputId) as HTMLInputElement | null;
  if (input) {
    input.value = emoji;
    formEmojiValue = emoji;
    const trigger = document.querySelector('.emoji-trigger__preview');
    if (trigger) {
      trigger.textContent = emoji;
    }
  }
}

function closeEmojiDialog(): void {
  const backdrop = document.querySelector('.emoji-dialog-backdrop');
  if (backdrop) {
    backdrop.classList.remove('emoji-dialog-backdrop--open');
    setTimeout(() => backdrop.remove(), 200);
  }
}

// ── Form handlers ──────────────────────────────────────────────────────────

function submitAddForm(form: HTMLFormElement): void {
  const termInput = form.querySelector<HTMLInputElement>('#add-term')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#add-def')!;
  const categoryInput = form.querySelector<HTMLInputElement>('#add-category')!;
  const emojiInput = form.querySelector<HTMLInputElement>('#add-emoji')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#add-tags')!;
  const sourceInput = form.querySelector<HTMLInputElement>('#add-source')!;

  let valid = true;
  if (!termInput.value.trim()) {
    showError('add-term-error', 'Please enter a word or expression.');
    valid = false;
  } else {
    clearError('add-term-error');
  }
  if (!defInput.value.trim()) {
    showError('add-def-error', 'Please enter a description.');
    valid = false;
  } else {
    clearError('add-def-error');
  }
  if (!valid) return;

  addWord(
    termInput.value,
    defInput.value,
    categoryInput.value,
    emojiInput.value,
    parseTags(tagsInput.value),
    sourceInput.value,
  );
  navigate('hub');
}

function submitEditForm(form: HTMLFormElement, wordId: string): void {
  const termInput = form.querySelector<HTMLInputElement>('#edit-term')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#edit-def')!;
  const categoryInput = form.querySelector<HTMLInputElement>('#edit-category')!;
  const emojiInput = form.querySelector<HTMLInputElement>('#edit-emoji')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#edit-tags')!;
  const sourceInput = form.querySelector<HTMLInputElement>('#edit-source')!;

  let valid = true;
  if (!termInput.value.trim()) {
    showError('edit-term-error', 'Please enter a word or expression.');
    valid = false;
  } else {
    clearError('edit-term-error');
  }
  if (!defInput.value.trim()) {
    showError('edit-def-error', 'Please enter a description.');
    valid = false;
  } else {
    clearError('edit-def-error');
  }
  if (!valid) return;

  updateWord(
    wordId,
    termInput.value,
    defInput.value,
    categoryInput.value,
    emojiInput.value,
    parseTags(tagsInput.value),
    sourceInput.value,
  );
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
