/**
 * app.js — cœur de l'application : chargement de l'index, routeur hash,
 * rendu des vues (home / note / catégorie / tag), palette de commandes,
 * TOC scrollspy, barre de progression, thème et navigation mobile.
 */

import { renderMarkdown, escapeHtml } from './markdown.js';
import { createSearchEngine, highlightTokens } from './search.js';
import { initIngest } from './ingest.js';

const state = {
  index: null,
  entriesById: new Map(),
  catById: new Map(),
  engine: null,
  paletteResults: [],
  paletteActive: 0,
  scrollSpy: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  const view = $('#view');
  view.innerHTML = `<div class="loading"><div class="spinner"></div>Chargement du lab…</div>`;
  try {
    const res = await fetch('content/index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('index.json introuvable');
    const index = await res.json();
    state.index = index;
    for (const c of index.categories) state.catById.set(c.id, c);
    for (const e of index.entries) {
      e.categoryLabel = state.catById.get(e.category)?.label || e.category;
      state.entriesById.set(e.id, e);
    }
    state.engine = createSearchEngine(index.entries);
    buildSidebar();
    initTheme();
    initPalette();
    initTopbar();
    initIngest({ index, refresh: () => location.reload() });
    initProgress();
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    view.innerHTML = `<div class="empty-state"><div class="es-icon">🛑</div>
      <h2>Impossible de charger l'index</h2>
      <p>${escapeHtml(err.message)}. Lance <code>node scripts/build-index.mjs</code> puis sers le dossier via un serveur HTTP.</p></div>`;
    console.error(err);
  }
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function buildSidebar() {
  const nav = $('#nav');
  const groups = state.index.categories.map((cat, i) => {
    const items = state.index.entries.filter((e) => e.category === cat.id);
    if (!items.length) return '';
    return `<section class="nav-group">
      <div class="nav-group-title"><span class="ng-num">${String(i + 1).padStart(2, '0')}</span>${escapeHtml(cat.label)}</div>
      ${items.map((e) => `<a class="nav-item" href="#/note/${e.id}" data-id="${e.id}">${escapeHtml(e.title)}</a>`).join('')}
    </section>`;
  }).join('');
  nav.innerHTML = `<a class="nav-home" href="#/">index</a>${groups}`;
}

function setActiveNav(id) {
  $$('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.id === id));
  $('.nav-home')?.classList.toggle('active', !id);
}

/* ============================================================
   TOPBAR / THEME / MOBILE
   ============================================================ */
function initTopbar() {
  $('#search-btn').addEventListener('click', openPalette);
  $('#search-trigger').addEventListener('click', openPalette);
  const openIngest = () => window.dispatchEvent(new CustomEvent('open-ingest'));
  $('#add-btn-top').addEventListener('click', openIngest);
  $('#add-btn-side')?.addEventListener('click', openIngest);
  $('#hamburger').addEventListener('click', toggleSidebar);
  $('#scrim').addEventListener('click', () => toggleSidebar(false));
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) toggleSidebar(false); });
}

function toggleSidebar(force) {
  const open = typeof force === 'boolean' ? force : !$('#sidebar').classList.contains('open');
  $('#sidebar').classList.toggle('open', open);
  $('#scrim').classList.toggle('open', open);
}

function initTheme() {
  const saved = safeGet('clab-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  $('#theme-btn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    safeSet('clab-theme', cur);
  });
}

