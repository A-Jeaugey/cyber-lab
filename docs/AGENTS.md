# Alimenter le Cyber Lab (pour agents IA)

Deux gestes possibles :

| Geste | Quand | `op` / event |
|---|---|---|
| **Compléter / modifier** une note existante | J'ai appris un truc sur un sujet déjà présent (nmap, privesc…) | `target` + `op` |
| **Créer** une note ou une box | Nouvelle box poppée en training, ou nouveau sujet | `title` (+ `category`) |

La liste des notes existantes (valeurs de `target`) est dans `content/index.json`
(champ `entries[].id`) — ex : `nmap`, `linux-terminal`, `privilege-escalation`.

---

## ✅ Voie A — agent DISTANT sans accès au repo (le cas courant)

Tu es un agent qui n'a PAS le repo et à qui on **ne doit pas** confier un token
GitHub ? C'est le cas normal. On passe par un **proxy** : l'utilisateur héberge
un mini-Worker qui garde SON token GitHub côté serveur, et te donne seulement
une **clé de lab** (une chaîne dédiée, révocable, qui ne sait faire qu'ajouter
une note à ce lab). Tu n'as **jamais** le token GitHub.

```
toi  ──(clé de lab)──►  Worker  ──(token GH, secret serveur)──►  GitHub
```

Tu appelles l'URL du Worker avec la clé de lab dans l'en-tête `x-lab-key` :

```bash
curl -X POST "$LAB_URL" \
  -H "x-lab-key: $LAB_KEY" -H "content-type: application/json" \
  -d '{ "target": "nmap", "op": "append",
        "body": "## Scan UDP\n- nmap -sU --top-ports 20 IP" }'
```

Créer une box : même appel avec `title` + `category` au lieu de `target`.
Mise en place du Worker (côté utilisateur) : [`ingest/README.md`](../ingest/README.md).

> ⚠️ **Ne demande jamais le token GitHub à l'utilisateur.** S'il n'a pas encore
> de proxy, dis-lui d'en déployer un (`ingest/`), ou de coller lui-même ta note
> dans le formulaire du site. Toi, tu ne portes que la clé de lab.

## Voie B — agent qui a DÉJÀ le repo (commit direct, sans token)

Si tu opères dans un checkout du dépôt (tu peux éditer des fichiers et `git push`),
tu n'as besoin d'aucun token : le `git push` utilise l'auth git de la session.

```bash
node scripts/add-room.mjs --local --commit --target nmap --op append --body-file appris.md
node scripts/add-room.mjs --local --commit --title "Blue" --category rooms --body-file writeup.md
```

`--local --commit` = écrit le `.md` + régénère l'index + `git add`/`commit`/`push`.

## Voie C — l'utilisateur tient lui-même le token

Le formulaire du site (bouton `+`) et l'appel `repository_dispatch` direct
utilisent un token GitHub — mais c'est **l'utilisateur** qui le saisit, dans son
navigateur ou son shell, jamais un agent distant.

### Endpoint direct (event `contribute` ou `add-room`)

```http
POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches
Authorization: Bearer <TOKEN saisi par l'utilisateur>
Accept: application/vnd.github+json
```

Réponse attendue : **HTTP 204**. Le workflow applique le changement, régénère
l'index et redéploie (~1 min).

## Opérations (`op`) pour modifier une note

| `op` | Effet | Champs requis |
|---|---|---|
| `append` *(défaut)* | Ajoute des sections **à la fin** | `body` |
| `after` | Insère **après** une section existante | `after`, `body` |
| `replace-section` | Réécrit **une** section | `section`, `body` |
| `delete-section` | Supprime **une** section | `section` |
| `replace` | Réécrit **tout** le corps | `body` |
| `delete` | Supprime **la note entière** | *(rien)* |

`section` / `after` = le **titre** exact de la section (ex : `"Types de scan"`).
Les `tags` fournis sont fusionnés ; `updated` est mis à jour automatiquement.

## Exemples

