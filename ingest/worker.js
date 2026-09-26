/**
 * Cyber Lab — proxy d'ingestion (Cloudflare Worker).
 *
 * But : permettre à des agents IA DISTANTS (sans accès au repo) d'ajouter/modifier
 * une note SANS jamais manipuler ton token GitHub.
 *
 *   agent  --(clé de lab)-->  Worker  --(ton token GH, côté serveur)-->  GitHub
 *
 * L'agent n'envoie qu'une clé applicative (INGEST_KEY) qui ne sait faire qu'une
 * chose : poster une note dans CE lab. Ton token GitHub reste un secret du Worker.
 *
 * Secrets à définir (jamais dans le code) :
 *   wrangler secret put GITHUB_TOKEN   # PAT fine-grained, Contents: read & write, sur ce repo
 *   wrangler secret put INGEST_KEY     # une chaîne aléatoire que tu génères
 * Variable (wrangler.toml) :
 *   REPO = "a-jeaugey/cyber-lab"
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-lab-key',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    // Auth : clé de lab (constante en temps si possible)
    const key = request.headers.get('x-lab-key') || '';
    if (!env.INGEST_KEY || !safeEqual(key, env.INGEST_KEY)) {
      return json({ error: 'unauthorized' }, 401);
    }

    let p;
    try { p = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
    if (!p || typeof p.body !== 'string' || (!p.title && !p.target)) {
      return json({ error: 'need_target_or_title_plus_body' }, 400);
    }

    const eventType = p.target ? 'contribute' : 'add-room';
    const gh = await fetch(`https://api.github.com/repos/${env.REPO}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'cyber-lab-ingest-worker',
      },
      body: JSON.stringify({ event_type: eventType, client_payload: p }),
    });

    if (gh.status === 204) return json({ ok: true, event: eventType, message: 'note en file, site à jour dans ~1 min' });
    return json({ error: 'github_error', status: gh.status, detail: (await gh.text()).slice(0, 300) }, 502);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...CORS } });
}

/* Comparaison à temps ~constant pour éviter le timing sur la clé. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