function initProgress() {
  const bar = $('#progress');
  const onScroll = () => {
    const el = document.scrollingElement || document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    bar.style.width = max > 0 ? `${(el.scrollTop / max) * 100}%` : '0%';
    if (state.scrollSpy) state.scrollSpy();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   ROUTER
   ============================================================ */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter((p) => p !== '');
  return parts;
}

function route() {
  const parts = parseHash();
  window.scrollTo({ top: 0 });
  state.scrollSpy = null;

  if (!parts.length) return renderHome();
  const [kind, a, b] = parts;
  if (kind === 'note' && a) return renderEntry(decodeURIComponent(a), b ? decodeURIComponent(b) : null);
  if (kind === 'cat' && a) return renderCategory(decodeURIComponent(a));
  if (kind === 'tag' && a) return renderTag(decodeURIComponent(a));
  return renderHome();
}

function setCrumbs(items) {
  $('#crumbs').innerHTML = items.map((it, i) => {
    const sep = i > 0 ? '<span class="sep">/</span>' : '';
    return it.href
      ? `${sep}<a href="${it.href}">${escapeHtml(it.label)}</a>`
      : `${sep}<b>${escapeHtml(it.label)}</b>`;
  }).join('');
}

/* ============================================================
   VUES
   ============================================================ */
function renderHome() {
  setActiveNav(null);
  setCrumbs([{ label: 'index' }]);
  const { stats, categories, entries } = state.index;
  const recent = [...entries].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 8);
  const tagFreq = new Map();
  for (const e of entries) for (const t of e.tags) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 32);
  const counts = new Map(categories.map((c) => [c.id, entries.filter((e) => e.category === c.id).length]));

  $('#view').innerHTML = `
    <header class="home-head">
      <div class="kicker">Cybersécurité offensive · TryHackMe · HTB</div>
      <h1 class="home-title">Manuel de terrain.</h1>
      <p class="home-desc">Cheatsheets par sujet, méthodes offensives et write-ups de box — rangés, indexés et cherchables. Un carnet de pentest tenu au fil des rooms.</p>
      <dl class="factbar">
        <div><dt>notes</dt><dd>${stats.entries}</dd></div>
        <div><dt>sujets</dt><dd>${stats.categories}</dd></div>
        <div><dt>sections</dt><dd>${stats.sections}</dd></div>
        <div><dt>rooms</dt><dd>${stats.rooms}</dd></div>
      </dl>
    </header>

    <section class="block">
      <div class="block-head"><h2>Sommaire</h2><span>${categories.length} sujets</span></div>
      <ol class="index">
        ${categories.map((c, i) => `<li><a class="index-row" href="#/cat/${c.id}">
          <span class="ix-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="ix-label">${escapeHtml(c.label)}</span>
          <span class="ix-desc">${escapeHtml(c.blurb || '')}</span>
          <span class="ix-dots" aria-hidden="true"></span>
          <span class="ix-count">${counts.get(c.id)}</span>
        </a></li>`).join('')}
      </ol>
    </section>

    <section class="block">
      <div class="block-head"><h2>Derniers ajouts</h2><span>maj</span></div>
      <ul class="rows">${recent.map(rowItem).join('')}</ul>
    </section>

    <section class="block">
      <div class="block-head"><h2>Tags</h2><span>${topTags.length}</span></div>
      <div class="tagrow">
        ${topTags.map(([t, n]) => `<a href="#/tag/${encodeURIComponent(t)}">${escapeHtml(t)}<span>${n}</span></a>`).join('')}
      </div>
    </section>

    <footer class="page-foot">
      <span>Cyber Lab — Arthur Jeaugey · mise à jour continue</span>
      <a href="https://github.com/a-jeaugey/cyber-lab" target="_blank" rel="noopener noreferrer">source ↗</a>
    </footer>`;
}

function rowItem(e) {
  const meta = [e.categoryLabel, e.platform, e.difficulty].filter(Boolean).join(' · ');
  return `<li><a class="row" href="#/note/${e.id}">
    <span class="row-title">${escapeHtml(e.title)}</span>
    <span class="row-meta">${escapeHtml(meta)}</span>
    <span class="row-date">${escapeHtml(e.updated || '')}</span>
  </a></li>`;
}

function renderCategory(catId) {
  const cat = state.catById.get(catId);
  if (!cat) return renderHome();
  setActiveNav(null);
  setCrumbs([{ label: 'index', href: '#/' }, { label: cat.label }]);
  const items = state.index.entries.filter((e) => e.category === catId);
  $('#view').innerHTML = `
    <header class="home-head">
      <div class="kicker">Sujet</div>
      <h1 class="home-title">${escapeHtml(cat.label)}</h1>
      <p class="home-desc">${escapeHtml(cat.blurb || '')}</p>
    </header>
    <section class="block">
      <div class="block-head"><h2>Notes</h2><span>${items.length}</span></div>
      <ul class="rows">${items.map(rowItem).join('')}</ul>
    </section>`;
}

