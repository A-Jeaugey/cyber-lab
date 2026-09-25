/**
 * ingest.js — ajout d'une room sans login, par token seul.
 *
 * Mécanisme unique : repository_dispatch (event `add-room`).
 *   1. Le formulaire in-browser (ou un agent IA) envoie un POST à
 *      https://api.github.com/repos/{owner}/{repo}/dispatches
 *      avec un Bearer token et le payload de la room.
 *   2. Le workflow .github/workflows/add-room.yml reçoit le payload,
 *      écrit content/rooms/<slug>.md, régénère l'index et commit.
 *   3. Le déploiement Pages republie le site (~1 min).
 *
 * Le token n'est JAMAIS envoyé ailleurs que sur api.github.com (HTTPS).
 */

import { REPO } from './config.js';
import { escapeHtml, slugify } from './markdown.js';

const TOKEN_KEY = 'clab-gh-token';
const $ = (s, r = document) => r.querySelector(s);

export function initIngest({ index }) {
  const modal = $('#modal');
  const cats = index.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>＋ Ajouter une room</h3>
        <button class="icon-btn" id="ingest-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tabs">
          <button class="modal-tab active" data-tab="form">Formulaire</button>
          <button class="modal-tab" data-tab="agent">Pour mes agents IA</button>
        </div>

        <div data-panel="form">
          <div class="callout">Remplis les champs → la room part sur GitHub via <code>repository_dispatch</code>. Le site se met à jour tout seul en ~1 minute. Aucun login, juste ton token.</div>
          <div class="field">
            <label>Token GitHub (fine-grained · Contents: read & write)</label>
            <input type="password" id="f-token" placeholder="github_pat_… ou ghp_…" autocomplete="off">
            <label style="display:flex;align-items:center;gap:8px;margin-top:8px;text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px;color:var(--text-dim)">
              <input type="checkbox" id="f-remember" style="width:auto"> Retenir dans ce navigateur (localStorage — évite sur un poste partagé)
            </label>
          </div>
          <div class="grid-2">
            <div class="field"><label>Titre de la room</label><input id="f-title" placeholder="Blue"></div>
            <div class="field"><label>Catégorie</label><select id="f-category">${cats}</select></div>
          </div>
          <div class="grid-2">
            <div class="field"><label>Plateforme</label>
              <select id="f-platform"><option value="THM">THM</option><option value="HTB">HTB</option><option value="">—</option></select></div>
            <div class="field"><label>Difficulté</label>
              <select id="f-difficulty"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option><option value="Fondamentaux">Fondamentaux</option><option value="">—</option></select></div>
          </div>
          <div class="field"><label>Tags (séparés par des virgules)</label><input id="f-tags" placeholder="smb, eternalblue, privesc"></div>
          <div class="field"><label>Résumé (une phrase)</label><input id="f-summary" placeholder="Ce que j'ai retenu de la box en une ligne."></div>
          <div class="field"><label>Contenu (Markdown)</label>
            <textarea id="f-body" placeholder="## Pattern : ...&#10;- réflexe 1&#10;- réflexe 2&#10;&#10;\`\`\`bash&#10;nmap -sC -sV IP&#10;\`\`\`"></textarea>
            <div class="help">Titres <code>##</code>, listes, tables, blocs de code — même syntaxe que tes notes.</div>
          </div>
        </div>

        <div data-panel="agent" hidden>
          <div class="callout">Tes agents IA n'ont pas besoin de ce site : ils appellent directement l'API GitHub avec un token. Un seul appel, pas de login, pas de <code>git clone</code>.</div>
          <div class="field"><label>1 · Requête (repository_dispatch)</label>
            <pre class="dispatch-pre" id="agent-curl"></pre>
            <button class="side-btn" id="copy-curl" style="margin-top:10px;max-width:220px">Copier le curl</button>
          </div>
          <div class="field"><label>2 · Ou via le script CLI du repo</label>
            <pre class="dispatch-pre">export GH_TOKEN=github_pat_xxx
node scripts/add-room.mjs \\
  --title "Blue" --category rooms --platform THM \\
  --difficulty Easy --tags "smb,eternalblue,privesc" \\
  --summary "EternalBlue sur SMB, privesc SYSTEM direct." \\
  --body-file ./notes/blue.md</pre>
          </div>
          <div class="field"><label>Schéma du payload (client_payload)</label>
            <pre class="dispatch-pre" id="agent-schema"></pre>
          </div>
          <div class="callout">Doc complète pour les agents : <code>docs/AGENTS.md</code> et <code>content/schema.json</code>.</div>
        </div>
      </div>
      <div class="modal-foot">
        <span class="status-msg" id="ingest-status"></span>
        <button class="btn" id="ingest-cancel">Annuler</button>
        <button class="btn primary" id="ingest-submit">Envoyer la room</button>
      </div>
    </div>`;

  // Ouverture / fermeture
  window.addEventListener('open-ingest', open);
  $('#ingest-close').addEventListener('click', close);
  $('#ingest-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  // Tabs
  modal.querySelectorAll('.modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.modal-tab').forEach((t) => t.classList.toggle('active', t === tab));
      modal.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    });
  });

  // Pré-remplissage token
  const saved = safeGet(TOKEN_KEY);
  if (saved) { $('#f-token').value = saved; $('#f-remember').checked = true; }

  // Docs agents
  renderAgentDocs();
  $('#copy-curl').addEventListener('click', () => copyText($('#agent-curl').textContent, $('#copy-curl')));

  // Submit
  $('#ingest-submit').addEventListener('click', submit);

  function open() { modal.classList.add('open'); setTimeout(() => $('#f-title')?.focus(), 50); }
  function close() { modal.classList.remove('open'); }

  function renderAgentDocs() {
    const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/dispatches`;
    $('#agent-curl').textContent = `curl -X POST ${url} \\
  -H "Authorization: Bearer $GH_TOKEN" \\
  -H "Accept: application/vnd.github+json" \\
  -d '{
    "event_type": "${REPO.eventType}",
    "client_payload": {
      "title": "Blue",
      "category": "rooms",
      "platform": "THM",
      "difficulty": "Easy",
      "tags": ["smb", "eternalblue", "privesc"],
      "summary": "EternalBlue sur SMB, privesc SYSTEM direct.",
      "body": "## Pattern : SMB exposé\\n- nmap --script smb-vuln-*\\n- MS17-010 = EternalBlue"
    }
  }'`;
    $('#agent-schema').textContent = JSON.stringify({
      title: 'string (requis)',
      category: `string — ${index.categories.map((c) => c.id).join(' | ')}`,
      platform: 'string (THM | HTB | …)',
      difficulty: 'string (Easy | Medium | Hard | …)',
      status: 'string (optionnel)',
      icon: 'string emoji (optionnel)',
      tags: ['string', '…'],
      summary: 'string — une phrase',
      body: 'string — Markdown',
    }, null, 2);
  }

  async function submit() {
    const status = $('#ingest-status');
    const token = $('#f-token').value.trim();
    const title = $('#f-title').value.trim();
    const body = $('#f-body').value.trim();
    if (!token) return setStatus(status, 'err', 'Token manquant.');
    if (!title) return setStatus(status, 'err', 'Titre manquant.');
    if (!body) return setStatus(status, 'err', 'Contenu manquant.');

    if ($('#f-remember').checked) safeSet(TOKEN_KEY, token); else safeRemove(TOKEN_KEY);

    const payload = {
      title,
      category: $('#f-category').value,
      platform: $('#f-platform').value,
      difficulty: $('#f-difficulty').value,
      tags: $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      summary: $('#f-summary').value.trim(),
      body,
      slug: slugify(title),
    };

    setStatus(status, '', 'Envoi en cours…');
    $('#ingest-submit').disabled = true;
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: REPO.eventType, client_payload: payload }),
      });
      if (res.status === 204) {
        setStatus(status, 'ok', '✓ Room envoyée ! Le site se met à jour dans ~1 min.');
        ['f-title', 'f-tags', 'f-summary', 'f-body'].forEach((id) => { $('#' + id).value = ''; });
      } else if (res.status === 401 || res.status === 403) {
        setStatus(status, 'err', `Token refusé (${res.status}). Vérifie les droits Contents: write.`);
      } else if (res.status === 404) {
        setStatus(status, 'err', 'Dépôt introuvable (404). Vérifie owner/repo dans config.js et les droits du token.');
      } else {
        setStatus(status, 'err', `Erreur ${res.status} : ${escapeHtml((await res.text()).slice(0, 120))}`);
      }
    } catch (err) {
      setStatus(status, 'err', 'Échec réseau : ' + escapeHtml(err.message));
    } finally {
      $('#ingest-submit').disabled = false;
    }
  }
}

function setStatus(el, cls, msg) { el.className = 'status-msg ' + cls; el.textContent = msg; }
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); const t = btn.textContent; btn.textContent = '✓ Copié'; setTimeout(() => (btn.textContent = t), 1400); } catch { /* noop */ }
}
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* noop */ } }
function safeRemove(k) { try { localStorage.removeItem(k); } catch { /* noop */ } }
