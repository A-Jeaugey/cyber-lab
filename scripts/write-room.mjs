#!/usr/bin/env node
/**
 * write-room.mjs — utilisé par le workflow add-room.yml.
 * Lit le payload repository_dispatch dans la variable d'env PAYLOAD (JSON)
 * et écrit le fichier de note correspondant.
 */
import { writeRoom } from './roomfile.mjs';

const raw = process.env.PAYLOAD;
if (!raw) { console.error('PAYLOAD manquant'); process.exit(1); }

let payload;
try { payload = JSON.parse(raw); } catch (e) { console.error('PAYLOAD JSON invalide:', e.message); process.exit(1); }

try {
  const { path, id, category } = writeRoom(payload);
  console.log(`✓ note écrite : ${path} (id=${id}, category=${category})`);
} catch (e) {
  console.error('✗ échec :', e.message);
  process.exit(1);
}
