#!/usr/bin/env node
/**
 * write-note.mjs — utilisé par le workflow (repository_dispatch).
 * Lit le payload dans l'env PAYLOAD (JSON) et crée OU met à jour la note.
 * Écrit l'action réalisée dans GITHUB_OUTPUT (action, path, id) si dispo.
 */
import { appendFileSync } from 'node:fs';
import { applyContribution } from './roomfile.mjs';

const raw = process.env.PAYLOAD;
if (!raw) { console.error('PAYLOAD manquant'); process.exit(1); }

let payload;
try { payload = JSON.parse(raw); } catch (e) { console.error('PAYLOAD JSON invalide:', e.message); process.exit(1); }

try {
  const { action, path, id } = applyContribution(payload);
  console.log(`✓ ${action} : ${path} (id=${id})`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `action=${action}\npath=${path}\nid=${id}\n`);
  }
} catch (e) {
  console.error('✗ échec :', e.message);
  process.exit(1);
}
