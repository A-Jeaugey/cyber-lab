---
title: John the Ripper — cracker des hashes
category: cryptohash
icon: 🔓
difficulty: Essentiel
tags: [john, jtr, cracking, wordlist, rockyou, unshadow, hashcat]
summary: Modes de John du + rapide au + lent, forcer le format, cracker /etc/shadow via unshadow, cracker id_rsa/zip/rar et gestion du pot file.
updated: 2026-09-25
source: cheatsheet
---

**Concept** : prend une wordlist, hash chaque candidat, compare au hash cible. Millions/sec sur CPU.

## Ordre des modes (du plus rapide au plus lent)

```bash
john --single hash.txt                              # 1. Single (utilise user-related infos)
john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt   # 2. Wordlist
john --wordlist=/usr/share/wordlists/rockyou.txt --rules hash.txt   # 3. Wordlist + rules (x50)
john --incremental hash.txt                         # 4. Brute force (dernier recours)
```

## Forcer le format si l'auto-détection foire

```bash
john --format=raw-md5 --wordlist=rockyou.txt hash.txt
john --format=raw-sha256 ...
john --format=NT hash.txt              # Windows NTLM
john --format=sha512crypt hash.txt     # Linux $6$
john --format=bcrypt hash.txt          # bcrypt $2y$
john --list=formats                    # voir tous les formats supportés
```

## Cracker /etc/shadow

```bash
unshadow /etc/passwd /etc/shadow > unshadowed.txt
john --wordlist=rockyou.txt unshadowed.txt
```

`unshadow` merge passwd + shadow dans un format que John comprend (besoin du username pour `--single`).

## Cracker autre que des hashes nus

```bash
ssh2john id_rsa > id_rsa.hash && john --wordlist=rockyou.txt id_rsa.hash
zip2john archive.zip > archive.hash && john --wordlist=rockyou.txt archive.hash
rar2john archive.rar > archive.hash && john archive.hash
```

## Pot file

`~/.john/john.pot` stocke ce qui a été cracké.

- `john --show hash.txt` → voir les passwords déjà trouvés
- "No password hashes left to crack" = déjà cracké, faire `--show` d'abord
- Reset : `rm ~/.john/john.pot`

**Wordlist par défaut sur Kali** : `/usr/share/wordlists/rockyou.txt` (14M passwords leakés en 2009). Si compressée : `sudo gunzip /usr/share/wordlists/rockyou.txt.gz`.

> **Hashcat** : alternative GPU plus rapide. Même logique mais syntaxe différente (`-m <mode_number>` au lieu de `--format`).
