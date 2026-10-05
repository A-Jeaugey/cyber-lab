---
title: "Modern Web Stacks"
category: rooms
icon: "🧱"
difficulty: "Easy"
platform: "THM"
status: "Terminée"
tags: [web, fingerprinting, prototype-pollution, nextjs, django, apache, cve, nikto, rce, sqli]
summary: "Identifier 4 stacks web (MERN, Next.js, Django, LAMP) par recon HTTP passive, puis exploiter la vuln propre a chacune (prototype pollution, CVE-2025-29927, CVE-2021-35042, CVE-2021-41773)."
updated: 2026-10-05
source: agent
---

> Room guidée : identifier la stack d'une application web par recon HTTP passive, puis exploiter la vulnérabilité propre à chaque stack. 4 stacks, 4 ports, 4 vulns.

## Principe

Chaque technologie web laisse des **empreintes passives** : en-têtes HTTP, cookies, bannière serveur, artefacts dans le HTML, comportement des pages d'erreur. On identifie la stack *sans envoyer de payload d'exploitation*, on confirme la version, puis on vise la vulnérabilité connue de cette stack/version. Recon d'abord, exploit ensuite.

## Fingerprinting — signaux par stack

| Stack | Port (lab) | Signaux d'identification |
|---|---|---|
| **MERN** (Mongo / Express / React / Node) | 3000 | En-tête `X-Powered-By: Express` · cookie de session `connect.sid` |
| **Next.js** (React SSR / RSC) | 3001 | En-têtes `X-Powered-By: Next.js`, `x-nextjs-cache` · artefact HTML `window.__next_f` (hydratation App Router) |
| **Django** (Python) | 8000 | Bannière `WSGIServer/0.2 CPython/3.x` · champ caché `csrfmiddlewaretoken` dans les formulaires |
| **LAMP** (Apache / MySQL / PHP) | 8080 | En-tête `Server: Apache/2.4.49 (Unix)` · `/cgi-bin/` répond **403** (et non 404) = `mod_cgi` présent |

Lecture des en-têtes : `curl -I http://IP:PORT` ou `curl -s -D - http://IP:PORT -o /dev/null`.

## Exploitation — vulnérabilité par stack

### MERN (port 3000) — Prototype Pollution
- Classe de vulnérabilité JavaScript (pas une CVE numérotée ici, c'est l'appli du lab).
- Injecter `"__proto__": {"isAdmin": true}` dans un endpoint qui fusionne (`merge`) du JSON côté serveur.
- La propriété pollue `Object.prototype` : tous les objets héritent de `isAdmin: true` → élévation vers un compte admin.
- Rejouer ensuite les requêtes protégées avec le cookie de session `connect.sid`.

### Next.js (port 3001) — CVE-2025-29927 (bypass d'auth middleware)
- Le middleware Next.js (qui gère auth / redirections) peut être court-circuité par un en-tête forgé.
- En-tête : `x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware` (segments répétés pour dépasser le compteur interne).
- Résultat : accès direct à une route protégée (ex. `/dashboard`) sans authentification.

### Django (port 8000) — CVE-2021-35042 (injection SQL)
- Injection SQL via un paramètre `order` non filtré (fonctionnalité GIS de Django).
- Payload type : `?order=...ORDER BY (CASE WHEN ... THEN ... END)...` pour extraire le contenu de la base en conditionnel/blind.
- Exploitation manuelle au `curl`.

### LAMP / Apache 2.4.49 (port 8080) — CVE-2021-41773 (path traversal → RCE)
- Version Apache vulnérable + `mod_cgi` activé = lecture de fichier arbitraire puis exécution de commande.
- Clé : `curl --path-as-is` pour empêcher curl de normaliser l'URL (sinon le payload est cassé).
- Lecture de fichier : `/.%2e/.%2e/.%2e/.%2e/etc/passwd`.
- RCE : cibler `/cgi-bin/` → `/.%2e/.%2e/.%2e/.%2e/bin/sh` en POST pour exécuter une commande.

## Automatisation

- **Nikto** (`nikto -h http://IP:PORT`) : scanner de serveur web. Remonte la bannière serveur, l'en-tête `X-Powered-By`, les en-têtes de sécurité manquants et des répertoires connus. Lancé sur plusieurs ports, il donne une vue d'ensemble rapide des stacks.
- Limite essentielle : un scanner indique **ce qui** tourne, pas **comment** l'exploiter. Il accélère le fingerprinting, il ne remplace pas l'analyse.
- Même registre : `whatweb http://IP:PORT` (fingerprint de technologies) et l'extension navigateur **Wappalyzer**.

## Réflexes acquis

- **Réflexe** : lire les en-têtes AVANT tout (`curl -I`). `X-Powered-By`, `Server` et les cookies (`connect.sid` = Express, `csrftoken`/`sessionid` = Django) trahissent la stack gratuitement.
- **Réflexe** : un artefact dans le HTML source (`window.__next_f`, `csrfmiddlewaretoken`) est un marqueur de framework quasi certain.
- **Réflexe** : un code de retour anormal est un indice — `/cgi-bin/` en 403 au lieu de 404 signale que le module est présent.
- **Réflexe** : stack + version identifiées → chercher la CVE connue de CETTE version (`searchsploit`, base CVE) plutôt que de bruteforcer à l'aveugle.
- **Réflexe** : `curl --path-as-is` dès qu'un exploit dépend de `../` ou d'un encodage dans l'URL.
