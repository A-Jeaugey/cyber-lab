---
title: Active Directory
category: windows
icon: 🏛️
difficulty: Intermédiaire
tags: [active-directory, ad, kerberos, ntlm, kerberoasting, ntds, loot]
summary: Vocabulaire AD (DC, NTDS.dit, GPO, SYSVOL…), authentification Kerberos vs NetNTLM, attaques associées et loot prioritaire.
updated: 2026-09-25
source: cheatsheet
---

## Vocabulaire

| Terme | Définition |
|---|---|
| **Domain** | Groupe machines/users gérés centralement (ex : `thm.local`) |
| **DC** (Domain Controller) | Serveur qui run l'AD — *cible finale* en pentest AD |
| **AD DS** | Service AD qui tourne sur le DC |
| **NTDS.dit** | DB AD = tous les hashs de password du domaine. Loot ultime. |
| **OU** | Organizational Unit — conteneur pour grouper objets, recevoir GPOs |
| **GPO** | Group Policy Object — paramètres appliqués à une OU |
| **SYSVOL** | Partage `\\domain\SYSVOL` = stocke les GPOs (cherchable, parfois creds en clair) |
| **Forest** | Union de plusieurs domaines/trees |
| **Trust** | Relation entre domaines (lateral movement) |

## Authentification

**Kerberos** (moderne, défaut) :
- **TGT** = Ticket Granting Ticket (obtenu au login)
- **TGS** = Ticket Granting Service (pour un service spécifique)
- Password jamais en clair sur le réseau
- Attaques : Kerberoasting, AS-REP Roasting, Pass-the-Ticket, Golden Ticket (hash de `krbtgt` = god mode)

**NetNTLM** (legacy, encore là) :
- Plus faible que Kerberos
- Attaques : NTLM Relay, Pass-the-Hash

## Loot prioritaire en pentest AD

1. Hash `krbtgt` (Golden Ticket = persistence totale)
2. NTDS.dit (tous les hashs)
3. SYSVOL (anciennes GPOs avec creds, scripts de login)
4. Comptes Domain Admin
