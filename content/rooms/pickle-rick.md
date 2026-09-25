---
title: Pickle Rick
category: rooms
icon: 🥒
platform: THM
difficulty: Easy
status: Terminée
tags: [web, rce, lfi, command-injection, privesc, sudo, gobuster]
summary: Réflexes acquis — recon web manuel avant automatique, gobuster avec extensions, panel d'exécution = RCE déjà en main, sessions web sans état, privesc via sudo -l.
updated: 2026-09-25
source: room
---

> Une box = quelques réflexes. Ce que j'ai vu, le réflexe à acquérir, où il s'applique en général.

## Pattern : recon web manuel avant automatique

- View source HTML systématique sur toute page web → commentaires révélateurs (username trouvé dedans).
- `/robots.txt` et `/sitemap.xml` systématiques → souvent des "secrets" (password en clair ici).

## Pattern : gobuster avec extensions

- Gobuster sans `-x` rate les `.php` (et `.html`, `.txt`, `.bak`).
- Réflexe : Apache + Linux → tester `-x php,html,txt` direct.
- Apache + Windows → tester `-x asp,aspx`.

## Pattern : panel d'exécution = RCE

- Si une UI te laisse taper des commandes → tu as déjà une RCE, pas besoin d'en chercher une.
- Restrictions par blacklist se contournent : `cat` bloqué → `tac`, `head`, `less`, `more`, `nl`, `tail`, `awk '{print}'`, `od -c`, `grep . file`.

## Pattern : sessions web sans état

- Chaque commande dans un panel web s'exécute dans un shell vierge → `cd` ne persiste pas.
- Réflexe : utiliser des **paths absolus** systématiquement (`ls /home/user/` plutôt que `cd /home/user && ls`).
- Sinon chaîner avec `;` ou `&&`.

## Pattern : noms de fichiers avec espaces

- Espace = séparateur d'args en bash → `cat second ingredients` cherche 2 fichiers.
- Réflexe : guillemets `"second ingredients"` ou backslash `second\ ingredients`.

## Pattern : privesc Linux — premier réflexe absolu

- Sur **tout** shell Linux popé : `sudo -l` direct, sans réfléchir.
- `(ALL) NOPASSWD: ALL` = noël en juillet, privesc trivial.
- Autres réflexes privesc à explorer : SUID (`find / -perm -4000 2>/dev/null`), cron jobs, capabilities, kernel exploits.

## Pattern : si une porte est fermée, regarde s'il y en a une autre sur le même objet

- Le panel bloquait `cat fichier.txt` mais Apache servait `http://IP/fichier.txt` directement.
- Toujours penser à : accès via web vs panel vs SSH vs shell — chaque chemin a ses propres défenses.
