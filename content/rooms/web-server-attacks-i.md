---
title: "Web Server Attacks - I"
category: rooms
icon: "🌐"
difficulty: "Medium"
platform: "THM"
status: "Terminée"
tags: [web, recon, fingerprinting, apache, nginx, nodejs, python, misconfiguration, backup, nikto]
summary: "Recon de 4 serveurs web (Apache, Nginx, Node.js, Python) sur une meme machine : identifier versions, listings de repertoire, endpoints debug, fichiers de backup exposes et en-tetes manquants, sans exploitation."
updated: 2026-10-05
source: agent
---

> Room guidée (pas une box) : quatre serveurs web sur une seule machine, chacun avec sa misconfiguration. Objectif = recon pure, identifier le serveur + sa version + ses fuites, SANS exploitation (ni shell, ni privesc). C'est le prérequis de tout ce qui suit.

## Principe

Un serveur web mal configuré fuit des infos avant même toute attaque : bannière de version dans les en-têtes, listing de répertoire activé, pages de statut/debug ouvertes, fichiers de backup oubliés, en-têtes de sécurité manquants. On lit, on note, on comprend la surface d'attaque. « Parfois c'est un serveur Python lancé par un dev il y a deux ans et jamais éteint. »

## Les 4 serveurs (tous sur la même machine)

| Port | Serveur | Misconfiguration principale | Trouvaille |
|---|---|---|---|
| 80 | Apache 2.4.58 | `mod_status` activé (`/server-status`) + `Options +Indexes` sur `/files/` | listing → `internal-notes.txt` |
| 3000 | Node.js Express | endpoints de debug ouverts | `/api/routes`, `/api/debug/env` (fuite de variables d'env) |
| 8000 | Python `http.server` | listing de répertoire avec dotfiles exposés | `.env` (creds DB) + `backup.zip` |
| 8080 | Nginx 1.24.0 | `autoindex on` + `stub_status` | `/nginx_status` (métriques) + `/files/` → `server-config.txt` |

## Fingerprinting — en-têtes

Lecture rapide des en-têtes, serveur par serveur :
```bash
curl -sI http://IP:PORT        # -s silencieux, -I en-têtes seulement (HEAD)
```
- Apache : `Server: Apache/2.4.58 (Ubuntu)`
- Python : `Server: SimpleHTTP/0.6 Python/3.12.3`
- Node : en-tête `X-Powered-By` qui trahit le framework
- Nginx : `Server: nginx/1.24.0`

## Détail par serveur

### Apache (port 80)
- `/server-status` (module `mod_status`) : expose les connexions en cours, les URL visitées, les IP clientes.
- `/files/` avec `Options +Indexes` : listing de répertoire → `internal-notes.txt`.

### Node.js Express (port 3000)
- `/api/routes` : liste TOUTES les routes enregistrées de l'appli — recon gratuite, pas besoin de scanner.
- `/api/debug/env` : laissé ouvert, fuite les variables d'environnement (dont des creds DB).
- `/config.js` statique : révèle des hostnames internes.

### Python http.server (port 8000)
- `http.server` sert le répertoire courant tel quel, listing activé par défaut, dotfiles compris.
- `.env` exposé → `DATABASE_URL=postgresql://webapp:...@localhost/production`.
- `backup.zip` exposé → une fois extrait (`unzip`), contient un `db_dump.sql` (dump de base = mine de creds/hashs).

### Nginx (port 8080)
- `/nginx_status` (`stub_status`) : métriques de connexions.
- `/files/` avec `autoindex on` : listing → `server-config.txt`.

## Problème transversal
- En-tête `X-Frame-Options` manquant sur les 4 services → clickjacking possible.

## Automatisation
- `nikto -h http://IP:PORT` : remonte le listing Apache (« Directory indexing found », CWE-548), les en-têtes manquants, la bannière serveur.
- `curl -sI` reste l'outil de base pour le fingerprint manuel rapide.

## Réflexes acquis

- **Réflexe** : plusieurs ports web ouverts = plusieurs serveurs distincts à énumérer un par un, pas un seul. Chaque port a sa propre stack et ses propres fuites.
- **Réflexe** : un fichier de backup oublié (`backup.zip`, `.bak`, `.old`, `.sql`) sur un serveur web = jackpot. Toujours le télécharger et l'extraire — un `db_dump.sql` donne souvent des creds/hashs pour la suite.
- **Réflexe** : un serveur Python `http.server` exposé sert le dossier courant TEL QUEL, dotfiles (`.env`) compris. Toujours tester `.env`, `.git/`, fichiers cachés.
- **Réflexe** : sur une appli Node/Express, tester les endpoints de debug (`/api/routes`, `/api/debug/env`, `/debug`) — souvent laissés ouverts en prod par oubli.
- **Réflexe** : les pages de statut (`/server-status` Apache, `/nginx_status`) sont de la recon offerte — connexions, URL, IP. À checker systématiquement.
- **Réflexe** : recon ≠ exploitation. Cartographier d'abord toute la surface (versions, listings, fuites) avant de lancer le moindre exploit.
