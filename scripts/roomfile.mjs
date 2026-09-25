/**
 * roomfile.mjs — logique partagée pour créer un fichier de note à partir
 * d'un payload (utilisé par write-room.mjs côté Action et add-room.mjs côté CLI).
 * Aucune dépendance externe.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

export function buildRoomMarkdown(p) {
  const title = scalar(p.title);
  if (!title) throw new Error('champ "title" requis');
  const body = String(p.body || '').trim();
  if (!body) throw new Error('champ "body" requis');

  const category = scalar(p.category) || 'rooms';
  const icon = scalar(p.icon) || CAT_ICON[category] || '📄';
  const tags = Array.isArray(p.tags)
    ? p.tags
    : String(p.tags || '').split(',');
  const tagList = tags.map((t) => scalar(t)).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);

  const fm = ['---'];
  fm.push(`title: "${title}"`);
  fm.push(`category: ${category}`);
  fm.push(`icon: "${icon}"`);
  if (p.difficulty) fm.push(`difficulty: "${scalar(p.difficulty)}"`);
  if (p.platform) fm.push(`platform: "${scalar(p.platform)}"`);
  if (p.status) fm.push(`status: "${scalar(p.status)}"`);
  fm.push(`tags: [${tagList.join(', ')}]`);
  if (p.summary) fm.push(`summary: "${scalar(p.summary)}"`);
  fm.push(`updated: ${today}`);
  fm.push(`source: ${scalar(p.source) || 'agent'}`);
  fm.push('---', '');

  return fm.join('\n') + '\n' + body + '\n';
}

/* Écrit le fichier de note, en évitant d'écraser un fichier existant. */
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

  const md = buildRoomMarkdown(p);
  const rel = `content/${dir}/${slug}.md`;
  writeFileSync(join(root, rel), md, 'utf8');
  return { path: rel, id: slug, category };
}