function renderTag(tag) {
  setActiveNav(null);
  setCrumbs([{ label: 'index', href: '#/' }, { label: 'tags' }, { label: tag }]);
  const items = state.index.entries.filter((e) => e.tags.includes(tag));
  $('#view').innerHTML = `
    <header class="home-head">
      <div class="kicker">Tag</div>
      <h1 class="home-title">${escapeHtml(tag)}</h1>
      <p class="home-desc">${items.length} note${items.length > 1 ? 's' : ''} associée${items.length > 1 ? 's' : ''}.</p>
    </header>
    <section class="block">
      <ul class="rows">${items.map(rowItem).join('') || `<li class="row-empty">Aucune note pour ce tag.</li>`}</ul>
    </section>`;
}

function renderEntry(id, anchor) {
  const e = state.entriesById.get(id);
  if (!e) { $('#view').innerHTML = emptyState(`Note « ${escapeHtml(id)} » introuvable.`); return; }
  setActiveNav(id);
  setCrumbs([{ label: 'index', href: '#/' }, { label: e.categoryLabel, href: `#/cat/${e.category}` }, { label: e.title }]);

  const order = state.index.entries;
  const i = order.findIndex((x) => x.id === id);
  const prev = order[i - 1];
  const next = order[i + 1];

  const meta = [e.platform, e.difficulty, e.status, e.updated ? `maj ${e.updated}` : '', `${e.wordCount} mots`].filter(Boolean);

  const tocHeadings = e.headings.filter((h) => h.level === 2 || h.level === 3);
  const toc = tocHeadings.length ? `
    <aside class="toc"><div class="toc-title">Sur cette page</div>
      <ol class="toc-list">${tocHeadings.map((h) => `<li><a href="#/note/${e.id}/${h.anchor}" class="toc-link lvl${h.level}" data-anchor="${h.anchor}">${escapeHtml(h.text)}</a></li>`).join('')}</ol>
    </aside>` : '<aside></aside>';

  $('#view').innerHTML = `
    <div class="entry-layout">
      <article class="article">
        <header class="entry-head">
          <div class="kicker">${escapeHtml(e.categoryLabel)}</div>
          <h1>${escapeHtml(e.title)}</h1>
          ${e.summary ? `<p class="entry-summary">${escapeHtml(e.summary)}</p>` : ''}
          <div class="entry-meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>
          ${e.tags.length ? `<div class="entry-tags">${e.tags.map((t) => `<a href="#/tag/${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div>` : ''}
        </header>
        <div class="md">${renderMarkdown(e.body)}</div>
        <nav class="pager">
          ${prev ? `<a class="prev" href="#/note/${prev.id}"><span class="dir">← précédent</span><span class="ttl">${escapeHtml(prev.title)}</span></a>` : '<span></span>'}
          ${next ? `<a class="next" href="#/note/${next.id}"><span class="dir">suivant →</span><span class="ttl">${escapeHtml(next.title)}</span></a>` : '<span></span>'}
        </nav>
      </article>
      ${toc}
    </div>`;

  setupScrollSpy();
  if (anchor) {
    const target = document.getElementById(anchor);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

function emptyState(msg) {
  return `<div class="empty-state"><h2>Introuvable</h2><p>${msg}</p><p><a class="text-btn" href="#/">← retour à l'index</a></p></div>`;
}

/* ============================================================
   SCROLLSPY (TOC)
   ============================================================ */
function setupScrollSpy() {
  const links = $$('.toc-link');
  if (!links.length) { state.scrollSpy = null; return; }
  const heads = links.map((l) => document.getElementById(l.dataset.anchor)).filter(Boolean);
  state.scrollSpy = () => {
    const offset = 120;
    let currentIdx = 0;
    for (let i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top - offset <= 0) currentIdx = i;
    }
    links.forEach((l, i) => l.classList.toggle('active', i === currentIdx));
  };
  state.scrollSpy();
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
function initPalette() {
  const input = $('#palette-input');
  input.addEventListener('input', () => runSearch(input.value));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    else if (e.key === '/' && !isTyping(e.target) && !isPaletteOpen()) { e.preventDefault(); openPalette(); }
    else if (isPaletteOpen()) {
      if (e.key === 'Escape') closePalette();
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); commitActive(); }
    }
  });
  $('#palette').addEventListener('click', (e) => {
    if (e.target.id === 'palette') closePalette();
    const row = e.target.closest('.p-result');
    if (row) { state.paletteActive = Number(row.dataset.idx); commitActive(); }
  });
}
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
const isPaletteOpen = () => $('#palette').classList.contains('open');

