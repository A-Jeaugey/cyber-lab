---
title: Binaire, hexa, décimal & ASCII
category: scripting
icon: 🔢
difficulty: Fondamentaux
tags: [binary, hex, decimal, ascii, encoding, conversions]
summary: Repères de conversion binaire/hexa/décimal, méthodes de conversion, où l'on croise l'hexa en cyber, et table ASCII de référence.
updated: 2026-09-25
source: cheatsheet
---

## Conversions binaire / hexa / décimal

**Repères à connaître par cœur** :
- `FF` (hex) = `11111111` (bin) = `255` (dec) — 1 octet plein
- `FFFF` (hex) = `65535` (dec) — 2 octets pleins
- 1 digit hexa = 4 bits → 2 digits hexa = 1 octet
- 24 bits = 3 octets = 16 777 216 valeurs (≈16M couleurs RGB)

**Méthode de conversion (vers décimal)** :
- Binaire : somme des puissances de 2 (de droite à gauche : 2⁰, 2¹, 2²…)
- Hexa : somme des puissances de 16 — `AB` = 10×16 + 11 = 171
- Lettres hexa : A=10, B=11, C=12, D=13, E=14, F=15

**Où on croise l'hexa en cyber** : adresses MAC, dumps mémoire, codes couleurs, hashes (MD5/SHA), shellcodes (`\x90\xCC`), Wireshark, adresses IPv6.

## ASCII — repères à connaître

| Caractère | Décimal | Hexa |
|---|---|---|
| `A` | 65 | `0x41` |
| `a` | 97 | `0x61` |
| `0` | 48 | `0x30` |
| Espace | 32 | `0x20` |
| `\n` (newline) | 10 | `0x0A` |
| DEL (max) | 127 | `0x7F` |

- Diff maj/min = +32 (bit n°5)
- Texte lisible dans un dump hex = bytes entre `0x20` et `0x7E`
- Suite de `0x00` = padding
