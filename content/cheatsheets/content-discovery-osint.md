---
title: "Content discovery & OSINT"
category: recon
icon: "🔎"
tags: [content-discovery, osint, google-dorking, wayback, github-recon, s3, recon]
summary: "Les 3 piliers du content discovery (manuel / automatisé / OSINT) + le bloc OSINT : Google dorking, Wayback Machine, GitHub recon (secrets leakés), buckets S3."
updated: 2026-10-02
source: agent
---

> Trouver le contenu caché d'une cible : pas seulement sur son serveur, mais **autour** d'elle (Google, archives, GitHub, cloud). Terrain clé en bug bounty.

## Les 3 piliers du content discovery

- **Manuel** : `robots.txt`, `sitemap.xml`, commentaires HTML, header `Server:`, favicon (son hash → identifie la techno).
- **Automatisé** : `gobuster` / `ffuf` / `feroxbuster` + wordlists (SecLists). → voir [[recon-bruteforce]].
- **OSINT** : chercher autour de la cible (ci-dessous).

## Google dorking

```
site:cible.com                 # tout ce que Google a indexé du domaine
site:cible.com filetype:pdf    # fichiers d'un type (pdf, xlsx, conf...)
intitle:"index of"             # listings de répertoires ouverts
inurl:admin                    # pages sensibles par mot-clé d'URL
site:cible.com -www            # exclure www → débusquer d'autres sous-domaines
```

## Wayback Machine (web.archive.org)

- Voir les **anciennes versions** d'un site → endpoints supprimés, pages oubliées, secrets laissés dans du vieux code encore en ligne.
- `waybackurls cible.com` → liste toutes les URLs archivées d'un domaine.

## GitHub recon

- Chercher le nom de la boîte / le domaine sur GitHub → **clés API, creds, configs** leakés dans des commits publics.
- Outils : recherche GitHub manuelle, `trufflehog`, `gitleaks`.

## Buckets S3 / cloud

- `cible.s3.amazonaws.com` & buckets mal configurés = fichiers exposés en lecture.

> **Réflexe** : le contenu caché n'est pas que sur le serveur cible. Google (dorks), les archives (Wayback), GitHub (secrets), le cloud (S3) sont du terrain de recon à part entière.
