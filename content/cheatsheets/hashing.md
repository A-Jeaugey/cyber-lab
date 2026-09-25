---
title: Hashing — algos, /etc/shadow, Windows, salt
category: cryptohash
icon: '#️⃣'
difficulty: Essentiel
tags: [hashing, md5, sha, ntlm, bcrypt, shadow, salt, rainbow-tables, pass-the-hash]
summary: Propriétés d'un hash, table des algos courants, format /etc/shadow Linux, hashes Windows/NTLM & Pass-the-Hash, rainbow tables et salt.
updated: 2026-09-25
source: cheatsheet
---

## Basics

**Hash ≠ chiffrement** : irréversible, pas de clé, one-way.

**Propriétés** : déterministe, effet avalanche (1 bit change → hash totalement différent), résistance aux collisions.

## Algos courants

| Algo | Output | Statut | Usage |
|---|---|---|---|
| MD5 | 32 hex | ☠️ cassé | Intégrité OK, jamais passwords |
| SHA-1 | 40 hex | ☠️ cassé | Legacy |
| SHA-256 | 64 hex | ✅ | Intégrité, Bitcoin, certificats |
| SHA-512 | 128 hex | ✅ | Intégrité, sha512crypt Linux |
| NTLM | 32 hex | ⚠️ | Windows (visuellement = MD5, contexte !) |
| bcrypt | ~60 chars | ✅ pour passwords | Web apps |
| Argon2 / scrypt / PBKDF2 | variable | ✅ top | Modernes, slow + memory-hard |

> **Rapide vs lent** : MD5/SHA-x = rapides → OK intégrité, KO passwords. bcrypt/Argon2 = lents par design → OK passwords.

**Aucun hash n'est "incassable"** : SHA-512 + salt résiste au brute force exhaustif et aux rainbow tables, mais un password faible (`password123`) tombe en quelques secondes via dictionnaire.

## Linux — /etc/shadow

Format : `user:$prefix$options$salt$hash:...`

| Prefix | Algo |
|---|---|
| `$1$` | md5crypt (vieux) |
| `$2a$`, `$2b$`, `$2y$` | bcrypt |
| `$5$` | sha256crypt |
| `$6$` | **sha512crypt** (très répandu) |
| `$7$` | scrypt |
| `$y$` | yescrypt (défaut moderne) |
| `$argon2id$` | Argon2 |

```bash
md5sum file / sha1sum / sha256sum / sha512sum    # calculer un hash
hashid 'hash_string'                              # identifier un hash inconnu
```

## Windows

- Hashes stockés dans **SAM** (`C:\Windows\System32\config\SAM`, locked en runtime).
- Format **NTLM** (variante MD4, visuellement identique à MD5 — contexte !).
- Dump : `mimikatz` (post-ex local), `secretsdump.py` (Impacket, à distance via SMB).
- **Pass-the-Hash (PtH)** : balance le hash NTLM au lieu du password, pas besoin de cracker — design flaw fondamental de NTLM.
- À distance : NTLM Relay (intercepter et relay un challenge auth).

## Rainbow tables & salt

- **Rainbow table** = base précalculée hash→password pour passwords communs. Tue tous les hashes non salés.
- **Salt** = random ajouté avant hash : `hash(password + salt)`. Stocké à côté du hash, pas secret, juste unique par user. Rend les rainbow tables inutiles.

**Identifier rapidement un hash en CTF/pentest** :
- Compte les caractères (32 hex = MD5/NTLM, 40 = SHA-1, 64 = SHA-256).
- `hashid` ou `hash-identifier` pour suggestions.
- Contexte : web DB → souvent MD5, /etc/shadow → format Linux, SAM → NTLM.
- Référence : hashcat example hashes.
- Online instant : hashes.com, crackstation.net (que pour hashes communs sans salt).
