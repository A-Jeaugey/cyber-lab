# Ajouter une room au Cyber Lab (pour agents IA)

Ce dépôt accepte de nouvelles notes **sans login, avec un simple token**, via
l'événement GitHub `repository_dispatch`. Un agent n'a besoin ni de cloner le
dépôt, ni d'ouvrir une PR : un seul appel HTTP suffit.

## Ce dont tu as besoin

- Un token GitHub avec le droit **Contents: read & write** sur `a-jeaugey/cyber-lab`
  - Fine-grained token (recommandé), ou classic PAT avec le scope `repo`.
- Rien d'autre. Pas de session, pas de cookie.

## Appel à faire

```http
POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches
Authorization: Bearer <TOKEN>
Accept: application/vnd.github+json
Content-Type: application/json
```

Corps :

```json
{
  "event_type": "add-room",
  "client_payload": {
    "title": "Blue",
    "category": "rooms",
    "platform": "THM",
    "difficulty": "Easy",
    "status": "Terminée",
    "tags": ["smb", "eternalblue", "privesc"],
    "summary": "EternalBlue sur SMB (MS17-010), privesc SYSTEM direct via Metasploit.",
    "body": "## Pattern : SMB exposé\n- `nmap --script smb-vuln-* IP`\n- MS17-010 => EternalBlue\n\n## Privesc\n- Meterpreter `getsystem` puis `hashdump`"
  }
}
```

Réponse attendue : **HTTP 204** (accepté). Le workflow écrit la note, régénère
l'index et redéploie le site en ~1 minute.

## Exemple curl

```bash
curl -X POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d @room.json
```

## Exemple CLI (dans le repo)

```bash
GH_TOKEN=xxx node scripts/add-room.mjs \
  --title "Blue" --category rooms --platform THM --difficulty Easy \
  --tags "smb,eternalblue,privesc" \
  --summary "EternalBlue sur SMB, privesc SYSTEM." \
  --body-file ./notes/blue.md

# ou en écriture locale (sans réseau) :
node scripts/add-room.mjs --local --title "Blue" --body "## ..."
```

## Schéma du payload

| Champ        | Type       | Requis | Notes |
|--------------|------------|--------|-------|
| `title`      | string     | ✅     | Nom de la room / note |
| `category`   | string     | ❌     | `linux`, `windows`, `networking`, `recon`, `exploitation`, `web`, `postexploit`, `cryptohash`, `scripting`, `rooms` (défaut : `rooms`) |
| `platform`   | string     | ❌     | `THM`, `HTB`, … |
| `difficulty` | string     | ❌     | `Easy`, `Medium`, `Hard`, `Fondamentaux` |
| `status`     | string     | ❌     | `Terminée`, `En cours`, … |
| `icon`       | string     | ❌     | Emoji |
| `tags`       | string[]   | ❌     | Mots-clés (recherche) |
| `summary`    | string     | ❌     | Une phrase |
| `body`       | string     | ✅     | Markdown (titres `##`, listes, tables, blocs ```` ``` ````) |
| `slug`       | string     | ❌     | Sinon dérivé du titre |

Schéma JSON complet : [`content/schema.json`](../content/schema.json).

## Conventions de contenu

- Une note = un sujet. Découpe le corps en sections `##` (elles deviennent
  des points d'ancrage cherchables individuellement).
- Pour une room : le format « pattern / réflexe » marche bien (voir
  `content/rooms/vulnversity.md`).
- Les blocs de code indiquent le langage pour la coloration :
  `bash`, `powershell`, `sql`, `python`, `javascript`.

## Où atterrit la note

- `category: rooms` → `content/rooms/<slug>.md`
- toute autre catégorie → `content/cheatsheets/<slug>.md`

Le nom de fichier est dérivé du titre ; en cas de collision, un suffixe
numérique est ajouté (`blue-2.md`).
