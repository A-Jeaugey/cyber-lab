---
title: "Recon web & brute force — gobuster, hydra"
category: recon
icon: "🔨"
difficulty: "Essentiel"
tags: [gobuster, hydra, bruteforce, wordlists, directory, login, rockyou, ssh, imap, pop3, smtp]
summary: "Directory bruteforce avec gobuster (extensions, threads), brute force de login avec hydra (HTTP form/SSH/FTP) et wordlists classiques Kali."
updated: 2026-09-26
source: cheatsheet
---

## gobuster — dir bruteforce (trouver pages/dossiers cachés)

```bash
gobuster dir -u http://target.thm/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
gobuster dir -u http://target.thm/ -w wordlist.txt -x php,html,txt   # tester extensions
gobuster dir -u http://target.thm/ -w wordlist.txt -t 50              # 50 threads
```

Wordlists classiques (Kali) : `/usr/share/wordlists/dirb/common.txt`, `dirbuster/directory-list-2.3-medium.txt`, `SecLists/Discovery/Web-Content/`.

## hydra — brute force de login

```bash
# HTTP POST form (login web)
hydra -l admin -P passlist.txt target.thm http-post-form \
  "/login:username=^USER^&password=^PASS^:F=incorrect"

# SSH
hydra -l user -P passlist.txt ssh://target.thm

# FTP
hydra -L users.txt -P passlist.txt ftp://target.thm
```

- `-l` = login unique / `-L` = liste de logins
- `-p` = pass unique / `-P` = liste de pass
- `^USER^` et `^PASS^` = placeholders dans le payload
- `F=...` = string qui apparaît quand l'auth a **échoué** (sinon `S=...` pour succès)

Wordlist de mots de passe classique : `/usr/share/wordlists/rockyou.txt`

## Services & options avancées (Protocols & Servers 2)

```bash
hydra -l user -P /usr/share/wordlists/rockyou.txt IP <service>   # service = ftp/ssh/imap/pop3/smtp
hydra -l frank -P rockyou.txt 10.10.30.103 ssh
hydra -t 16 -l lazie -P rockyou.txt -vV 10.10.30.103 imap
```

- `-t N` : N connexions parallèles (accélère le brute force).
- `-s PORT` : cibler un port non-standard.
- `-vV` : verbose, voir chaque tentative login/pass.
- Hydra sait taper direct sur imap/pop3/smtp/ssh/ftp avec juste le mot-clé du service (pas que le http-post-form).
- Rappel : Hydra = brute force **online** (bruyant, loggé) ; pour un hash récupéré, passer offline (John/Hashcat).
