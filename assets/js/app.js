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
  const groups = state.index.categories.map((cat) => {
    const items = state.index.entries.filter((e) => e.category === cat.id);
    if (!items.length) return '';
    return `<div class="nav-group" data-cat="${cat.id}">
      <div class="nav-group-title"><span class="dot"></span>${escapeHtml(cat.label)}</div>
      ${items.map((e) => `<a class="nav-item" href="#/note/${e.id}" data-id="${e.id}">
        <span class="ni-icon">${e.icon}</span><span>${escapeHtml(e.title)}</span></a>`).join('')}
    </div>`;
  }).join('');
  nav.innerHTML = `<a class="nav-home" href="#/">◆ Accueil</a>${groups}`;
}

function setActiveNav(id) {
  $$('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.id === id));
  $$('.nav-item').forEach((a) => { a.closest('.nav-group')?.setAttribute('data-cat', a.closest('.nav-group').dataset.cat); });
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
  setCrumbs([{ label: 'Accueil' }]);
  const { stats, categories, entries } = state.index;
  const recent = [...entries].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 6);
  const tagFreq = new Map();
  for (const e of entries) for (const t of e.tags) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);

  $('#view').innerHTML = `
    <section class="hero reveal">
      <span class="hero-badge"><span class="pulse"></span>Cyber Lab · TryHackMe & pentest</span>
      <h1>Le lab de <span class="grad">tes réflexes</span>.<br>Toute ta cyber, rangée & cherchable.</h1>
      <p class="lead">Chaque room, chaque commande, chaque pattern — séparé par sujet, indexé, et accessible en deux frappes. Tes agents IA peuvent ajouter une room via un simple token, sans login.</p>
      <div class="hero-actions">
        <button class="btn primary" id="hero-search">⌕ Rechercher une notion <span class="kbd">Ctrl K</span></button>
        <button class="btn" id="hero-add">＋ Ajouter une room</button>
        <a class="btn" href="#/note/${recent[0]?.id || entries[0].id}">↳ Dernière note</a>
      </div>
    </section>

    <div class="stats">
      ${statCard(stats.entries, 'Notes')}
      ${statCard(stats.sections, 'Sections indexées')}
      ${statCard(stats.tags, 'Tags')}
      ${statCard(stats.rooms, 'Rooms')}
    </div>

    <div class="section-head reveal"><h2>Explorer par sujet</h2><span class="hint">${categories.length} catégories</span></div>
    <div class="cat-grid">
      ${categories.map((c) => {
        const n = entries.filter((e) => e.category === c.id).length;
        return `<a class="cat-card reveal" data-cat="${c.id}" href="#/cat/${c.id}">
          <div class="cc-top"><span class="cc-icon">${c.icon}</span><span class="cc-count">${n} note${n > 1 ? 's' : ''}</span></div>
          <h3>${escapeHtml(c.label)}</h3><p>${escapeHtml(c.blurb || '')}</p></a>`;
      }).join('')}
    </div>

    <div class="section-head reveal"><h2>Dernières notes</h2><span class="hint">récemment mises à jour</span></div>
    <div class="note-grid">${recent.map(noteCard).join('')}</div>

    <div class="section-head reveal"><h2>Tags</h2><span class="hint">accès rapide</span></div>
    <div class="tag-cloud reveal">
      ${topTags.map(([t, n]) => `<a class="tag-pill" href="#/tag/${encodeURIComponent(t)}">${escapeHtml(t)}<b>${n}</b></a>`).join('')}
    </div>`;

  $('#hero-search').addEventListener('click', openPalette);
  $('#hero-add').addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-ingest')));
  animateStats();
  observeReveal();
}

function statCard(num, label) {
  return `<div class="stat reveal"><div class="num" data-to="${num}">0</div><div class="label">${label}</div></div>`;
}

function noteCard(e) {
  const meta = [e.platform, e.difficulty].filter(Boolean);
  return `<a class="note-card reveal" data-cat="${e.category}" href="#/note/${e.id}">
    <div class="nc-head"><span class="nc-icon">${e.icon}</span><span class="nc-title">${escapeHtml(e.title)}</span>
      <span class="nc-cat">${escapeHtml(e.categoryLabel)}</span></div>
    <p>${escapeHtml(e.summary || '')}</p>
    <div class="chip-row">
      ${meta.map((m) => `<span class="chip meta">${escapeHtml(m)}</span>`).join('')}
      ${e.tags.slice(0, 3).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}
    </div></a>`;
}

