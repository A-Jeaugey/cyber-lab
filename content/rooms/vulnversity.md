---
title: Vulnversity
category: rooms
icon: 🎓
platform: THM
difficulty: Easy
status: Terminée
tags: [nmap, file-upload, burp, php, reverse-shell, suid, privesc, systemctl]
summary: Réflexes acquis — rate limiting nmap sur réseau pourri, web sur port non-standard, upload mal filtré (le classique), reverse shell PHP préfait, privesc SUID via systemctl.
updated: 2026-09-25
source: room
---

> Une box = quelques réflexes. Ce que j'ai vu, le réflexe à acquérir, où il s'applique en général.

## Pattern : nmap rate limiting sur réseau pourri

- `--min-rate=5000` peut faire flipper le firewall → drop de paquets → scan qui s'étale en heures.
- Sur réseau lent / lycée / VPN, utiliser `--top-ports 5000` ou ports ciblés au lieu de `-p-` brut.
- L'AttackBox THM scanne *de l'intérieur* du réseau → 30 sec au lieu de 30 min.

## Pattern : web sur port non-standard

- Pas que 80/443 : le web tourne souvent sur 3333, 8080, 8000, 8888, 5000, 8443...
- Gobuster nécessite alors `-u http://IP:PORT/`, le port est obligatoire.

## Pattern : upload de fichier mal filtré (LE classique)

- Blacklist `.php` mais oublie les variantes → tester `.php3` `.php4` `.php5` `.phtml` `.phar` `.pht` `.phps`.
- Workflow Burp : intercept upload → Send to Intruder → marquer l'extension avec `§§` → Sniper attack → wordlist d'extensions.
- Lire la colonne **Length** des résultats : valeur différente = extension qui passe.

## Pattern : URL encoding par défaut de Burp Intruder

- Burp encode `.` en `%2e` automatiquement → casse les payloads d'extension.
- Fix : Payloads → décocher "URL-encode these characters" tout en bas.
- Réflexe : si Intruder donne des résultats louches, vérifier les requêtes envoyées dans l'onglet Request.

## Pattern : reverse shell PHP préfait

- `/usr/share/webshells/php/php-reverse-shell.php` sur Kali.
- Éditer `$ip` et `$port`, renommer avec une extension qui passe (ex `.phtml`).
- Upload puis visiter l'URL pour déclencher l'exécution.
- Listener UP **avant**.

## Pattern : privesc SUID

- `find / -perm -4000 2>/dev/null` = top réflexe sur tout shell Linux.
- Cross-check chaque binaire suspect sur **GTFOBins** (gtfobins.github.io).
- Légitimes courants : `sudo`, `passwd`, `mount`, `umount`, `su`, `chfn`, `chsh`, `ping`, `pkexec`.
- Cherche les anomalies : `systemctl`, `find`, `vim`, `nano`, `python`, `bash`, `nmap`, `tar`, `cp` en SUID = exploitable.

## Pattern : exploit systemctl SUID via faux service

- Créer un `.service` avec `ExecStart=` qui contient le payload root.
- `systemctl link /tmp/x.service` puis `systemctl enable --now`.
- Le service tourne en root → exécute le payload.
- Payload utile : nouveau reverse shell sur un autre port, ou `chmod +s` sur bash.

## Pattern : multi-listeners / multi-shells

- Workflow privesc = 2 shells côte à côte (un user, un root après escalade).
- Toujours utiliser des **ports différents** pour les listeners (4444 / 4445).
- `whoami` + `hostname` pour vérifier dans quel shell on est (piège classique : confondre AttackBox local et shell distant).
