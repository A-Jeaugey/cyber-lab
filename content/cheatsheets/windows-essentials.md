---
title: Windows — utilitaires, registre, firewall
category: windows
icon: 🧰
difficulty: Fondamentaux
tags: [windows, registry, firewall, persistence, msconfig, regedit]
summary: Raccourcis Win+R des consoles d'admin, clés Run du registre pour la persistance, et les trois profils du firewall Windows.
updated: 2026-09-25
source: cheatsheet
---

## Utilitaires (Win+R)

| Tool | Commande |
|---|---|
| System Config | `msconfig` |
| Computer Management | `compmgmt.msc` |
| Local Users/Groups | `lusrmgr.msc` |
| System Info | `msinfo32` |
| Resource Monitor | `resmon` |
| Registry Editor | `regedit` |
| Task Scheduler | `taskschd.msc` |
| Group Policy | `gpedit.msc` |

## Registry — persistance

Clés Run = auto-start au boot/login (technique malware classique) :
- `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` (machine)
- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` (user)

## Firewall — profils

- **Domain** : entreprise/AD
- **Private** : maison/lab (permissif)
- **Public** : wifi public (parano, défaut)
