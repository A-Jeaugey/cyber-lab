#!/usr/bin/env node
/**
 * add-room.mjs — CLI pour agents IA (et pour toi).
 *
 * Deux modes :
 *   • Distant (défaut) : déclenche le workflow via repository_dispatch.
 *       GH_TOKEN=… node scripts/add-room.mjs --title "Blue" --tags "smb,privesc" --body-file notes.md
 *   • Local (--local)  : écrit le fichier + régénère l'index dans le repo courant.
 *       node scripts/add-room.mjs --local --title "Blue" --body "## ..."
 *
 * Options :
 *   --title, --category, --platform, --difficulty, --status, --icon,
 *   --tags "a,b,c", --summary, --body "…", --body-file path,
 *   --repo owner/repo (défaut a-jeaugey/cyber-lab), --local
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { writeRoom } from './roomfile.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.title && !args._.length)) {
  console.log(`Usage:
  Distant : GH_TOKEN=xxx node scripts/add-room.mjs --title "Blue" --category rooms \\
              --platform THM --difficulty Easy --tags "smb,privesc" \\
              --summary "…" --body-file notes.md
  Local   : node scripts/add-room.mjs --local --title "Blue" --body "## Pattern ..."`);
  process.exit(args.help ? 0 : 1);
}

const body = args['body-file'] ? readFileSync(args['body-file'], 'utf8') : (args.body || '');
const payload = {
  title: args.title,
  category: args.category || 'rooms',
  platform: args.platform || '',
  difficulty: args.difficulty || '',
  status: args.status || '',
  icon: args.icon || '',
  tags: args.tags || '',
  summary: args.summary || '',
  body,
};

if (args.local) {
  try {
    const { path, id } = writeRoom(payload);
    console.log(`✓ écrit en local : ${path} (id=${id})`);
    execFileSync('node', ['scripts/build-index.mjs'], { stdio: 'inherit' });
  } catch (e) { console.error('✗', e.message); process.exit(1); }
} else {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) { console.error('✗ GH_TOKEN manquant (ou utilise --local)'); process.exit(1); }
  const repo = args.repo || 'a-jeaugey/cyber-lab';
  const url = `https://api.github.com/repos/${repo}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'cyber-lab-add-room',
    },
    body: JSON.stringify({ event_type: 'add-room', client_payload: payload }),
  });
  if (res.status === 204) console.log('✓ repository_dispatch envoyé. Le site se met à jour dans ~1 min.');
  else { console.error(`✗ échec ${res.status} : ${await res.text()}`); process.exit(1); }
}
