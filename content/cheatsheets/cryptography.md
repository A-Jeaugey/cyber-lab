---
title: Cryptographie — bases
category: cryptohash
icon: 🔐
difficulty: Fondamentaux
tags: [crypto, symmetric, asymmetric, rsa, aes, tls, kerckhoffs, caesar]
summary: Symétrique vs asymétrique, quelle clé pour quoi, TLS hybride, principe de Kerckhoffs, problème de la key distribution et chiffre de César.
updated: 2026-09-25
source: cheatsheet
---

## Symétrique vs Asymétrique

| | Symétrique | Asymétrique |
|---|---|---|
| Clés | 1 clé (partagée) | 2 clés (publique + privée) |
| Vitesse | Rapide (~1000x +) | Lent |
| Exemples | AES, ChaCha20 | RSA, ECC, Diffie-Hellman |
| Usage | Bulk data | Échange de clé, signatures |

## Asymétrique — qui utilise quelle clé

- **Confidentialité** : chiffrer avec la **clé publique du destinataire** → lui seul déchiffre (privée).
- **Signature** : signer avec **ta privée** → tout le monde vérifie avec ta publique.

## HTTPS / TLS = hybride

1. Asymétrique pour échanger une clé de session (Diffie-Hellman / ECDHE).
2. Symétrique (AES) pour le reste de la communication.

## Principe de Kerckhoffs (1883)

La sécurité repose UNIQUEMENT sur le secret de la clé, jamais sur celui de l'algo.

> Red flag absolu : un produit qui prétend chiffrer avec un "algo proprio secret".

## Problème résolu par l'asymétrique : Key distribution

Avant RSA (1977) : impossible de partager une clé symétrique sur un canal public sans qu'un attaquant l'intercepte. L'asymétrique = 2 inconnus établissent un secret partagé en parlant uniquement en clair. C'est ce qui rend HTTPS / internet sécurisé possible.

## Chiffre de César

Keyspace = 25, cassable en brute force ou par analyse de fréquence (E/T plus fréquents en EN/FR).
