#!/usr/bin/env node
/**
 * add-room.mjs — CLI d'ingestion pour agents IA (et pour toi).
 *
 * Deux gestes :
 *   • CRÉER une note / room :
 *       --title "Blue" --category rooms --platform THM --difficulty Easy \
 *       --tags "smb,privesc" --summary "…" --body-file writeup.md
 *   • COMPLÉTER une note existante (append de sections) :
 *       --target nmap --op append --body-file appris.md
 *       --target nmap --after "Types de scan" --body "### -sn ping scan\n..."
 *
 * Modes d'exécution :
 *   • distant (défaut) : repository_dispatch  ->  GH_TOKEN=… node scripts/add-room.mjs …
 *   • local  : écrit dans le repo courant + régénère l'index  ->  --local
 *
 * Autres options : --status, --icon, --op replace, --repo owner/repo
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { applyContribution } from './roomfile.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.title && !args.target)) {
  console.log(`Usage :
  Créer   : GH_TOKEN=xxx node scripts/add-room.mjs --title "Blue" --category rooms \\
              --platform THM --difficulty Easy --tags "smb,privesc" --body-file writeup.md
  Compléter: GH_TOKEN=xxx node scripts/add-room.mjs --target nmap --op append --body-file appris.md
  Local   : node scripts/add-room.mjs --local --target nmap --body "### Nouvelle astuce\\n..."`);
  process.exit(args.help ? 0 : 1);
}

const body = args['body-file'] ? readFileSync(args['body-file'], 'utf8') : (args.body || '');
const payload = {
  target: args.target || undefined,
  op: args.op || undefined,
  after: args.after || undefined,
  section: args.section || undefined,
  title: args.title || undefined,
  category: args.category || undefined,
  platform: args.platform || undefined,
  difficulty: args.difficulty || undefined,
  status: args.status || undefined,
  icon: args.icon || undefined,
  tags: args.tags || undefined,
  summary: args.summary || undefined,
  body,
};

if (args.local) {
  try {
    const r = applyContribution(payload);
    console.log(`✓ ${r.action} en local : ${r.path} (id=${r.id})`);
    execFileSync('node', ['scripts/build-index.mjs'], { stdio: 'inherit' });
  } catch (e) { console.error('✗', e.message); process.exit(1); }
} else {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) { console.error('✗ GH_TOKEN manquant (ou utilise --local)'); process.exit(1); }
  const repo = args.repo || 'a-jeaugey/cyber-lab';
  const eventType = payload.target ? 'contribute' : 'add-room';
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'cyber-lab-add-room',
    },
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
  });
  if (res.status === 204) console.log(`✓ dispatch "${eventType}" envoyé. Le site se met à jour dans ~1 min.`);
  else { console.error(`✗ échec ${res.status} : ${await res.text()}`); process.exit(1); }
}
