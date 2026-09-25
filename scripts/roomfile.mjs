/**
 * roomfile.mjs — logique partagée d'ingestion (create + update d'une note).
 * Utilisé par write-note.mjs (workflow) et add-room.mjs (CLI). Zéro dépendance.
 *
 * Opérations :
 *   - create  : nouvelle note (fichier)
 *   - append  : ajoute des sections à la FIN d'une note existante (défaut si target existe)
 *   - after   : insère des sections juste après un titre existant (payload.after)
 *   - replace : remplace tout le corps d'une note existante
 * Si la note ciblée n'existe pas, on bascule sur create (si title fourni).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['cheatsheets', 'rooms'];

const CAT_ICON = {
  linux: '🐧', windows: '🪟', networking: '🌐', recon: '📡', exploitation: '🎯',
  web: '🕸️', postexploit: '⬆️', cryptohash: '🔐', scripting: '📜', rooms: '🚩',
};

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/* Normalise un scalaire de frontmatter (une ligne, sans guillemets cassants). */
function scalar(v) {
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/"/g, '”').trim();
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

/* Sépare frontmatter (objet) et corps markdown. */
export function parseNote(raw) {
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
        val = val.slice(1, -1).split(',').map((x) => unquote(x.trim())).filter(Boolean);
      } else val = unquote(val);
      meta[key] = val;
    }
  }
  return { meta, body: body.replace(/^\n+/, '').replace(/\s+$/, '') };
}

/* Re-sérialise une note (ordre de champs stable + champs additionnels préservés). */
export function serializeNote(meta, body) {
  const order = ['title', 'category', 'icon', 'difficulty', 'platform', 'status', 'tags', 'summary', 'updated', 'source'];
  const bare = new Set(['category', 'updated', 'source']); // sans guillemets
  const lines = ['---'];
  const emit = (k, v) => {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
    if (Array.isArray(v)) lines.push(`${k}: [${v.map(scalar).join(', ')}]`);
    else if (bare.has(k)) lines.push(`${k}: ${scalar(v)}`);
    else lines.push(`${k}: "${scalar(v)}"`);
  };
  for (const k of order) if (k in meta) emit(k, meta[k]);
  for (const k of Object.keys(meta)) if (!order.includes(k)) emit(k, meta[k]);
  lines.push('---', '');
  return lines.join('\n') + '\n' + String(body).trim() + '\n';
}

function findNote(id, root) {
  for (const dir of DIRS) {
    const p = join(root, 'content', dir, `${id}.md`);
    if (existsSync(p)) return { path: p, dir };
  }
  return null;
}

function unionTags(existing, incoming) {
  const norm = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((t) => scalar(t)).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const t of [...norm(existing), ...norm(incoming)]) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

