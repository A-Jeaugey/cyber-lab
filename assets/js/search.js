/**
 * search.js — moteur de recherche floue maison (aucune dépendance).
 * Indexe chaque note ET chaque section, pour retrouver n'importe quelle
 * notion en quelques frappes. Sémantique multi-mots = ET (tous les termes
 * doivent matcher quelque part).
 */

import { escapeHtml } from './markdown.js';

/* Score de correspondance floue entre un terme et une cible. 0 = pas de match. */
export function fuzzyScore(q, target) {
  if (!q || !target) return 0;
  const t = target.toLowerCase();
  q = q.toLowerCase();

  const idx = t.indexOf(q);
  if (idx !== -1) {
    let score = 120 - Math.min(idx, 60);
    if (idx === 0) score += 40;
    else if (/[^a-z0-9]/.test(t[idx - 1])) score += 20; // début de mot
    score += Math.max(0, 15 - (t.length - q.length) / 6);
    return score;
  }

  // Sous-séquence : toutes les lettres de q présentes dans l'ordre
  let ti = 0, qi = 0, consec = 0, score = 0, prev = -2;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      score += 2;
      if (prev === ti - 1) { consec += 1; score += consec * 2; } else consec = 0;
      if (ti === 0 || /[^a-z0-9]/.test(t[ti - 1])) score += 3;
      prev = ti;
      qi += 1;
    }
    ti += 1;
  }
  if (qi < q.length) return 0;
  return score * 0.45;
}

export function createSearchEngine(entries) {
  const records = [];
  for (const e of entries) {
    const tagsStr = (e.tags || []).join(' ');
    // Enregistrement pour la note elle-même
    records.push({
      entryId: e.id,
      entryTitle: e.title,
      entryIcon: e.icon,
      category: e.category,
      categoryLabel: e.categoryLabel || e.category,
      type: 'entry',
      heading: '',
      anchor: 'top',
      text: e.summary || '',
      tagsStr,
      boost: 6,
    });
    // Un enregistrement par section (cible de saut la plus utile)
    for (const s of e.sections || []) {
      if (s.anchor === 'top') continue;
      records.push({
        entryId: e.id,
        entryTitle: e.title,
        entryIcon: e.icon,
        category: e.category,
        categoryLabel: e.categoryLabel || e.category,
        type: 'section',
        heading: s.heading || '',
        anchor: s.anchor,
        text: s.text || '',
        tagsStr,
        boost: 0,
      });
    }
  }

  function search(query, limit = 40) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const out = [];
    for (const rec of records) {
      let total = 0;
      let ok = true;
      for (const term of terms) {
        const s = Math.max(
          fuzzyScore(term, rec.heading) * 3.2,
          fuzzyScore(term, rec.entryTitle) * (rec.type === 'entry' ? 3 : 2.2),
          fuzzyScore(term, rec.tagsStr) * 2,
          fuzzyScore(term, rec.categoryLabel) * 1.4,
          fuzzyScore(term, rec.text) * 1,
        );
        if (s <= 0) { ok = false; break; }
        total += s;
      }
      if (ok) out.push({ rec, score: total + rec.boost });
    }
    out.sort((a, b) => b.score - a.score || a.rec.entryTitle.localeCompare(b.rec.entryTitle, 'fr'));
    return out.slice(0, limit);
  }

  return { search, records };
}

/* Met en évidence les termes trouvés dans un texte (retourne du HTML échappé). */
export function highlightTokens(text, query, max = 160) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let snippet = text;
  // Recadre autour de la première occurrence pour un extrait pertinent
  if (terms.length && text.length > max) {
    const low = text.toLowerCase();
    let pos = -1;
    for (const term of terms) { const p = low.indexOf(term); if (p !== -1) { pos = p; break; } }
    if (pos > 40) {
      const start = Math.max(0, pos - 40);
      snippet = (start > 0 ? '…' : '') + text.slice(start, start + max);
    } else {
      snippet = text.slice(0, max);
    }
    if (text.length > snippet.length + (snippet.startsWith('…') ? 1 : 0)) snippet += '…';
  }
  let html = escapeHtml(snippet);
  for (const term of terms) {
    const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    html = html.replace(re, '<mark>$1</mark>');
  }
  return html;
}
