import type { Word, AppState } from './types';
import {
  getAllWords,
  addWord,
  updateWord,
  deleteWord,
  searchWords,
  getWord,
  getCategories,
  getSources,
  getAllLinkedWordSuggestions,
} from './storage';
import { createIcons,
  ArrowLeft, Plus, Search, Pencil, Trash2, ChevronRight, BookOpen,
  FileText, Calendar, Link2, Clock, X, Layers, ChevronUp, SlidersHorizontal,
  ChevronDown, FolderPlus,
} from 'lucide';

// ── Icon registry for createIcons (UI only) ──────────────────────────────
const ICON_REGISTRY = {
  ArrowLeft, Plus, Search, Pencil, Trash2, ChevronRight, BookOpen,
  FileText, Calendar, Link2, Clock, X, Layers, ChevronUp, SlidersHorizontal,
  ChevronDown, FolderPlus,
};

// ── Curated emoji picks for word personalisation ─────────────────────────
const EMOJI_PICKS = [
  '📖','🧠','💡','🔑','🌍','🎯','✨','🔬','🎨','🎭',
  '🌱','⚡','🔥','💎','🌊','🦋','🏆','🧩','🌀','💫',
  '🗺️','📝','🔭','⚗️','🎵','🌙','☀️','❄️','🌿','🦉',
  '💬','🫀','🪐','🧬','📐','🎲','🔮','🍀','🕊️','🧿',
];

// ── Custom emoji persistence ────────────────────────────────────────────────
const CUSTOM_EMOJI_KEY = 'ponderhub_custom_emojis';