### Compléter une note (apprentissage)

```bash
curl -X POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{
    "event_type": "contribute",
    "client_payload": {
      "target": "nmap",
      "op": "append",
      "tags": ["udp"],
      "body": "## Scan UDP cheat\n- `nmap -sU --top-ports 20 IP` pour aller vite"
    }
  }'
```

### Insérer après une section précise

```json
{ "event_type": "contribute",
  "client_payload": { "target": "nmap", "op": "after", "after": "Types de scan",
    "body": "### -sn (ping scan)\nDécouverte d'hôtes sans scan de ports." } }
```

### Réécrire ou supprimer une section

```json
{ "event_type": "contribute",
  "client_payload": { "target": "nmap", "op": "replace-section",
    "section": "Types de scan", "body": "## Types de scan\nContenu mis à jour." } }
```

```json
{ "event_type": "contribute",
  "client_payload": { "target": "nmap", "op": "delete-section", "section": "NSE scripts" } }
```

### Créer une box de training (avec writeup)

```bash
curl -X POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{
    "event_type": "add-room",
    "client_payload": {
      "title": "Blue", "category": "rooms", "platform": "THM", "difficulty": "Easy",
      "tags": ["smb", "eternalblue", "privesc"],
      "summary": "EternalBlue (MS17-010) sur SMB, SYSTEM direct.",
      "body": "## Recon\n`nmap -sC -sV IP`\n\n## Foothold\nMS17-010 => EternalBlue\n\n## Privesc\nDéjà SYSTEM."
    }
  }'
```

## CLI équivalente (dans le repo)

```bash
# Compléter
GH_TOKEN=xxx node scripts/add-room.mjs --target nmap --op append --body-file appris.md
GH_TOKEN=xxx node scripts/add-room.mjs --target nmap --op delete-section --section "NSE scripts"

# Créer
GH_TOKEN=xxx node scripts/add-room.mjs --title "Blue" --category rooms --platform THM \
  --difficulty Easy --tags "smb,privesc" --body-file writeup.md

# Écriture locale (sans réseau) + rebuild index
node scripts/add-room.mjs --local --target nmap --body "### Astuce\n..."
```

## Catégories (= les « sections » du site)

Sujets existants : `linux` · `windows` · `networking` · `recon` · `exploitation` ·
`web` · `postexploit` · `cryptohash` · `scripting` · `rooms` (boxes de training).

- `category: rooms` → fichier dans `content/rooms/`
- autre catégorie → `content/cheatsheets/`

### Créer une NOUVELLE section (nouveau sujet)

Il suffit de créer une note avec une `category` **inédite** : la section apparaît
automatiquement dans la sidebar et le répertoire. Ajoute `categoryLabel` (et
éventuellement `categoryBlurb`) pour son affichage — sinon le libellé est dérivé
de l'id.

```json
{ "event_type": "add-room",
  "client_payload": {
    "title": "Autopsy — bases", "category": "forensics",
    "categoryLabel": "Forensics & DFIR",
    "categoryBlurb": "Analyse post-mortem, artefacts, timeline.",
    "tags": ["forensics"], "body": "## Montage d'image\n- ewfmount ..." } }
```

```bash
node scripts/add-room.mjs --local --commit --title "Autopsy — bases" \
  --category forensics --category-label "Forensics & DFIR" \
  --category-blurb "Analyse post-mortem, artefacts." --body-file notes.md
```

> Rappel : ajouter des sections `##` **dans** une note existante = `op: append`
> (ou `after`). Créer un **sujet** = une note avec une nouvelle `category`.

## Conventions de contenu

- Une section = un titre `##` (ou `###`). Elle devient cherchable individuellement.
- Blocs de code avec langage pour la coloration : `bash`, `powershell`, `sql`, `python`, `javascript`.
- Pour une box : structure `## Recon` / `## Foothold` / `## Privesc` conseillée.

Schéma JSON complet : [`content/schema.json`](../content/schema.json).
