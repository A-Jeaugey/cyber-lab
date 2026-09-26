/**
 * ingest.js — ajout/enrichissement d'une note sans login, par token seul.
 *
 * Deux gestes, un seul mécanisme (repository_dispatch) :
 *   • Compléter une note existante  -> event "contribute" (append / after / replace)
 *   • Nouvelle note / box (training) -> event "add-room"   (create)
 *
 * Le workflow reçoit le payload, écrit/complète le .md, régénère l'index,
 * commit et redéploie (~1 min). Le token ne part que sur api.github.com (HTTPS).
 */

import { REPO } from './config.js';
import { escapeHtml, slugify } from './markdown.js';

const TOKEN_KEY = 'clab-gh-token';
const $ = (s, r = document) => r.querySelector(s);

export function initIngest({ index }) {
  const modal = $('#modal');
  const cats = index.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
  const targetOpts = index.entries
    .map((e) => `<option value="${e.id}">${e.icon}  ${escapeHtml(e.title)}  ·  ${escapeHtml(e.categoryLabel)}</option>`)
    .join('');

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>＋ Enrichir le lab</h3>
        <button class="icon-btn" id="ingest-close" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-tabs">
          <button class="modal-tab active" data-tab="form">Formulaire</button>
          <button class="modal-tab" data-tab="agent">Pour mes agents IA</button>
        </div>

        <div data-panel="form">
          <div class="field">
            <label>Token GitHub (fine-grained · Contents: read & write)</label>
            <input type="password" id="f-token" placeholder="github_pat_… ou ghp_…" autocomplete="off">
            <label style="display:flex;align-items:center;gap:8px;margin-top:8px;text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px;color:var(--text-dim)">
              <input type="checkbox" id="f-remember" style="width:auto"> Retenir dans ce navigateur (évite sur un poste partagé)
            </label>
          </div>

          <div class="modal-tabs" style="margin-bottom:18px">
            <button class="mode-btn active" data-mode="complete" type="button">📝 Compléter une note</button>
            <button class="mode-btn" data-mode="create" type="button">🚩 Nouvelle note / box</button>
          </div>

          <!-- MODE COMPLÉTER -->
          <div data-mode-panel="complete">
            <div class="callout">Enrichis ou modifie une note existante (ex : de nouvelles astuces sur <code>nmap</code>). Ajout, réécriture ou suppression.</div>
            <div class="field"><label>Note à modifier</label><select id="c-target">${targetOpts}</select></div>
            <div class="grid-2">
              <div class="field"><label>Opération</label>
                <select id="c-op">
                  <option value="append">Ajouter à la fin (nouvelles sections)</option>
                  <option value="after">Insérer après une section…</option>
                  <option value="replace-section">Réécrire une section</option>
                  <option value="delete-section">Supprimer une section</option>
                  <option value="replace">Réécrire toute la note</option>
                  <option value="delete">Supprimer la note entière</option>
                </select></div>
              <div class="field" id="c-after-wrap" hidden><label id="c-after-label">Section cible</label><select id="c-after"></select></div>
            </div>
            <div class="field"><label>Tags à ajouter (optionnel)</label><input id="c-tags" placeholder="udp, firewall"></div>
            <div class="field" id="c-body-wrap"><label>Contenu (Markdown)</label>
              <textarea id="c-body" placeholder="## Scan UDP&#10;- \`nmap -sU\` lent mais essentiel&#10;&#10;\`\`\`bash&#10;sudo nmap -sU --top-ports 20 IP&#10;\`\`\`"></textarea>
              <div class="help">Commence par un titre <code>##</code> ou <code>###</code> pour créer une section.</div>
            </div>
          </div>

          <!-- MODE CRÉER -->
          <div data-mode-panel="create" hidden>
            <div class="callout">Crée une nouvelle note de savoir, ou une <strong>box réalisée en training</strong> (catégorie <em>Rooms &amp; Boxes</em>) avec son write-up.</div>
            <div class="grid-2">
              <div class="field"><label>Titre</label><input id="f-title" placeholder="Blue"></div>
              <div class="field"><label>Catégorie</label><select id="f-category">${cats}</select></div>
            </div>
            <div class="grid-2">
              <div class="field"><label>Plateforme (box)</label>
                <select id="f-platform"><option value="">—</option><option>THM</option><option>HTB</option><option>PG</option></select></div>
              <div class="field"><label>Difficulté (box)</label>
                <select id="f-difficulty"><option value="">—</option><option>Easy</option><option>Medium</option><option>Hard</option><option>Insane</option><option>Fondamentaux</option></select></div>
            </div>
            <div class="field"><label>Tags (virgules)</label><input id="f-tags" placeholder="smb, eternalblue, privesc"></div>
            <div class="field"><label>Résumé (une phrase)</label><input id="f-summary" placeholder="Ce que la box m'a appris en une ligne."></div>
            <div class="field"><label>Contenu / writeup (Markdown)</label>
              <textarea id="f-body" placeholder="## Recon&#10;\`\`\`bash&#10;nmap -sC -sV IP&#10;\`\`\`&#10;&#10;## Foothold&#10;...&#10;&#10;## Privesc&#10;..."></textarea>
            </div>
          </div>
        </div>

        <div data-panel="agent" hidden>
          <div class="callout"><strong>Agent distant (sans ton repo) → ne lui donne PAS ton token GitHub.</strong> Héberge le proxy (dossier <code>ingest/</code>) qui garde ton token côté serveur, et donne à l'agent juste l'URL + une <em>clé de lab</em>.</div>
          <div class="field"><label>Appel de l'agent — via le proxy (clé de lab, pas de token GH)</label>
            <pre class="dispatch-pre">curl -X POST "$LAB_URL" \
  -H "x-lab-key: $LAB_KEY" -H "content-type: application/json" \
  -d '{"target":"nmap","op":"append","body":"## Scan UDP\n- nmap -sU IP"}'</pre>
          </div>
          <div class="callout" style="margin-top:4px">Agent qui a <em>déjà</em> le repo : pas de token non plus → <code>node scripts/add-room.mjs --local --commit …</code>. Détails : <code>docs/AGENTS.md</code>.</div>
          <div class="callout" style="margin-top:4px"><strong>Toi</strong>, avec ton token (formulaire ci-dessus, ou appel GitHub direct) :</div>
          <div class="field"><label>1 · Compléter une note existante (event « contribute »)</label>
            <pre class="dispatch-pre" id="agent-contribute"></pre>
            <button class="side-btn" id="copy-contribute" style="margin-top:10px;max-width:220px">Copier</button>
          </div>
          <div class="field"><label>2 · Créer une note / box (event « add-room »)</label>
            <pre class="dispatch-pre" id="agent-create"></pre>
            <button class="side-btn" id="copy-create" style="margin-top:10px;max-width:220px">Copier</button>
          </div>
          <div class="field"><label>Notes existantes (valeurs de « target »)</label>
            <pre class="dispatch-pre" id="agent-targets"></pre>
          </div>
          <div class="callout">Doc complète : <code>docs/AGENTS.md</code> · schéma : <code>content/schema.json</code>.</div>
        </div>
      </div>
      <div class="modal-foot">
        <span class="status-msg" id="ingest-status"></span>
        <button class="btn" id="ingest-cancel">Annuler</button>
        <button class="btn primary" id="ingest-submit">Envoyer</button>
      </div>
    </div>`;

  let mode = 'complete';

  // Ouverture / fermeture
  window.addEventListener('open-ingest', open);
  $('#ingest-close').addEventListener('click', close);
  $('#ingest-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  // Onglets Formulaire / Agents
  modal.querySelectorAll('.modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.modal-tab').forEach((t) => t.classList.toggle('active', t === tab));
      modal.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    });
  });

  // Sélecteur de mode
  modal.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      modal.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      modal.querySelectorAll('[data-mode-panel]').forEach((p) => { p.hidden = p.dataset.modePanel !== mode; });
    });
  });

  // Opération -> affiche/masque le sélecteur de section et le corps
  const opSel = $('#c-op');
  const afterWrap = $('#c-after-wrap');
  const bodyWrap = $('#c-body-wrap');
  const SECTION_OPS = ['after', 'replace-section', 'delete-section'];
  const BODY_OPS = ['append', 'after', 'replace-section', 'replace'];
  const updateOpUI = () => {
    const op = opSel.value;
    afterWrap.hidden = !SECTION_OPS.includes(op);
    bodyWrap.hidden = !BODY_OPS.includes(op);
    $('#c-after-label').textContent = op === 'after' ? 'Insérer après' : 'Section cible';
  };
  opSel.addEventListener('change', updateOpUI);
  const targetSel = $('#c-target');
  const fillHeadings = () => {
    const e = index.entries.find((x) => x.id === targetSel.value);
    const hs = (e?.headings || []).filter((h) => h.level === 2 || h.level === 3);
    $('#c-after').innerHTML = hs.map((h) => `<option value="${escapeHtml(h.text)}">${'—'.repeat(h.level - 2)} ${escapeHtml(h.text)}</option>`).join('') || '<option value="">(aucune section)</option>';
  };
  targetSel.addEventListener('change', fillHeadings);
  fillHeadings();
  updateOpUI();

  // Token mémorisé
  const saved = safeGet(TOKEN_KEY);
  if (saved) { $('#f-token').value = saved; $('#f-remember').checked = true; }

  renderAgentDocs();
  $('#copy-contribute').addEventListener('click', () => copyText($('#agent-contribute').textContent, $('#copy-contribute')));
  $('#copy-create').addEventListener('click', () => copyText($('#agent-create').textContent, $('#copy-create')));
  $('#ingest-submit').addEventListener('click', submit);

  function open() { modal.classList.add('open'); setTimeout(() => $('#c-target')?.focus(), 50); }
  function close() { modal.classList.remove('open'); }

  function renderAgentDocs() {
    const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/dispatches`;
    $('#agent-contribute').textContent = `curl -X POST ${url} \\
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \\
  -d '{
    "event_type": "contribute",
    "client_payload": {
      "target": "nmap",
      "op": "append",
      "tags": ["udp"],
      "body": "## Scan UDP\\n- nmap -sU lent mais essentiel\\n\\n\`\`\`bash\\nsudo nmap -sU --top-ports 20 IP\\n\`\`\`"
    }
  }'`;
    $('#agent-create').textContent = `curl -X POST ${url} \\
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \\
  -d '{
    "event_type": "add-room",
    "client_payload": {
      "title": "Blue", "category": "rooms", "platform": "THM", "difficulty": "Easy",
      "tags": ["smb", "eternalblue"], "summary": "EternalBlue sur SMB.",
      "body": "## Recon\\nnmap -sC -sV IP\\n\\n## Privesc\\ngetsystem"
    }
  }'`;
    $('#agent-targets').textContent = index.entries.map((e) => `${e.id}`).join('  ·  ');
  }

  async function submit() {
    const status = $('#ingest-status');
    const token = $('#f-token').value.trim();
    if (!token) return setStatus(status, 'err', 'Token manquant.');
    if ($('#f-remember').checked) safeSet(TOKEN_KEY, token); else safeRemove(TOKEN_KEY);

    let eventType, payload;
    if (mode === 'complete') {
      const op = $('#c-op').value;
      const body = $('#c-body').value.trim();
      const heading = $('#c-after').value;
      if (BODY_OPS.includes(op) && !body) return setStatus(status, 'err', 'Ajoute du contenu.');
      if (SECTION_OPS.includes(op) && !heading) return setStatus(status, 'err', 'Choisis une section cible.');
      if (op === 'delete' && !confirm(`Supprimer définitivement la note « ${targetSel.value} » ? (récupérable via git)`)) return;
      if (op === 'delete-section' && !confirm(`Supprimer la section « ${heading} » ?`)) return;
      payload = {
        target: targetSel.value,
        op,
        after: op === 'after' ? heading : undefined,
        section: (op === 'replace-section' || op === 'delete-section') ? heading : undefined,
        tags: splitTags($('#c-tags').value),
        body: BODY_OPS.includes(op) ? body : undefined,
      };
      eventType = 'contribute';
    } else {
      const title = $('#f-title').value.trim();
      const body = $('#f-body').value.trim();
      if (!title) return setStatus(status, 'err', 'Titre manquant.');
      if (!body) return setStatus(status, 'err', 'Contenu manquant.');
      payload = {
        title,
        category: $('#f-category').value,
        platform: $('#f-platform').value,
        difficulty: $('#f-difficulty').value,
        tags: splitTags($('#f-tags').value),
        summary: $('#f-summary').value.trim(),
        body,
        slug: slugify(title),
      };
      eventType = 'add-room';
    }

    setStatus(status, '', 'Envoi en cours…');
    $('#ingest-submit').disabled = true;
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/dispatches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, client_payload: payload }),
      });
      if (res.status === 204) {
        setStatus(status, 'ok', '✓ Envoyé ! Le site se met à jour dans ~1 min.');
        $('#c-body').value = ''; $('#f-body').value = ''; $('#f-title').value = '';
      } else if (res.status === 401 || res.status === 403) {
        setStatus(status, 'err', `Token refusé (${res.status}). Vérifie les droits Contents: write.`);
      } else if (res.status === 404) {
        setStatus(status, 'err', 'Dépôt introuvable (404). Vérifie config.js et les droits du token.');
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

function splitTags(s) { return String(s || '').split(',').map((t) => t.trim()).filter(Boolean); }
function setStatus(el, cls, msg) { el.className = 'status-msg ' + cls; el.textContent = msg; }
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); const t = btn.textContent; btn.textContent = '✓ Copié'; setTimeout(() => (btn.textContent = t), 1400); } catch { /* noop */ }
}
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* noop */ } }
function safeRemove(k) { try { localStorage.removeItem(k); } catch { /* noop */ } }