function getCustomEmojis(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EMOJI_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addCustomEmoji(emoji: string): void {
  const emojis = getCustomEmojis();
  if (!emojis.includes(emoji)) {
    emojis.unshift(emoji);
    localStorage.setItem(CUSTOM_EMOJI_KEY, JSON.stringify(emojis));
  }
}

// ── State ──────────────────────────────────────────────────────────────────
const state: AppState = {
  currentView: 'hub',
  selectedWordId: null,
  searchQuery: '',
  filterCategory: '',
  filterSource: '',
};

/** The emoji currently chosen in the add/edit form */
let formEmojiValue = '';

// ── Memo state ────────────────────────────────────────────────────────────
let memoWord: Word | null = null;
let memoShowField: 'meaning' | 'description' = 'meaning';
let memoRevealed = false;

function pickNextMemoWord(): void {
  const words = getAllWords();
  if (words.length === 0) { memoWord = null; return; }
  let next: Word;
  if (words.length === 1) {
    next = words[0];
  } else {
    do { next = words[Math.floor(Math.random() * words.length)]; }
    while (next.id === memoWord?.id);
  }
  memoWord = next;
  memoRevealed = false;
  memoShowField = (next.definition && Math.random() >= 0.6) ? 'description' : 'meaning';
}

function randomEmoji(): string {
  return EMOJI_PICKS[Math.floor(Math.random() * EMOJI_PICKS.length)];
}

// Multi-color gradient pairs for vibrant blobs
const BLOB_GRADIENTS = [
  ['#ff6bd6', '#ffbd59'],           // pink → yellow
  ['#cb5cff', '#ff6bd6'],            // purple → pink
  ['#00e5ff', '#76ff7a'],           // cyan → green
  ['#ff6b6b', '#ffbd59'],           // coral → amber
  ['#536dfe', '#00e5ff'],           // indigo → cyan
  ['#e040fb', '#7c4dff'],           // magenta → violet
  ['#00e5ff', '#69f0ae'],           // cyan → mint
  ['#ffab40', '#ff6e40', '#ff3d71'],// orange → red-pink
  ['#76ff7a', '#00e5ff', '#536dfe'],// green → cyan → indigo
  ['#ff6bd6', '#cb5cff', '#536dfe'], // pink → purple → indigo
];

// Non-overlapping zones for blob placement
const BLOB_ZONES = [
  { x: -10, y: -10 },  // top-left
  { x: 55, y: -10 },   // top-right
  { x: -10, y: 65 },   // bottom-left
  { x: 55, y: 65 },    // bottom-right
  { x: 20, y: 25 },    // center
];

const MEMO_BLOB_COUNT = 3;

/** Builds placeholder blob elements (styles applied separately via applyBlobStyles) */
function buildMemoBlobs(): string {
  let html = '';
  for (let i = 0; i < MEMO_BLOB_COUNT; i++) {
    html += `<span class="memo-blob" id="memo-blob-${i}" aria-hidden="true"></span>`;
  }
  return html;
}

/** Apply randomized styles to existing blob elements. If animate=true, transitions are used. */
function applyBlobStyles(animate: boolean): void {
  const shuffled = [...BLOB_ZONES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < MEMO_BLOB_COUNT; i++) {
    const el = document.getElementById(`memo-blob-${i}`);
    if (!el) continue;

    const grad = BLOB_GRADIENTS[Math.floor(Math.random() * BLOB_GRADIENTS.length)];
    const angle = Math.floor(Math.random() * 360);
    const stops = grad.map((c, idx) =>
      `${c} ${Math.round((idx / (grad.length - 1)) * 100)}%`
    ).join(', ');

    const size = 220 + Math.floor(Math.random() * 230); // 220-450px
    const zone = shuffled[i];
    const x = zone.x + Math.floor(Math.random() * 16 - 8);
    const y = zone.y + Math.floor(Math.random() * 16 - 8);

    const r = () => 30 + Math.floor(Math.random() * 45);
    const borderRadius = `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
    const rotate = Math.floor(Math.random() * 360);

    if (animate) {
      el.style.transition = 'width 1.2s ease, height 1.2s ease, left 1.2s ease, top 1.2s ease, border-radius 1.2s ease, transform 1.2s ease';
    } else {
      el.style.transition = 'none';
    }

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.background = `linear-gradient(${angle}deg, ${stops})`;
    el.style.borderRadius = borderRadius;
    el.style.transform = `rotate(${rotate}deg)`;
  }
}

/** Debounce timer for source suggestions */
let sourceDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function navigate(view: AppState['currentView'], wordId?: string): void {
  const prev = state.currentView;
  state.currentView = view;
  state.selectedWordId = wordId ?? null;
  if (view === 'hub') { state.searchQuery = ''; state.filterCategory = ''; state.filterSource = ''; }
  if (view === 'add') formEmojiValue = '';
  if (view === 'memo' && !memoWord) pickNextMemoWord();
  // Push browser history so Android back button / browser back works
  const historyState = { view, wordId: wordId ?? null };
  if (prev === view && view === 'hub') {
    // Avoid stacking hub entries
    history.replaceState(historyState, '');
  } else {
    history.pushState(historyState, '');
  }
  render();
}

/** Close any open overlay (emoji picker, dropdowns). Returns true if something was closed. */
function closeOpenOverlays(): boolean {
  let closed = false;
  // Emoji picker
  const emojiBackdrop = document.querySelector('.emoji-dialog-backdrop--open');
  if (emojiBackdrop) {
    emojiBackdrop.classList.remove('emoji-dialog-backdrop--open');
    closed = true;
  }
  // Category dropdown
  const catDropdown = document.querySelector('.cat-dropdown--open');
  if (catDropdown) {
    catDropdown.classList.remove('cat-dropdown--open');
    closed = true;
  }
  // Filter dropdown
  const filterDropdown = document.querySelector('.filter-dropdown--open');
  if (filterDropdown) {
    filterDropdown.classList.remove('filter-dropdown--open');
    closed = true;
  }
  return closed;
}

/** Shared back-button logic: close overlay → navigate back → exit app.
 *  Returns true if the event was consumed (do NOT exit). */
function handleBack(): boolean {
  // 1. Close any open overlay without navigating
  if (closeOpenOverlays()) return true;

  // 2. Navigate back if we're not on the hub
  if (state.currentView !== 'hub') {
    navigate('hub');
    return true;
  }

  // 3. At root — let the caller decide (exit app / default behaviour)
  return false;
}

/** Handle browser back button / Android back gesture */
export function initHistoryNavigation(): void {
  // Set initial state
  history.replaceState({ view: state.currentView, wordId: state.selectedWordId }, '');

  // ── Browser / PWA popstate fallback ──
  window.addEventListener('popstate', (e) => {
    if (closeOpenOverlays()) {
      history.pushState({ view: state.currentView, wordId: state.selectedWordId }, '');
      return;
    }

    if (e.state && e.state.view) {
      state.currentView = e.state.view;
      state.selectedWordId = e.state.wordId ?? null;
      if (e.state.view === 'hub') { state.searchQuery = ''; state.filterCategory = ''; state.filterSource = ''; }
      render();
      return;
    }
  });

  // ── Capacitor Android hardware back button ──
  initCapacitorBackButton();
}

async function initCapacitorBackButton(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if (!handleBack()) {
        // At root with nothing to close — exit the app
        App.exitApp();
      }
    });
  } catch {
    // Not running in Capacitor — popstate handler above covers the browser
  }
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
  const customEmojis = getCustomEmojis();
  const customItems = customEmojis.map(
    (em) =>
      `<button type="button" class="dialog-emoji-btn ${currentValue === em ? 'dialog-emoji-btn--selected' : ''}"
         data-action="select-emoji" data-emoji="${em}" data-target="${targetId}"
         aria-label="${em}">${em}</button>`,
  ).join('');

  const defaultItems = EMOJI_PICKS.map(
    (em) =>
      `<button type="button" class="dialog-emoji-btn ${currentValue === em ? 'dialog-emoji-btn--selected' : ''}"
         data-action="select-emoji" data-emoji="${em}" data-target="${targetId}"
         aria-label="${em}">${em}</button>`,
  ).join('');

  const addBtn = `<button type="button" class="dialog-emoji-btn dialog-emoji-btn--add"
    data-action="focus-custom-emoji" aria-label="Add custom emoji">+</button>`;

  return `
    <div class="emoji-dialog-backdrop" data-action="close-emoji-picker">
      <div class="emoji-dialog" role="dialog" aria-label="Choose an emoji">
        <div class="emoji-dialog__header">
          <span class="emoji-dialog__title">Choose Emoji</span>
          <button type="button" class="emoji-dialog__close" data-action="close-emoji-picker" aria-label="Close">
            ${icon('x', '', 20)}
          </button>
        </div>
        <div class="emoji-dialog__grid">${customItems}${defaultItems}${addBtn}</div>
        <div class="emoji-dialog__custom">
          <input class="emoji-dialog__input" type="text" placeholder="Type / paste emoji to add…"
            data-target="${targetId}" maxlength="10" autocomplete="off" />
          <button type="button" class="emoji-dialog__use-btn" data-action="use-custom-emoji" data-target="${targetId}">Add</button>
        </div>
      </div>
    </div>`;
}

function renderCategoryField(prefix: string, value = ''): string {
  const cats = getCategories();
  const options = cats.map(
    (c) =>
      `<button type="button" class="cat-dropdown__item ${value === c ? 'cat-dropdown__item--selected' : ''}"
         data-action="pick-category" data-category="${escapeHtml(c)}" data-target="${prefix}-category">
        <span>${escapeHtml(c)}</span>
        ${value === c ? icon('chevron-right', '', 14) : ''}
      </button>`,
  ).join('');
  return `
    <div class="form-group">
      <label class="form-label">
        Category <span class="hint">(optional)</span>
      </label>
      <input id="${prefix}-category" type="hidden" name="category" value="${escapeHtml(value)}" />
      <div class="cat-dropdown" id="${prefix}-cat-dropdown">
        <button type="button" class="cat-dropdown__trigger" data-action="toggle-cat-dropdown" data-target="${prefix}-cat-dropdown">
          <span class="cat-dropdown__value">${value ? escapeHtml(value) : 'Select a category…'}</span>
          ${icon('chevron-down', 'cat-dropdown__arrow', 16)}
        </button>
        <div class="cat-dropdown__menu">
          ${cats.length ? `<div class="cat-dropdown__items">${options}</div>` : '<div class="cat-dropdown__empty">No categories yet</div>'}
          <button type="button" class="cat-dropdown__add-btn" data-action="show-cat-input" data-target="${prefix}-cat-dropdown">
            ${icon('folder-plus', '', 16)}
            <span>Add new category</span>
          </button>
          <div class="cat-dropdown__new-input" style="display:none">
            <input class="form-input cat-dropdown__input" type="text" placeholder="New category name…" autocomplete="off" />
            <button type="button" class="cat-dropdown__confirm-btn" data-action="confirm-new-cat" data-target="${prefix}-category">Add</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderSourceField(prefix: string, value = ''): string {
  return `
    <div class="form-group">
      <label class="form-label" for="${prefix}-source">
        Source <span class="hint">(where you learned it)</span>
      </label>
      <div class="source-field" id="${prefix}-source-wrap">
        <input id="${prefix}-source" class="form-input" type="text" name="source"
          placeholder="e.g. Book, podcast, conversation…"
          value="${escapeHtml(value)}"
          autocomplete="off" />
        <div class="source-suggestions" id="${prefix}-source-suggestions"></div>
      </div>
    </div>`;
}

function renderLinkedWordsField(prefix: string, linkedWords: string[] = []): string {
  const chips = linkedWords.map(
    (lw) => `<span class="linked-chip" data-value="${escapeHtml(lw)}">${escapeHtml(lw)} <button type="button" class="linked-chip__remove" data-action="remove-linked-word" data-target="${prefix}-linked" data-value="${escapeHtml(lw)}" aria-label="Remove">&times;</button></span>`,
  ).join('');
  return `
    <div class="form-group">
      <label class="form-label">
        Linked Words <span class="hint">(synonyms, related)</span>
      </label>
      <input id="${prefix}-linked-hidden" type="hidden" name="linkedWords" value="${escapeHtml(linkedWords.join(','))}" />
      <div class="linked-words-field" id="${prefix}-linked">
        <div class="linked-chips" id="${prefix}-linked-chips">${chips}</div>
        <div class="linked-input-wrap">
          <input id="${prefix}-linked-input" class="form-input" type="text"
            placeholder="Type to search or add…" autocomplete="off" />
          <div class="linked-suggestions" id="${prefix}-linked-suggestions"></div>
        </div>
      </div>
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
        <p class="word-card__preview">${escapeHtml((w.meaning || w.definition).slice(0, 80))}${(w.meaning || w.definition).length > 80 ? '…' : ''}</p>
        ${meta ? `<div class="word-card__meta">${meta}</div>` : ''}
      </div>
      <span class="word-card__arrow" aria-hidden="true">${icon('chevron-right', '', 18)}</span>
    </li>`;
}

function buildHubView(): string {
  const q = state.searchQuery;
  let allWords = q ? searchWords(q) : getAllWords();

  // Apply filters
  if (state.filterCategory) {
    allWords = allWords.filter((w) => w.category === state.filterCategory);
  }
  if (state.filterSource) {
    allWords = allWords.filter((w) => w.source === state.filterSource);
  }

  const words = allWords.sort((a, b) =>
    a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
  );

  const hasFilters = !!(state.filterCategory || state.filterSource);
  const hasAny = q || hasFilters;

  const listHtml = words.length === 0
    ? (hasAny
      ? `<p class="no-results">No words found${q ? ` for "<em>${escapeHtml(q)}</em>"` : ''}${hasFilters ? ' with current filters' : ''}.</p>`
      : `<div class="empty-state">
          <div class="empty-icon">${icon('book-open', '', 48)}</div>
          <p class="empty-msg">Your personal encyclopedia is empty.<br>
            Tap the button above to add your first word!</p>
        </div>`)
    : `<ul class="word-list" role="list">${words.map(buildWordCardHtml).join('')}</ul>`;

  // Build filter dropdown
  const categories = getCategories();
  const sources = getSources();
  const filterActive = hasFilters;

  const filterDropdown = `
    <div class="filter-dropdown" id="filter-dropdown">
      <button class="filter-toggle ${filterActive ? 'filter-toggle--active' : ''}" data-action="toggle-filter" aria-label="Filter">
        ${icon('sliders-horizontal', '', 18)}
      </button>
      <div class="filter-dropdown__menu" id="filter-menu">
        <div class="filter-dropdown__section">
          <div class="filter-dropdown__label">Category</div>
          <div class="filter-dropdown__options">
            <button type="button" class="filter-option ${!state.filterCategory ? 'filter-option--active' : ''}"
              data-action="set-filter-category" data-value="">All</button>
            ${categories.map((c) => `<button type="button" class="filter-option ${state.filterCategory === c ? 'filter-option--active' : ''}"
              data-action="set-filter-category" data-value="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
          </div>
        </div>
        <div class="filter-dropdown__section">
          <div class="filter-dropdown__label">Source</div>
          <div class="filter-dropdown__options">
            <button type="button" class="filter-option ${!state.filterSource ? 'filter-option--active' : ''}"
              data-action="set-filter-source" data-value="">All</button>
            ${sources.map((s) => `<button type="button" class="filter-option ${state.filterSource === s ? 'filter-option--active' : ''}"
              data-action="set-filter-source" data-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  // Active filter chips
  const activeFilters = [];
  if (state.filterCategory) activeFilters.push(`<span class="active-filter" data-action="clear-filter-category">${escapeHtml(state.filterCategory)} ${icon('x', '', 12)}</span>`);
  if (state.filterSource) activeFilters.push(`<span class="active-filter" data-action="clear-filter-source">${escapeHtml(state.filterSource)} ${icon('x', '', 12)}</span>`);

  return `
    <section class="view" id="view-hub">
      <div class="hub-toolbar">
        <div class="search-bar">
          <span class="search-bar__icon" aria-hidden="true">${icon('search', '', 18)}</span>
          <input id="search-input" class="search-bar__input" type="search"
            placeholder="Search words…"
            value="${escapeHtml(q)}" autocomplete="off" aria-label="Search your hub" />
        </div>
        ${filterDropdown}
        <button class="btn-add" data-action="goto-add" aria-label="Add a word">
          ${icon('plus', '', 22)}
        </button>
      </div>
      ${activeFilters.length ? `<div class="active-filters">${activeFilters.join('')}</div>` : ''}
      ${!hasAny && words.length > 0 ? `<div class="hub-count">${words.length} word${words.length !== 1 ? 's' : ''}</div>` : ''}
      ${hasFilters && words.length > 0 ? `<div class="hub-count">${words.length} result${words.length !== 1 ? 's' : ''}</div>` : ''}
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
      <form class="word-form" novalidate>
        ${renderEmojiField('add', formEmojiValue)}
        <div class="form-group">
          <label class="form-label" for="add-term">Word / Expression</label>
          <input id="add-term" class="form-input" type="text" name="term"
            placeholder="e.g. Epistemology" autocomplete="off" />
          <span class="form-error" id="add-term-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-meaning">Meaning</label>
          <textarea id="add-meaning" class="form-textarea" name="meaning"
            placeholder="What does this word mean?" rows="3"></textarea>
          <span class="form-error" id="add-meaning-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-def">General Description <span class="hint">(optional)</span></label>
          <textarea id="add-def" class="form-textarea" name="definition"
            placeholder="Add extra context, personal notes…" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="add-example">Example <span class="hint">(optional)</span></label>
          <textarea id="add-example" class="form-textarea" name="example"
            placeholder="e.g. &quot;His epistemology was rooted in empiricism.&quot;" rows="2"></textarea>
        </div>
        ${renderSourceField('add')}
        ${renderCategoryField('add')}
        <div class="form-group">
          <label class="form-label" for="add-tags">Tags <span class="hint">(comma separated)</span></label>
          <input id="add-tags" class="form-input" type="text" name="tags"
            placeholder="e.g. philosophy, knowledge" autocomplete="off" />
        </div>
        ${renderLinkedWordsField('add')}
        <button type="button" class="btn btn-primary btn-full" data-action="submit-add">Save Word</button>
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
      ${word.meaning ? `
        <div class="detail__section">
          <h3 class="detail__section-label">Meaning</h3>
          <div class="detail__definition">${escapeHtml(word.meaning).replace(/\n/g, '<br>')}</div>
        </div>` : ''}
      ${word.definition ? `
        <div class="detail__section">
          <h3 class="detail__section-label">General Description</h3>
          <div class="detail__definition">${escapeHtml(word.definition).replace(/\n/g, '<br>')}</div>
        </div>` : ''}
      ${word.example ? `
        <div class="detail__section">
          <h3 class="detail__section-label">Example</h3>
          <div class="detail__example">"${escapeHtml(word.example)}"</div>
        </div>` : ''}
      ${word.linkedWords.length ? `
        <div class="detail__section">
          <h3 class="detail__section-label">Linked Words</h3>
          <div class="detail__linked-words">${word.linkedWords.map((lw) => {
            const linked = getAllWords().find((w) => w.term.toLowerCase() === lw.toLowerCase());
            return linked
              ? `<span class="linked-word-chip linked-word-chip--link" data-action="goto-detail" data-id="${escapeHtml(linked.id)}">${escapeHtml(lw)}</span>`
              : `<span class="linked-word-chip">${escapeHtml(lw)}</span>`;
          }).join('')}</div>
        </div>` : ''}
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
      <form class="word-form" novalidate>
        ${renderEmojiField('edit', formEmojiValue)}
        <div class="form-group">
          <label class="form-label">Word / Expression</label>
          <input id="edit-term" type="hidden" name="term" value="${escapeHtml(word.term)}" />
          <div class="form-input form-input--readonly" data-action="goto-detail" data-id="${escapeHtml(word.id)}" tabindex="0">
            ${escapeHtml(word.term)}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-meaning">Meaning</label>
          <textarea id="edit-meaning" class="form-textarea" name="meaning" rows="3">${escapeHtml(word.meaning)}</textarea>
          <span class="form-error" id="edit-meaning-error" aria-live="polite"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-def">General Description <span class="hint">(optional)</span></label>
          <textarea id="edit-def" class="form-textarea" name="definition" rows="4">${escapeHtml(word.definition)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-example">Example <span class="hint">(optional)</span></label>
          <textarea id="edit-example" class="form-textarea" name="example" rows="2">${escapeHtml(word.example)}</textarea>
        </div>
        ${renderSourceField('edit', word.source)}
        ${renderCategoryField('edit', word.category)}
        <div class="form-group">
          <label class="form-label" for="edit-tags">Tags <span class="hint">(comma separated)</span></label>
          <input id="edit-tags" class="form-input" type="text" name="tags"
            value="${escapeHtml(word.tags.join(', '))}" />
        </div>
        ${renderLinkedWordsField('edit', word.linkedWords)}
        <button type="button" class="btn btn-primary btn-full" data-action="submit-edit" data-id="${escapeHtml(word.id)}">Update Word</button>
      </form>
    </section>`;
}

function buildMemoView(): string {
  if (!memoWord) {
    return `
      <section class="view memo-view" id="view-memo">
        <div class="memo-empty">
          <div class="memo-empty__icon">📇</div>
          <p>No cards to review yet.</p>
          <p>Add some words in the Hub first!</p>
        </div>
      </section>`;
  }

  const clueText = memoShowField === 'meaning' ? memoWord.meaning : memoWord.definition;
  const clueLabel = memoShowField === 'meaning' ? 'Meaning' : 'Description';
  const emojiDisplay = memoWord.emoji || '📄';

  // Random background blobs per card
  const blobs = buildMemoBlobs();

  return `
    <section class="view memo-view" id="view-memo">
      <div class="memo-stage" id="memo-stage">
        ${blobs}
        <div class="memo-reveal" id="memo-reveal">
          <span class="memo-reveal__emoji">${emojiDisplay}</span>
          <span class="memo-reveal__term">${escapeHtml(memoWord.term)}</span>
          ${memoWord.example ? `<span class="memo-reveal__example">"${escapeHtml(memoWord.example)}"</span>` : ''}
          <span class="memo-reveal__hint">↑ swipe up for next</span>
        </div>
        <div class="memo-card" id="memo-card">
          ${memoWord.category ? `<span class="memo-card__category">${escapeHtml(memoWord.category)}</span>` : ''}
          <span class="memo-card__type">${clueLabel}</span>
          <p class="memo-card__text">${escapeHtml(clueText)}</p>
          <span class="memo-card__hint">← swipe to reveal word →</span>
          <span class="memo-card__chevron">${icon('chevron-up', '', 20)}</span>
        </div>
      </div>
    </section>`;
}

function buildBottomNav(): string {
  const isHub = state.currentView === 'hub';
  const isMemo = state.currentView === 'memo';
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      <button class="nav-tab ${isHub ? 'nav-tab--active' : ''}" data-action="nav-hub" aria-label="Hub">
        ${icon('book-open', '', 22)}
        <span>Hub</span>
      </button>
      <button class="nav-tab ${isMemo ? 'nav-tab--active' : ''}" data-action="nav-memo" aria-label="Card Memo">
        ${icon('layers', '', 22)}
        <span>Memo</span>
      </button>
    </nav>`;
}

// ── Memo touch gestures ───────────────────────────────────────────────────

function attachMemoTouchHandlers(): void {
  const stage = document.getElementById('memo-stage');
  if (!stage) return;

  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  let dir: 'x' | 'y' | null = null;

  stage.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dx = 0; dy = 0; dir = null;

    const card = document.getElementById('memo-card');
    if (card) card.style.transition = 'none';
    const reveal = document.getElementById('memo-reveal');
    if (reveal && memoRevealed) reveal.style.transition = 'none';
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    dx = t.clientX - startX;
    dy = t.clientY - startY;

    if (!dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (!dir) return;
    e.preventDefault();

    if (!memoRevealed && dir === 'x') {
      const card = document.getElementById('memo-card');
      if (card) {
        const rot = dx * 0.06;
        card.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
        card.style.opacity = `${Math.max(0.2, 1 - Math.abs(dx) / 300)}`;
      }
    } else if (dir === 'y' && dy < 0) {
      const el = memoRevealed
        ? document.getElementById('memo-reveal')
        : document.getElementById('memo-card');
      if (el) {
        el.style.transform = `translateY(${dy}px)`;
        el.style.opacity = `${Math.max(0.2, 1 + dy / 250)}`;
      }
    }
  }, { passive: false });

  stage.addEventListener('touchend', () => {
    const card = document.getElementById('memo-card');
    const reveal = document.getElementById('memo-reveal');
    const ease = 'transform .3s ease, opacity .3s ease';

    if (!memoRevealed && dir === 'x' && Math.abs(dx) > 80) {
      // Reveal word — slide card off
      if (card) {
        card.style.transition = ease;
        const exitX = dx > 0 ? 400 : -400;
        card.style.transform = `translateX(${exitX}px) rotate(${exitX * 0.06}deg)`;
        card.style.opacity = '0';
      }
      memoRevealed = true;
      if (reveal) {
        reveal.style.transition = 'opacity .3s ease .15s';
        reveal.style.opacity = '1';
      }
    } else if (dir === 'y' && dy < -80) {
      // Next card — slide up, then morph blobs & update card content
      const el = memoRevealed ? reveal : card;
      if (el) {
        el.style.transition = ease;
        el.style.transform = 'translateY(-500px)';
        el.style.opacity = '0';
      }
      // Start blob morph immediately while card slides out
      applyBlobStyles(true);
      setTimeout(() => {
        pickNextMemoWord();
        if (!memoWord) { render(); return; }
        // Update card content in-place
        const clueText = memoShowField === 'meaning' ? memoWord.meaning : memoWord.definition;
        const clueLabel = memoShowField === 'meaning' ? 'Meaning' : 'Description';
        const emojiDisplay = memoWord.emoji || '📄';
        const typeEl = document.querySelector('.memo-card__type');
        const textEl = document.querySelector('.memo-card__text');
        const catEl = document.querySelector('.memo-card__category');
        const revealEmoji = document.querySelector('.memo-reveal__emoji');
        const revealTerm = document.querySelector('.memo-reveal__term');
        const revealExample = document.querySelector('.memo-reveal__example');
        if (typeEl) typeEl.textContent = clueLabel;
        if (textEl) textEl.textContent = clueText;
        if (catEl) {
          if (memoWord.category) {
            catEl.textContent = memoWord.category;
            (catEl as HTMLElement).style.display = '';
          } else {
            (catEl as HTMLElement).style.display = 'none';
          }
        }
        if (revealEmoji) revealEmoji.textContent = emojiDisplay;
        if (revealTerm) revealTerm.textContent = memoWord.term;
        if (revealExample) {
          if (memoWord.example) {
            revealExample.textContent = `"${memoWord.example}"`;
            (revealExample as HTMLElement).style.display = '';
          } else {
            (revealExample as HTMLElement).style.display = 'none';
          }
        }
        // Reset card position
        if (card) {
          card.style.transition = 'none';
          card.style.transform = 'translateY(500px)';
          card.style.opacity = '0';
          void card.offsetHeight; // force reflow
          card.style.transition = ease;
          card.style.transform = 'translateX(0) rotate(0deg)';
          card.style.opacity = '1';
        }
        // Reset reveal
        if (reveal) {
          reveal.style.transition = 'none';
          reveal.style.opacity = '0';
          reveal.style.transform = 'translateY(0)';
        }
      }, 300);
    } else {
      // Snap back
      if (!memoRevealed && card) {
        card.style.transition = ease;
        card.style.transform = 'translateX(0) rotate(0deg)';
        card.style.opacity = '1';
      }
      if (memoRevealed && reveal && dir === 'y') {
        reveal.style.transition = ease;
        reveal.style.transform = 'translateY(0)';
        reveal.style.opacity = '1';
      }
    }
  });
}

// ── Main render ────────────────────────────────────────────────────────────

export function render(): void {
  const app = document.getElementById('app')!;

  let mainContent = '';
  if (state.currentView === 'hub') {
    mainContent = buildHubView();
  } else if (state.currentView === 'memo') {
    mainContent = buildMemoView();
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

  const showNav = state.currentView === 'hub' || state.currentView === 'memo';

  app.innerHTML = `
    <div class="shell">
      <main class="main-content${showNav ? '' : ' main-content--full'}" id="main-content" role="main">
        ${mainContent}
      </main>
      ${showNav ? buildBottomNav() : ''}
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
      let results = q ? searchWords(q) : getAllWords();
      if (state.filterCategory) results = results.filter((w) => w.category === state.filterCategory);
      if (state.filterSource) results = results.filter((w) => w.source === state.filterSource);
      const sorted = results.sort((a, b) =>
        a.term.toLowerCase().localeCompare(b.term.toLowerCase()),
      );

      const hasFilters = !!(state.filterCategory || state.filterSource);
      if (sorted.length === 0) {
        resultsEl.innerHTML = (q || hasFilters)
          ? `<p class="no-results">No words found${q ? ` for "<em>${escapeHtml(q)}</em>"` : ''}${hasFilters ? ' with current filters' : ''}.</p>`
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
        countEl.textContent = (q && !hasFilters) ? '' : `${sorted.length} result${sorted.length !== 1 ? 's' : ''}`;
      }
      createIcons({ icons: ICON_REGISTRY });
    });
  }

  // Source suggestion with debounce
  document.querySelectorAll<HTMLInputElement>('[id$="-source"]').forEach((sourceInput) => {
    if (!sourceInput.id.endsWith('-source')) return;
    sourceInput.addEventListener('input', () => {
      if (sourceDebounceTimer) clearTimeout(sourceDebounceTimer);
      const wrap = sourceInput.closest('.source-field');
      const suggestionsEl = wrap?.querySelector('.source-suggestions') as HTMLElement | null;
      if (!suggestionsEl) return;

      const val = sourceInput.value.trim().toLowerCase();
      if (val.length < 2) {
        suggestionsEl.innerHTML = '';
        return;
      }

      sourceDebounceTimer = setTimeout(() => {
        const allSources = getSources();
        const matches = allSources.filter((s) =>
          s.toLowerCase().includes(val) && s.toLowerCase() !== val,
        );
        if (matches.length === 0) {
          suggestionsEl.innerHTML = '';
          return;
        }
        suggestionsEl.innerHTML = matches.map((s) =>
          `<button type="button" class="source-suggestion" data-action="pick-source" data-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`,
        ).join('');
        createIcons({ icons: ICON_REGISTRY });
      }, 300);
    });

    // Hide suggestions on blur (delayed to allow click)
    sourceInput.addEventListener('blur', () => {
      setTimeout(() => {
        const suggestionsEl = sourceInput.closest('.source-field')?.querySelector('.source-suggestions') as HTMLElement | null;
        if (suggestionsEl) suggestionsEl.innerHTML = '';
      }, 200);
    });
  });

  // Linked words input — suggestions + enter-to-add
  document.querySelectorAll<HTMLInputElement>('[id$="-linked-input"]').forEach((input) => {
    const fieldId = input.id.replace('-input', '');
    const hiddenInput = document.getElementById(`${fieldId}-hidden`) as HTMLInputElement | null;
    const chipsEl = document.getElementById(`${fieldId}-chips`);
    const suggestionsEl = document.getElementById(`${fieldId}-suggestions`);
    if (!hiddenInput || !chipsEl || !suggestionsEl) return;

    function getCurrentLinked(): string[] {
      return hiddenInput!.value ? hiddenInput!.value.split(',').filter(Boolean) : [];
    }

    function addLinkedWord(word: string): void {
      const trimmed = word.trim();
      if (!trimmed) return;
      const current = getCurrentLinked();
      if (current.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;
      current.push(trimmed);
      hiddenInput!.value = current.join(',');
      const chip = document.createElement('span');
      chip.className = 'linked-chip';
      chip.dataset.value = trimmed;
      chip.innerHTML = `${escapeHtml(trimmed)} <button type="button" class="linked-chip__remove" data-action="remove-linked-word" data-target="${fieldId}" data-value="${escapeHtml(trimmed)}" aria-label="Remove">&times;</button>`;
      chipsEl!.appendChild(chip);
      input.value = '';
      suggestionsEl!.innerHTML = '';
    }

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (val.length < 1) { suggestionsEl!.innerHTML = ''; return; }
      const current = getCurrentLinked();
      const allSuggestions = getAllLinkedWordSuggestions();
      const matches = allSuggestions.filter((s) =>
        s.toLowerCase().includes(val) && !current.some((c) => c.toLowerCase() === s.toLowerCase()),
      ).slice(0, 6);
      suggestionsEl!.innerHTML = matches.map((s) =>
        `<button type="button" class="linked-suggestion" data-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`,
      ).join('');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addLinkedWord(input.value);
      }
    });

    suggestionsEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.linked-suggestion') as HTMLElement | null;
      if (btn) addLinkedWord(btn.dataset.value || '');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => { suggestionsEl!.innerHTML = ''; }, 200);
    });
  });

  // Click / keyboard delegation
  app.addEventListener('click', handleAction);
  app.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      handleAction(e as unknown as MouseEvent);
    }
  });

  // Memo card touch gestures + initial blob styles
  if (state.currentView === 'memo') {
    applyBlobStyles(false);
    attachMemoTouchHandlers();
  }

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
    case 'nav-hub':
      navigate('hub');
      break;
    case 'nav-memo':
      navigate('memo');
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
    case 'toggle-cat-dropdown': {
      const dropdownId = target.dataset.target;
      if (dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
          dropdown.classList.toggle('cat-dropdown--open');
          // Close on outside click
          if (dropdown.classList.contains('cat-dropdown--open')) {
            setTimeout(() => {
              const closer = (ev: MouseEvent) => {
                if (!dropdown.contains(ev.target as Node)) {
                  dropdown.classList.remove('cat-dropdown--open');
                  document.removeEventListener('click', closer);
                }
              };
              document.addEventListener('click', closer);
            }, 0);
          }
        }
      }
      break;
    }
    case 'pick-category': {
      const cat = target.dataset.category ?? '';
      const targetInputId = target.dataset.target;
      if (targetInputId) {
        const input = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (input) {
          if (input.value === cat) {
            input.value = '';
          } else {
            input.value = cat;
          }
          // Update trigger text
          const dropdown = input.closest('.form-group')?.querySelector('.cat-dropdown');
          const valueSpan = dropdown?.querySelector('.cat-dropdown__value');
          if (valueSpan) valueSpan.textContent = input.value || 'Select a category…';
          // Update selected state
          dropdown?.querySelectorAll<HTMLButtonElement>('.cat-dropdown__item').forEach((c) => {
            c.classList.toggle('cat-dropdown__item--selected', c.dataset.category === input.value);
          });
          // Close dropdown
          dropdown?.classList.remove('cat-dropdown--open');
        }
      }
      break;
    }
    case 'show-cat-input': {
      const dropdownId = target.dataset.target;
      if (dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        const newInput = dropdown?.querySelector('.cat-dropdown__new-input') as HTMLElement;
        const addBtn = dropdown?.querySelector('.cat-dropdown__add-btn') as HTMLElement;
        if (newInput && addBtn) {
          addBtn.style.display = 'none';
          newInput.style.display = 'flex';
          const inp = newInput.querySelector('input');
          if (inp) inp.focus();
        }
      }
      break;
    }
    case 'confirm-new-cat': {
      const targetInputId = target.dataset.target;
      if (targetInputId) {
        const dropdown = target.closest('.cat-dropdown');
        const newInput = dropdown?.querySelector('.cat-dropdown__input') as HTMLInputElement;
        if (newInput && newInput.value.trim()) {
          const newCat = newInput.value.trim();
          const hiddenInput = document.getElementById(targetInputId) as HTMLInputElement;
          if (hiddenInput) {
            hiddenInput.value = newCat;
            const valueSpan = dropdown?.querySelector('.cat-dropdown__value');
            if (valueSpan) valueSpan.textContent = newCat;
          }
          dropdown?.classList.remove('cat-dropdown--open');
        }
      }
      break;
    }
    case 'toggle-filter': {
      const menu = document.getElementById('filter-menu');
      const dropdown = document.getElementById('filter-dropdown');
      if (menu && dropdown) {
        dropdown.classList.toggle('filter-dropdown--open');
        if (dropdown.classList.contains('filter-dropdown--open')) {
          setTimeout(() => {
            const closer = (ev: MouseEvent) => {
              if (!dropdown.contains(ev.target as Node)) {
                dropdown.classList.remove('filter-dropdown--open');
                document.removeEventListener('click', closer);
              }
            };
            document.addEventListener('click', closer);
          }, 0);
        }
      }
      break;
    }
    case 'set-filter-category': {
      state.filterCategory = target.dataset.value ?? '';
      document.getElementById('filter-dropdown')?.classList.remove('filter-dropdown--open');
      render();
      break;
    }
    case 'set-filter-source': {
      state.filterSource = target.dataset.value ?? '';
      document.getElementById('filter-dropdown')?.classList.remove('filter-dropdown--open');
      render();
      break;
    }
    case 'clear-filter-category': {
      state.filterCategory = '';
      render();
      break;
    }
    case 'clear-filter-source': {
      state.filterSource = '';
      render();
      break;
    }
    case 'pick-source': {
      const sourceVal = target.dataset.value ?? '';
      const sourceInput = target.closest('.source-field')?.querySelector('input') as HTMLInputElement;
      if (sourceInput) {
        sourceInput.value = sourceVal;
        const suggestionsEl = target.closest('.source-field')?.querySelector('.source-suggestions') as HTMLElement;
        if (suggestionsEl) suggestionsEl.innerHTML = '';
      }
      break;
    }
    case 'remove-linked-word': {
      const fieldId = target.dataset.target;
      const val = target.dataset.value;
      if (!fieldId || !val) break;
      const hiddenInput = document.getElementById(`${fieldId}-hidden`) as HTMLInputElement | null;
      if (hiddenInput) {
        const current = hiddenInput.value.split(',').filter((w) => w !== val);
        hiddenInput.value = current.join(',');
      }
      const chip = target.closest('.linked-chip');
      if (chip) chip.remove();
      break;
    }
    // select-emoji and close-emoji-picker handled by handleDialogAction (dialog is outside #app)
    case 'submit-add': {
      e.preventDefault();
      const form = target.closest('form') ?? document.querySelector('.word-form');
      if (form) submitAddForm(form as HTMLFormElement);
      break;
    }
    case 'submit-edit': {
      e.preventDefault();
      const form = target.closest('form') ?? document.querySelector('.word-form');
      if (form && id) submitEditForm(form as HTMLFormElement, id);
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
      const emoji = customInput.value.trim();
      addCustomEmoji(emoji);
      applyEmojiSelection(emoji, targetInputId);
      closeEmojiDialog();
    }
  } else if (action === 'focus-custom-emoji') {
    const customInput = backdrop.querySelector<HTMLInputElement>('.emoji-dialog__input');
    if (customInput) {
      customInput.focus();
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
  const meaningInput = form.querySelector<HTMLTextAreaElement>('#add-meaning')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#add-def')!;
  const exampleInput = form.querySelector<HTMLTextAreaElement>('#add-example')!;
  const categoryInput = form.querySelector<HTMLInputElement>('#add-category')!;
  const emojiInput = form.querySelector<HTMLInputElement>('#add-emoji')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#add-tags')!;
  const linkedInput = form.querySelector<HTMLInputElement>('#add-linked-hidden')!;
  const sourceInput = form.querySelector<HTMLInputElement>('#add-source')!;

  let valid = true;
  if (!termInput.value.trim()) {
    showError('add-term-error', 'Please enter a word or expression.');
    valid = false;
  } else {
    clearError('add-term-error');
  }
  if (!meaningInput.value.trim()) {
    showError('add-meaning-error', 'Please enter a meaning.');
    valid = false;
  } else {
    clearError('add-meaning-error');
  }
  if (!valid) return;

  const linkedWords = linkedInput.value ? linkedInput.value.split(',').filter(Boolean) : [];
  addWord(
    termInput.value,
    meaningInput.value,
    defInput.value,
    exampleInput.value,
    categoryInput.value,
    emojiInput.value,
    parseTags(tagsInput.value),
    linkedWords,
    sourceInput.value,
  );
  navigate('hub');
}

function submitEditForm(form: HTMLFormElement, wordId: string): void {
  const termInput = form.querySelector<HTMLInputElement>('#edit-term')!;
  const meaningInput = form.querySelector<HTMLTextAreaElement>('#edit-meaning')!;
  const defInput = form.querySelector<HTMLTextAreaElement>('#edit-def')!;
  const exampleInput = form.querySelector<HTMLTextAreaElement>('#edit-example')!;
  const categoryInput = form.querySelector<HTMLInputElement>('#edit-category')!;
  const emojiInput = form.querySelector<HTMLInputElement>('#edit-emoji')!;
  const tagsInput = form.querySelector<HTMLInputElement>('#edit-tags')!;
  const linkedInput = form.querySelector<HTMLInputElement>('#edit-linked-hidden')!;
  const sourceInput = form.querySelector<HTMLInputElement>('#edit-source')!;

  let valid = true;
  if (!meaningInput.value.trim()) {
    showError('edit-meaning-error', 'Please enter a meaning.');
    valid = false;
  } else {
    clearError('edit-meaning-error');
  }
  if (!valid) return;

  const linkedWords = linkedInput.value ? linkedInput.value.split(',').filter(Boolean) : [];
  updateWord(
    wordId,
    termInput.value,
    meaningInput.value,
    defInput.value,
    exampleInput.value,
    categoryInput.value,
    emojiInput.value,
    parseTags(tagsInput.value),
    linkedWords,
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
