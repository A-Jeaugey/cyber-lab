---
title: Web — HTTP, méthodes, codes & headers
category: web
icon: 🕸️
difficulty: Essentiel
tags: [web, http, headers, cookies, status-codes, bypass-403, security-headers]
summary: Méthodes HTTP, codes de réponse prioritaires en pentest, bypass 403, anatomie d'URL, headers request/response, headers de sécurité et flags de cookies.
updated: 2026-09-25
source: cheatsheet
---

## HTTP basics

**Méthodes HTTP** : GET (récup, params en query string), POST (crée, body), PUT (remplace), PATCH (modifie), DELETE (supprime), HEAD (= GET sans body), **OPTIONS** (liste les méthodes autorisées — recon !), TRACE, CONNECT.

> ⚠️ Jamais de password/token en GET (loggés partout : historique, proxies, Referer).

**Response codes prioritaires en pentest** :
- **200** : OK
- **301/302** : redir (suis-la)
- **401** : auth requise
- **403** : existe mais interdit → 🎯 *cible prioritaire si isolé parmi des 404*
- **404** : n'existe pas
- **405** : méthode pas autorisée → essayer une autre méthode
- **500** : 🎯 *mine d'or* — stack traces, chemins absolus, infos DB

**Bypass 403 classiques** : headers `X-Forwarded-For`, `X-Original-URL`, encoding du path (`/admin/`, `/Admin`, `/admin/.`, `/admin%20`), méthode alternative (POST au lieu de GET).

**URL anatomy** :

```
scheme://user:pass@host:port/path?query#fragment
```

Le `#fragment` n'est JAMAIS envoyé au serveur (côté JS uniquement).

## Headers à connaître

**Request headers** :
- `Host` : domaine cible (vhost-based hosting)
- `User-Agent` : parfois filtré par WAF
- `Cookie` : tes sessions
- `Authorization` : Basic Auth, Bearer token
- `Referer` : page précédente (souvent vérifié anti-CSRF)
- `X-Forwarded-For` : usurpation IP fréquente

**Response headers** :
- `Server` : *info gratuite pour attaquant* (`Apache/2.4.49` = CVE-2021-41773 direct)
- `Set-Cookie` : voir flags ci-dessous
- `Content-Type` : MIME type

**Headers de sécurité** (absent = mauvaise hygiène) :
- `Strict-Transport-Security` (HSTS) : force HTTPS
- `Content-Security-Policy` (CSP) : mitigation XSS
- `X-Content-Type-Options: nosniff` : empêche MIME sniffing
- `X-Frame-Options` : anti-clickjacking
- `Referrer-Policy`, `Permissions-Policy`

**Cookie flags critiques** :
- `Secure` : HTTPS only
- `HttpOnly` : pas accessible via `document.cookie` (mitigation XSS principale)
- `SameSite=Strict/Lax/None` : mitigation CSRF

> **Pour le pentest** : cookies sans `HttpOnly` = exploitables via XSS. Sans `Secure` = downgrade HTTP. Sans `SameSite` = CSRF possible.