function openPalette() {
  $('#palette').classList.add('open');
  const input = $('#palette-input');
  input.value = '';
  input.focus();
  runSearch('');
}
function closePalette() { $('#palette').classList.remove('open'); }

function runSearch(q) {
  const box = $('#palette-results');
  if (!q.trim()) {
    state.paletteResults = [];
    const recent = [...state.index.entries].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 6);
    box.innerHTML = `<div class="palette-empty" style="padding:14px 6px 8px;text-align:left;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.1em">Suggestions</div>` +
      recent.map((e, i) => paletteRow({ rec: { entryId: e.id, entryIcon: e.icon, entryTitle: e.title, heading: '', anchor: 'top', type: 'entry', category: e.category, categoryLabel: e.categoryLabel, text: e.summary } }, i, '')).join('');
    state.paletteResults = recent.map((e) => ({ rec: { entryId: e.id, anchor: 'top', type: 'entry' } }));
    state.paletteActive = 0;
    highlightActive();
    return;
  }
  const results = state.engine.search(q, 30);
  state.paletteResults = results;
  state.paletteActive = 0;
  if (!results.length) {
    box.innerHTML = `<div class="palette-empty">Aucun résultat pour « ${escapeHtml(q)} »</div>`;
    return;
  }
  box.innerHTML = results.map((r, i) => paletteRow(r, i, q)).join('');
  highlightActive();
}

function paletteRow(r, i, q) {
  const rec = r.rec;
  const title = rec.heading || rec.entryTitle;
  const sub = rec.heading ? rec.entryTitle : (rec.text || '');
  return `<div class="p-result" data-idx="${i}">
    <div class="pr-body">
      <div class="pr-title">${highlightTokens(title, q, 80)}</div>
      <div class="pr-sub">${highlightTokens(sub, q, 90)}</div>
    </div>
    <span class="pr-cat">${escapeHtml(rec.categoryLabel || '')}</span>
  </div>`;
}

function moveActive(dir) {
  const n = state.paletteResults.length;
  if (!n) return;
  state.paletteActive = (state.paletteActive + dir + n) % n;
  highlightActive();
}
function highlightActive() {
  $$('.p-result').forEach((el, i) => {
    const on = i === state.paletteActive;
    el.classList.toggle('active', on);
    if (on) el.scrollIntoView({ block: 'nearest' });
  });
}
function commitActive() {
  const r = state.paletteResults[state.paletteActive];
  if (!r) return;
  const { entryId, anchor, type } = r.rec;
  closePalette();
  location.hash = type === 'section' && anchor && anchor !== 'top' ? `#/note/${entryId}/${anchor}` : `#/note/${entryId}`;
}

/* ============================================================
   COPY (délégation globale)
   ============================================================ */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.code-copy');
  if (!btn) return;
  const code = btn.closest('.code-block')?.querySelector('code');
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.innerText);
    btn.textContent = '✓ Copié';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('copied'); }, 1400);
  } catch { btn.textContent = 'Ctrl+C'; }
});

/* ============================================================
   localStorage safe
   ============================================================ */
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

boot();