function renderCategory(catId) {
  const cat = state.catById.get(catId);
  if (!cat) return renderHome();
  setActiveNav(null);
  setCrumbs([{ label: 'Accueil', href: '#/' }, { label: cat.label }]);
  const items = state.index.entries.filter((e) => e.category === catId);
  $('#view').innerHTML = `
    <section class="hero reveal" data-cat="${catId}" style="padding-bottom:0">
      <span class="hero-badge"><span class="pulse"></span>${escapeHtml(cat.icon)} Catégorie</span>
      <h1 style="font-size:clamp(30px,5vw,52px);margin-bottom:8px">${escapeHtml(cat.label)}</h1>
      <p class="lead">${escapeHtml(cat.blurb || '')}</p>
    </section>
    <div class="note-grid" style="margin-top:28px">${items.map(noteCard).join('')}</div>`;
  observeReveal();
}

function renderTag(tag) {
  setActiveNav(null);
  setCrumbs([{ label: 'Accueil', href: '#/' }, { label: 'Tags', href: '#/' }, { label: `#${tag}` }]);
  const items = state.index.entries.filter((e) => e.tags.includes(tag));
  $('#view').innerHTML = `
    <section class="hero reveal" style="padding-bottom:0">
      <span class="hero-badge"><span class="pulse"></span>Tag</span>
      <h1 style="font-size:clamp(30px,5vw,52px)"><span class="grad">#${escapeHtml(tag)}</span></h1>
      <p class="lead">${items.length} note${items.length > 1 ? 's' : ''} taguée${items.length > 1 ? 's' : ''}.</p>
    </section>
    <div class="note-grid" style="margin-top:28px">${items.map(noteCard).join('') || emptyState('Aucune note pour ce tag.')}</div>`;
  observeReveal();
}

function renderEntry(id, anchor) {
  const e = state.entriesById.get(id);
  if (!e) { $('#view').innerHTML = emptyState(`Note « ${escapeHtml(id)} » introuvable.`); return; }
  setActiveNav(id);
  setCrumbs([{ label: 'Accueil', href: '#/' }, { label: e.categoryLabel, href: `#/cat/${e.category}` }, { label: e.title }]);

  const order = state.index.entries;
  const i = order.findIndex((x) => x.id === id);
  const prev = order[i - 1];
  const next = order[i + 1];

  const meta = [];
  if (e.platform) meta.push(chip(e.platform, true));
  if (e.difficulty) meta.push(chip(e.difficulty, true));
  if (e.status) meta.push(chip(e.status));
  if (e.updated) meta.push(chip(`maj ${e.updated}`));
  meta.push(chip(`${e.wordCount} mots`));
  meta.push(chip(`${e.source}`));

  const tocHeadings = e.headings.filter((h) => h.level === 2 || h.level === 3);
  const toc = tocHeadings.length ? `
    <aside class="toc"><div class="toc-title">Sur cette page</div>
      ${tocHeadings.map((h) => `<a href="#/note/${e.id}/${h.anchor}" class="toc-link lvl${h.level}" data-anchor="${h.anchor}">${escapeHtml(h.text)}</a>`).join('')}
    </aside>` : '<aside></aside>';

  $('#view').innerHTML = `
    <div class="entry-layout" data-cat="${e.category}">
      <article class="article">
        <header class="entry-header" data-cat="${e.category}">
          <div class="eh-cat"><span class="dot"></span>${escapeHtml(e.categoryLabel)}</div>
          <div class="entry-title"><span class="et-icon">${e.icon}</span><h1>${escapeHtml(e.title)}</h1></div>
          ${e.summary ? `<p class="entry-summary">${escapeHtml(e.summary)}</p>` : ''}
          <div class="meta-row">${meta.join('')}
            ${e.tags.map((t) => `<a class="chip" href="#/tag/${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join('')}
          </div>
        </header>
        <div class="md">${renderMarkdown(e.body)}</div>
        <nav class="pager">
          ${prev ? `<a class="prev" href="#/note/${prev.id}"><div class="dir">← Précédent</div><div class="ttl">${escapeHtml(prev.title)}</div></a>` : '<span></span>'}
          ${next ? `<a class="next" href="#/note/${next.id}"><div class="dir">Suivant →</div><div class="ttl">${escapeHtml(next.title)}</div></a>` : '<span></span>'}
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

function chip(text, meta = false) {
  return `<span class="chip${meta ? ' meta' : ''}">${escapeHtml(text)}</span>`;
}
function emptyState(msg) {
  return `<div class="empty-state"><div class="es-icon">🔍</div><h2>Rien ici</h2><p>${msg}</p><p><a class="btn" href="#/">← Retour à l'accueil</a></p></div>`;
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
  return `<div class="p-result" data-idx="${i}" data-cat="${rec.category}">
    <span class="pr-icon">${rec.entryIcon || '📄'}</span>
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
   ANIMATIONS
   ============================================================ */
function animateStats() {
  $$('.stat .num').forEach((el) => {
    const to = Number(el.dataset.to) || 0;
    const dur = 900;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

let revealObserver;
function observeReveal() {
  if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('in')); return; }
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal:not(.in)').forEach((el, i) => { el.style.transitionDelay = `${Math.min(i * 40, 240)}ms`; revealObserver.observe(el); });
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
