---
title: "Concepts & méthodologie"
category: theory
icon: "📚"
tags: [cia, dad, kill-chain, frameworks, methodology, ptes, osstmm, nist, owasp, mitre, attack]
summary: "Théorie de référence : triades CIA/DAD, Cyber Kill Chain, frameworks de pentest (OSSTMM/OWASP/NIST/PTES/ISSAF) et MITRE ATT&CK."
updated: 2026-09-26
source: agent
categoryLabel: "Théorie & Méthodo"
categoryBlurb: "CIA/DAD, kill chain, frameworks de pentest, méthodo de mission — la théorie de référence."
---

> Section de référence : la théorie qui ne sert pas en pleine box, mais utile pour les partiels, les certifs (CPTS/OSCP), les entretiens et la culture générale.

## CIA & DAD

**CIA** — les 3 objectifs de la sécurité :
- **Confidentiality** : l'info n'est accessible qu'aux parties prévues.
- **Integrity** : les données sont exactes et non altérées.
- **Availability** : le service reste accessible quand on en a besoin.

**DAD** — les attaques miroir (ce qui casse chaque objectif) :
- **Disclosure** : fuite d'info → casse la Confidentiality.
- **Alteration** : modification des données → casse l'Integrity.
- **Destruction/Denial** : rendre indisponible → casse l'Availability.

## Cyber Kill Chain (Lockheed Martin)

Les 7 étapes d'une intrusion, vues côté attaquant :
1. **Reconnaissance** — collecte d'infos sur la cible.
2. **Weaponization** — préparer le payload (ex : doc piégé + exploit).
3. **Delivery** — livrer le payload (mail, USB, lien web).
4. **Exploitation** — déclencher la vulnérabilité.
5. **Installation** — poser une persistance (backdoor).
6. **Command & Control (C2)** — établir le canal de contrôle à distance.
7. **Actions on Objectives** — le but final (exfiltration, destruction, pivot).

> Idée clé : casser **un seul maillon** suffit à stopper l'attaque (côté défense).

## Frameworks de pentest (méthodologies standardisées)

| Framework | Focus |
|---|---|
| **OSSTMM** | Méthodo de test sécu (réseau, humain, physique, sans-fil) |
| **OWASP** (WSTG / MASTG) | Sécurité applicative web / mobile |
| **NIST SP 800-115** | Guide technique d'évaluation sécu (référence US gov) |
| **PTES** | Penetration Testing Execution Standard — les phases d'une mission |
| **ISSAF** | Information Systems Security Assessment Framework (assez daté) |

## PTES — les 7 phases d'une mission

1. **Pre-engagement** — scope, contrat, règles d'engagement.
2. **Intelligence Gathering** — reconnaissance.
3. **Threat Modeling** — modéliser les menaces / prioriser.
4. **Vulnerability Analysis** — identifier les vulns.
5. **Exploitation** — obtenir l'accès.
6. **Post-Exploitation** — privesc, pivot, valeur pour le client.
7. **Reporting** — le rapport, le vrai livrable qui justifie la mission.

## MITRE ATT&CK

- Base de connaissance des **TTP** (Tactics, Techniques, Procedures) réellement utilisés par les attaquants.
- Sert à structurer une attaque (offensif) et à mapper les détections (défensif).
- Différent d'une kill chain : c'est une matrice exhaustive de techniques, pas une séquence linéaire.
