---
title: "Burp Suite (module complet)"
category: web
icon: "🧰"
difficulty: "Fondamentaux"
platform: "THM"
status: "Terminée"
tags: [web, burp, proxy, repeater, intruder, decoder, http, bruteforce, outil]
summary: "Carte de reference Burp Suite (4 rooms THM) : quel module pour quoi (Proxy/Repeater/Intruder/Decoder/Comparer/Sequencer), les 4 types d'attaque Intruder, et les raccourcis cles."
updated: 2026-10-15
source: agent
---

> Module de 4 rooms (The Basics / Repeater / Intruder / Other Modules). Burp = un proxy qui se met ENTRE ton navigateur et le serveur : tu interceptes, inspectes, modifies, rejoues et bruteforce les requêtes HTTP. C'est la version outillée de tout ce qu'on fait à la main au curl.

## Setup
- Proxy sur `127.0.0.1:8080`. Soit le **navigateur Burp intégré** (le plus simple), soit Firefox + **FoxyProxy**.
- Pour le HTTPS : installer le **certificat CA de Burp** dans le navigateur (sinon erreurs TLS).

## Quel module pour quoi

| Module | À quoi ça sert |
|---|---|
| **Proxy** | Intercepte le trafic navigateur↔serveur. `Intercept on/off` + `HTTP history` (tout le trafic passé). |
| **Repeater** | Rejouer/modifier **UNE** requête à la main, voir la réponse. Ton labo pour tester un param encore et encore. |
| **Intruder** | **Automatiser** l'injection de payloads dans des positions marquées (fuzzing, bruteforce). |
| **Decoder** | Encoder/décoder : base64, URL, HTML, hex, ASCII. |
| **Comparer** | Diff entre 2 requêtes/réponses (repérer ce qui change). |
| **Sequencer** | Analyse l'aléa des tokens (session, CSRF) — sont-ils prédictibles ? |
| **Target / Site map** | Arbre du site découvert. |

## Intruder — les 4 types d'attaque (à connaître)
- **Sniper** : 1 liste de payloads, 1 position à la fois (fuzz d'UN paramètre).
- **Battering ram** : 1 liste, même payload dans TOUTES les positions en même temps.
- **Pitchfork** : N listes en parallèle (payload1[i] + payload2[i]) — jamais toutes les combos.
- **Cluster bomb** : N listes, TOUTES les combinaisons (bruteforce user × pass).

## Raccourcis qui font gagner du temps
- `Ctrl+R` : envoyer la requête vers **Repeater**
- `Ctrl+I` : envoyer vers **Intruder**
- `Ctrl+Space` : envoyer la requête (dans Repeater)
- Sélection + `Ctrl+U` / `Ctrl+Shift+U` : URL-encode / decode
- Sélection + `Ctrl+B` : base64-encode

## Réflexes acquis
- **Réflexe** : besoin de modifier/rejouer une requête HTTP → **Burp (Repeater)**, pas curl + l'enfer du quoting shell. Intercept, modifie, envoie.
- **Réflexe** : tester un même endpoint en boucle (changer un param, un header, un cookie) → `Ctrl+R` vers Repeater, c'est ton bac à sable.
- **Réflexe** : bruteforce de login = Intruder **Cluster bomb** (user × pass) ; fuzz d'un seul champ = **Sniper**.
- **Limite** : l'Intruder de la Community Edition est **bridé** (throttlé, lent). Pour du vrai bruteforce rapide → `ffuf` / `hydra`. Burp Intruder = pratique pour du ciblé, pas du volume.
