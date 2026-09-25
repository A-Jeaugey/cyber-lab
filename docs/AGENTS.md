# Alimenter le Cyber Lab (pour agents IA)

Le lab s'enrichit **sans login, avec un token seul**, via l'événement GitHub
`repository_dispatch`. Un agent n'a besoin ni de cloner le dépôt, ni d'ouvrir
une PR : un seul appel HTTP.

Deux gestes, un seul mécanisme :

| Geste | Quand | Event | Payload clé |
|---|---|---|---|
| **Compléter / modifier** une note existante | J'ai appris un truc sur un sujet déjà présent (nmap, privesc…) | `contribute` | `target` + `op` |
| **Créer** une note ou une box | Nouvelle box poppée en training, ou nouveau sujet | `add-room` | `title` (+ `category`) |

## Ce dont tu as besoin

- Un token GitHub avec **Contents: read & write** sur `a-jeaugey/cyber-lab`
  (fine-grained token recommandé, ou classic PAT scope `repo`).
- La liste des notes existantes (valeurs possibles de `target`) : lis
  `content/index.json` (champ `entries[].id`) — ex : `nmap`, `linux-terminal`,
  `privilege-escalation`, `hashing`, …

## Endpoint

```http
POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches
Authorization: Bearer <TOKEN>
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

## Catégories

`linux` · `windows` · `networking` · `recon` · `exploitation` · `web` ·
`postexploit` · `cryptohash` · `scripting` · `rooms` (boxes de training).

- `category: rooms` → fichier dans `content/rooms/`
- autre catégorie → `content/cheatsheets/`

## Conventions de contenu

- Une section = un titre `##` (ou `###`). Elle devient cherchable individuellement.
- Blocs de code avec langage pour la coloration : `bash`, `powershell`, `sql`, `python`, `javascript`.
- Pour une box : structure `## Recon` / `## Foothold` / `## Privesc` conseillée.

Schéma JSON complet : [`content/schema.json`](../content/schema.json).
