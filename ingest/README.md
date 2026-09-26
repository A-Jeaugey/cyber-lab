# Proxy d'ingestion — pour agents distants sans accès au repo

Ce petit Worker Cloudflare permet à des agents IA **distants** (qui n'ont ni ton
repo, ni le droit de committer) d'ajouter/modifier une note **sans jamais
manipuler ton token GitHub**.

```
agent IA  ──(clé de lab)──►  Worker Cloudflare  ──(ton token GH, secret)──►  GitHub
```

L'agent n'a qu'une **clé de lab** (`INGEST_KEY`) : une chaîne que tu inventes,
qui ne sait faire qu'une seule chose — poster une note dans ce lab. Ton token
GitHub reste un secret stocké dans Cloudflare, jamais exposé à l'agent.

## Déploiement (≈ 2 min, gratuit)

Prérequis : un compte Cloudflare (gratuit) et Node.

```bash
cd ingest
npx wrangler login                       # ouvre le navigateur une fois

# 1) Ton token GitHub (fine-grained, Contents: read & write, sur ce repo)
npx wrangler secret put GITHUB_TOKEN     # colle le token quand demandé

# 2) La clé de lab que tu donneras aux agents (génère-en une au hasard)
#    ex : openssl rand -hex 24
npx wrangler secret put INGEST_KEY

# 3) Déploie
npx wrangler deploy
```

Wrangler affiche l'URL du Worker, par ex :
`https://cyber-lab-ingest.toncompte.workers.dev`

> Le token GitHub n'est saisi qu'ici, dans Cloudflare. Il ne part jamais vers
> un agent. Pour le révoquer : supprime le PAT sur GitHub et/ou
> `npx wrangler secret delete GITHUB_TOKEN`.

## Ce que tu donnes à tes agents

Uniquement **l'URL du Worker** et **la clé de lab** (`INGEST_KEY`). Pas le token GitHub.

### Compléter une note existante

```bash
curl -X POST https://cyber-lab-ingest.toncompte.workers.dev \
  -H "x-lab-key: $LAB_KEY" -H "content-type: application/json" \
  -d '{ "target": "nmap", "op": "append",
        "tags": ["udp"],
        "body": "## Scan UDP\n- nmap -sU --top-ports 20 IP" }'
```

### Créer une box de training

```bash
curl -X POST https://cyber-lab-ingest.toncompte.workers.dev \
  -H "x-lab-key: $LAB_KEY" -H "content-type: application/json" \
  -d '{ "title": "Blue", "category": "rooms", "platform": "THM",
        "difficulty": "Easy", "tags": ["smb"],
        "body": "## Recon\nnmap -sC -sV IP\n\n## Privesc\ngetsystem" }'
```

Réponse `{"ok":true}` → le Worker déclenche l'ingestion ; le site se met à jour
en ~1 min. Le schéma du payload (`target`, `op`, `section`, `after`, `title`,
`category`, `tags`, `summary`, `body`…) est identique à celui décrit dans
[`../docs/AGENTS.md`](../docs/AGENTS.md) et [`../content/schema.json`](../content/schema.json).

## Pourquoi c'est safe

- L'agent ne détient qu'une clé applicative révocable, scoppée à « ajouter une
  note à ce lab » — pas une clé d'écriture de ton compte GitHub.
- Le token GitHub vit uniquement dans Cloudflare (secret chiffré).
- La clé de lab se compare à temps constant côté Worker.
- Tu peux régénérer la clé de lab à tout moment (`wrangler secret put INGEST_KEY`)
  sans toucher au token GitHub.

## Alternative (Vercel / autre)

La logique tient en un fichier : recopie `worker.js` dans une fonction serverless
(Vercel `api/ingest.js`, Netlify, Deno Deploy…), lis `GITHUB_TOKEN`, `INGEST_KEY`
et `REPO` depuis les variables d'environnement de la plateforme, garde la même
vérification de clé et le même POST vers `/dispatches`.
