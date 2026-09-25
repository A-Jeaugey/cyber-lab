<div align="center">

# 🛡️ Cyber Lab

**Le lab cyber d'Arthur** — notes TryHackMe & pentest rangées par sujet,
cherchables en deux frappes, enrichies par des agents IA via un simple token.

*Site statique · zéro dépendance runtime · offline-first · déployable sur GitHub Pages*

</div>

---

## ✨ Ce que fait le site

- **Chaque sujet séparé** — 22 notes réparties en 10 catégories (Linux, Windows/AD,
  Networking, Recon, Exploitation, Web/SQLi, Privesc, Crypto/Hashing, Scripting, Rooms).
- **Recherche instantanée** — palette de commandes (`Ctrl/Cmd + K` ou `/`) avec
  recherche floue **section par section** : tu retrouves n'importe quelle notion
  (commande, réflexe, room) en quelques lettres et tu sautes direct au bon endroit.
- **Navigation** — sidebar par catégorie, table des matières avec scrollspy,
  fil d'Ariane, précédent/suivant, filtrage par tag.
- **Rendu soigné** — Markdown maison (titres ancrables, tables, blocs de code avec
  coloration syntaxique bash/powershell/sql/python/js + bouton copier).
- **Ingestion par tes agents IA** — ajout d'une room **sans login, avec un token seul**
  (voir plus bas).
- **PWA offline** — installable, fonctionne sans connexion après la première visite.
- **Thème sombre / clair**, responsive mobile, animations, accessible.

Le tout **sans aucun framework ni CDN** : HTML/CSS/JS natif + quelques scripts Node
pour l'indexation. Rien à builder pour que ça tourne.

---

## 🚀 Lancer en local

```bash
# 1. (Re)générer l'index de recherche
node scripts/build-index.mjs

# 2. Servir le dossier (n'importe quel serveur HTTP statique)
python3 -m http.server 8123
#   → http://localhost:8123

# raccourci : npm run dev  (build + serve)
```

> Il faut un serveur HTTP (pas d'ouverture `file://`) car le site charge
> `content/index.json` en `fetch` et utilise des modules ES.

---

## 🧠 Alimenter le lab (toi ou tes agents IA)

**Sans login, token seul** : l'événement GitHub `repository_dispatch`. Deux gestes.

| Geste | Quand | Event |
|---|---|---|
| **Compléter / modifier** une note existante | J'ai appris un truc sur un sujet déjà là (nmap, privesc…) | `contribute` |
| **Créer** une note ou une box de training | Nouvelle box poppée, ou nouveau sujet | `add-room` |

Le workflow applique le changement, régénère l'index et redéploie (~1 min).

### Depuis le site
Bouton **« ＋ »** → *Formulaire* : colle un token GitHub (Contents: read & write),
choisis **Compléter une note** ou **Nouvelle note / box**, envoie.

### Compléter une note existante (apprentissage)

```bash
curl -X POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{ "event_type": "contribute",
        "client_payload": { "target": "nmap", "op": "append", "tags": ["udp"],
          "body": "## Scan UDP\n- nmap -sU --top-ports 20 IP" } }'
```

Opérations (`op`) : `append` (défaut) · `after` (après une section) ·
`replace-section` · `delete-section` · `replace` (tout le corps) · `delete`
(la note entière). Voir [`docs/AGENTS.md`](docs/AGENTS.md).

### Créer une box de training (avec writeup)

```bash
curl -X POST https://api.github.com/repos/a-jeaugey/cyber-lab/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  -d '{ "event_type": "add-room",
        "client_payload": { "title": "Blue", "category": "rooms", "platform": "THM",
          "difficulty": "Easy", "tags": ["smb"], "body": "## Recon\nnmap -sC -sV IP" } }'
```

### CLI équivalente

```bash
GH_TOKEN=xxx node scripts/add-room.mjs --target nmap --op append --body-file appris.md
GH_TOKEN=xxx node scripts/add-room.mjs --title "Blue" --category rooms --body-file writeup.md
node scripts/add-room.mjs --local --target nmap --body "### Astuce\n..."   # sans réseau
```

📄 Contrat complet : [`docs/AGENTS.md`](docs/AGENTS.md) ·
schéma : [`content/schema.json`](content/schema.json).

---

## 📁 Structure

```
cyber-lab/
├── index.html                 # app shell
├── sw.js                      # service worker (offline)
├── assets/
│   ├── css/styles.css         # design system (sombre/clair)
│   ├── icons/                 # favicon + icône PWA (SVG)
│   ├── manifest.webmanifest
│   └── js/
│       ├── app.js             # routeur, vues, palette, scrollspy
│       ├── markdown.js        # rendu Markdown + coloration (maison)
│       ├── search.js          # moteur de recherche floue
│       ├── ingest.js          # modal d'ajout de room
│       └── config.js          # dépôt cible (owner/repo/branch)
├── content/
│   ├── cheatsheets/*.md       # notes par sujet (frontmatter + Markdown)
│   ├── rooms/*.md             # write-ups de box
│   ├── index.json             # index généré (métadonnées + recherche)
│   └── schema.json            # schéma du payload d'ingestion
├── scripts/
│   ├── build-index.mjs        # scanne content/ → index.json
│   ├── roomfile.mjs           # logique create/append/replace/delete d'une note
│   ├── write-note.mjs         # utilisé par le workflow (repository_dispatch)
│   └── add-room.mjs           # CLI pour agents / usage local
└── .github/workflows/
    ├── deploy.yml             # build + déploiement Pages
    └── add-room.yml           # ingestion repository_dispatch
```

### Format d'une note

```markdown
---
title: Nmap — le scanner
category: recon
icon: 📡
difficulty: Essentiel
tags: [nmap, scanning, recon]
summary: Une phrase de résumé.
updated: 2026-09-25
source: cheatsheet
---

## Une section
Contenu **Markdown** normal, avec blocs de code, tables, listes…
```

Chaque titre `##` devient une section indexée et cherchable individuellement.

---

## 🌐 Déploiement (GitHub Pages)

1. Pousse le dépôt sur GitHub (`a-jeaugey/cyber-lab`).
2. **Settings → Pages → Source = GitHub Actions**.
3. Un push sur `main` déclenche `deploy.yml` (build de l'index + publication).
4. Pour l'ingestion par token : crée un **fine-grained PAT** (Contents: read & write)
   et donne-le à tes agents. Le workflow `add-room.yml` fait le reste.

> Si tu forkes vers un autre dépôt, mets à jour `assets/js/config.js`
> (`owner`, `repo`, `branch`) et l'URL dans `docs/AGENTS.md`.

---

## ⌨️ Raccourcis

| Touche | Action |
|---|---|
| `Ctrl/Cmd + K` ou `/` | Ouvrir la recherche |
| `↑` `↓` | Naviguer dans les résultats |
| `↵` | Ouvrir le résultat |
| `Esc` | Fermer |

---

<div align="center">
<sub>Fait pour ranger des réflexes, pas pour ramasser des flags perdus. Bonne chasse. 🎯</sub>
</div>