/* Insère newBody juste après la section dont le titre == afterText (niveau ##/###/####). */
/* Localise une section par prédicat sur le texte du titre (fence-aware). */
function locateSection(lines, pred) {
  let inFence = false;
  let startLevel = null;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    const h = lines[i].match(/^(#{2,4})\s+(.*)$/);
    if (!h) continue;
    if (startLevel === null) {
      if (pred(h[2].replace(/`/g, '').trim().toLowerCase())) { startLevel = h[1].length; start = i; }
    } else if (h[1].length <= startLevel) { end = i; break; }
  }
  return start === -1 ? null : { start, end };
}

/* Trouve une section : match exact du titre, sinon préfixe (plus tolérant). */
function findSection(lines, headingText) {
  const want = scalar(headingText).toLowerCase();
  return locateSection(lines, (t) => t === want) || locateSection(lines, (t) => t.startsWith(want));
}

function insertAfterHeading(body, afterText, newBody) {
  const lines = body.split('\n');
  const s = findSection(lines, afterText);
  if (!s) return body.trim() + '\n\n' + newBody.trim(); // titre absent -> fin
  const before = lines.slice(0, s.end).join('\n').trim();
  const after = lines.slice(s.end).join('\n').trim();
  return [before, newBody.trim(), after].filter(Boolean).join('\n\n');
}

function replaceSection(body, headingText, newBody) {
  const lines = body.split('\n');
  const s = findSection(lines, headingText);
  if (!s) throw new Error(`section "${headingText}" introuvable`);
  const before = lines.slice(0, s.start).join('\n').trim();
  const after = lines.slice(s.end).join('\n').trim();
  return [before, newBody.trim(), after].filter(Boolean).join('\n\n');
}

function deleteSection(body, headingText) {
  const lines = body.split('\n');
  const s = findSection(lines, headingText);
  if (!s) throw new Error(`section "${headingText}" introuvable`);
  const before = lines.slice(0, s.start).join('\n').trim();
  const after = lines.slice(s.end).join('\n').trim();
  return [before, after].filter(Boolean).join('\n\n');
}

/* Crée le fichier d'une nouvelle note (évite d'écraser un existant). */
export function buildRoomMarkdown(p) {
  const title = scalar(p.title);
  if (!title) throw new Error('champ "title" requis');
  const body = String(p.body || '').trim();
  if (!body) throw new Error('champ "body" requis');
  const category = scalar(p.category) || 'rooms';
  const meta = {
    title,
    category,
    icon: scalar(p.icon) || CAT_ICON[category] || '📄',
    difficulty: scalar(p.difficulty),
    platform: scalar(p.platform),
    status: scalar(p.status),
    tags: unionTags([], p.tags),
    summary: scalar(p.summary),
    updated: new Date().toISOString().slice(0, 10),
    source: scalar(p.source) || 'agent',
  };
  return serializeNote(meta, body);
}

export function writeRoom(p, { root = ROOT } = {}) {
  const category = scalar(p.category) || 'rooms';
  const dir = category === 'rooms' ? 'rooms' : 'cheatsheets';
  const baseSlug = slugify(p.slug || p.title);
  if (!baseSlug) throw new Error('slug vide (titre invalide ?)');
  const targetDir = join(root, 'content', dir);
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  let slug = baseSlug;
  let n = 2;
  while (existsSync(join(targetDir, `${slug}.md`))) { slug = `${baseSlug}-${n}`; n += 1; }
  writeFileSync(join(root, 'content', dir, `${slug}.md`), buildRoomMarkdown(p), 'utf8');
  return { path: `content/${dir}/${slug}.md`, id: slug, category };
}

/**
 * Point d'entrée unique : crée OU met à jour une note selon le payload.
 * payload.target = id d'une note existante (ex "nmap"). Sinon dérivé du titre.
 * payload.op = "append" (défaut si existe) | "after" | "replace" | "create".
 * payload.after = titre de section après lequel insérer (op "after").
 */
export function applyContribution(payload, { root = ROOT } = {}) {
  const op = String(payload.op || '').toLowerCase();
  const targetId = payload.target ? slugify(payload.target)
    : (payload.title ? slugify(payload.slug || payload.title) : null);
  if (!targetId) throw new Error('précise "target" (note à compléter) ou "title" (nouvelle note)');

  const found = findNote(targetId, root);

  // Pas trouvée -> création (si possible)
  if (!found) {
    if (!payload.title) throw new Error(`note "${targetId}" introuvable, et "title" manquant pour la créer`);
    const r = writeRoom({ ...payload, slug: targetId }, { root });
    return { action: 'created', ...r };
  }

  // Création explicitement demandée alors que ça existe -> nouveau fichier suffixé
  if (op === 'create') {
    const r = writeRoom({ ...payload }, { root });
    return { action: 'created', ...r };
  }

  // Suppression de la note entière
  if (op === 'delete' && !(payload.section || payload.after)) {
    unlinkSync(found.path);
    return { action: 'deleted', path: `content/${found.dir}/${targetId}.md`, id: targetId, removed: true };
  }

  // Mise à jour d'une note existante
  const { meta, body } = parseNote(readFileSync(found.path, 'utf8'));
  const newBody = String(payload.body || '').trim();
  const heading = payload.section || payload.after;

  let finalBody;
  let action = 'appended';
  if (op === 'replace') {
    if (!newBody) throw new Error('op=replace : "body" requis');
    finalBody = newBody;
    action = 'replaced';
  } else if (op === 'replace-section') {
    if (!heading) throw new Error('op=replace-section : "section" requise');
    if (!newBody) throw new Error('op=replace-section : "body" requis');
    finalBody = replaceSection(body, heading, newBody);
    action = 'section replaced';
  } else if (op === 'delete-section') {
    if (!heading) throw new Error('op=delete-section : "section" requise');
    finalBody = deleteSection(body, heading);
    action = 'section deleted';
  } else if (op === 'after' || (payload.after && !op)) {
    if (!newBody) throw new Error('"body" requis');
    finalBody = insertAfterHeading(body, heading || '', newBody);
    action = 'inserted';
  } else {
    // append (défaut)
    if (!newBody) throw new Error('"body" requis');
    finalBody = (body.trim() ? body.trim() + '\n\n' : '') + newBody;
  }

  meta.tags = unionTags(meta.tags, payload.tags);
  meta.updated = new Date().toISOString().slice(0, 10);
  if (payload.summary) meta.summary = scalar(payload.summary);
  if (payload.icon) meta.icon = scalar(payload.icon);
  if (!meta.source) meta.source = 'agent';

  writeFileSync(found.path, serializeNote(meta, finalBody), 'utf8');
  return { action, path: `content/${found.dir}/${targetId}.md`, id: targetId };
}
