#!/usr/bin/env node
/**
 * build-index.mjs — scanne content/ et génère content/index.json
 *
 * Aucune dépendance externe : ne lit que le système de fichiers.
 * Le fichier généré contient, pour chaque note :
 *   - les métadonnées (frontmatter)
 *   - le markdown brut (rendu côté client, une seule requête réseau)
 *   - la liste des titres (TOC) avec leurs anchors
 *   - les sections découpées + texte brut extrait (pour la recherche)
 *
 * Usage : node scripts/build-index.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'content');
const OUT = join(CONTENT_DIR, 'index.json');

/* --- Catégories (ordre + libellés d'affichage). Doit rester en phase avec le front. --- */
const CATEGORIES = [
  { id: 'linux',        label: 'Linux & Terminal',       icon: '🐧', blurb: 'Système, fichiers, réseau, scripting.' },
  { id: 'windows',      label: 'Windows & AD',           icon: '🪟', blurb: 'PowerShell, registre, Active Directory.' },
  { id: 'networking',   label: 'Networking',             icon: '🌐', blurb: 'OSI, ports, protocoles, DNS.' },
  { id: 'recon',        label: 'Recon & Scanning',       icon: '📡', blurb: 'Nmap, capture, brute force.' },
  { id: 'exploitation', label: 'Exploitation',           icon: '🎯', blurb: 'Shells, Metasploit, accès initial.' },
  { id: 'web',          label: 'Web & SQLi',             icon: '🕸️', blurb: 'HTTP, headers, injections SQL.' },
  { id: 'postexploit',  label: 'Privesc & Post-Exploit', icon: '⬆️', blurb: 'Escalade de privilèges, réflexes.' },
  { id: 'cryptohash',   label: 'Crypto & Hashing',       icon: '🔐', blurb: 'Chiffrement, hashes, cracking.' },
  { id: 'scripting',    label: 'Scripting & Data',       icon: '📜', blurb: 'Bash, langages, encodage.' },
  { id: 'rooms',        label: 'Rooms & Boxes',          icon: '🚩', blurb: 'Write-ups et réflexes par box.' },
];

/* --- slugify : identique à celui du front (assets/js/markdown.js) --- */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/* --- Parseur de frontmatter YAML minimal (key: value + arrays inline) --- */
function parseFrontmatter(raw) {
  const meta = {};
  let body = raw;
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (m) {
    body = m[2];
    for (const line of m[1].split(/\r?\n/)) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
      } else {
        val = unquote(val);
      }
      meta[key] = val;
    }
  }
  return { meta, body: body.trim() };
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/* --- Extraction du texte brut pour la recherche (retire la syntaxe markdown) --- */
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, (block) => ' ' + block.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '') + ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* --- Découpe le corps markdown en sections par titres de niveau 2 (##) --- */
function extractStructure(body, title) {
  const lines = body.split(/\r?\n/);
  const headings = [];
  const sections = [];
  const seen = new Map();

  const uniqueAnchor = (text) => {
    let base = slugify(text) || 'section';
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };

  let current = { heading: title, anchor: 'top', level: 1, lines: [] };
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      if (current.lines.join('\n').trim() || current.heading) sections.push(finalizeSection(current));
      const level = h[1].length;
      const text = h[2].replace(/`/g, '').trim();
      const anchor = uniqueAnchor(text);
      headings.push({ level, text, anchor });
      current = { heading: text, anchor, level, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('\n').trim() || current.heading) sections.push(finalizeSection(current));

  return { headings, sections: sections.filter((s) => s.text) };
}

function finalizeSection(s) {
  const md = s.lines.join('\n').trim();
  return { heading: s.heading, anchor: s.anchor, level: s.level, text: toPlainText(md) };
}

/* --- Scan d'un dossier de contenu --- */
function scanDir(rel) {
  const dir = join(CONTENT_DIR, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const path = join(dir, f);
      const raw = readFileSync(path, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const id = basename(f, '.md');
      const title = meta.title || id;
      const { headings, sections } = extractStructure(body, title);
      return {
        id,
        title,
        category: meta.category || 'divers',
        icon: meta.icon || '📄',
        difficulty: meta.difficulty || '',
        platform: meta.platform || '',
        status: meta.status || '',
        tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
        summary: meta.summary || '',
        updated: meta.updated || '',
        source: meta.source || rel.split('/').pop(),
        file: `content/${rel}/${f}`,
        wordCount: toPlainText(body).split(/\s+/).filter(Boolean).length,
        body,
        headings,
        sections,
      };
    });
}

/* --- Build --- */
const entries = [...scanDir('cheatsheets'), ...scanDir('rooms')];

// Ordonne les catégories : celles connues d'abord (ordre défini), puis les inconnues.
const known = new Set(CATEGORIES.map((c) => c.id));
const extraCats = [...new Set(entries.map((e) => e.category))].filter((c) => !known.has(c));
const categories = [
  ...CATEGORIES,
  ...extraCats.map((id) => ({ id, label: id, icon: '📁', blurb: '' })),
].filter((c) => entries.some((e) => e.category === c.id));

// Tri des entrées : par ordre de catégorie puis par titre.
const catOrder = new Map(categories.map((c, i) => [c.id, i]));
entries.sort((a, b) => {
  const ca = catOrder.get(a.category) ?? 999;
  const cb = catOrder.get(b.category) ?? 999;
  if (ca !== cb) return ca - cb;
  return a.title.localeCompare(b.title, 'fr');
});

const allTags = [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, 'fr'));

const index = {
  generated: new Date().toISOString(),
  version: 1,
  stats: {
    entries: entries.length,
    categories: categories.length,
    tags: allTags.length,
    sections: entries.reduce((n, e) => n + e.sections.length, 0),
    rooms: entries.filter((e) => e.category === 'rooms').length,
  },
  categories,
  tags: allTags,
  entries,
};

writeFileSync(OUT, JSON.stringify(index, null, 0));
const kb = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1);
console.log(`✓ index.json généré : ${entries.length} notes, ${categories.length} catégories, ${index.stats.sections} sections, ${allTags.length} tags (${kb} KB)`);
