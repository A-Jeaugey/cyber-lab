---
title: Nmap — le scanner
category: recon
icon: 📡
difficulty: Essentiel
tags: [nmap, scanning, recon, nse, ports, syn-scan]
summary: Scans de base à agressifs, workflow type de début de box, types de scan (-sS/-sT/-sU/-sV/-O) et scripts NSE.
updated: 2026-09-25
source: cheatsheet
---

> *Le* scanner — à utiliser dans **chaque** box.

```bash
# Scan de base (top 1000 TCP)
nmap 10.10.10.42

# Tous les ports
nmap -p- 10.10.10.42

# Combo classique : version + scripts par défaut
nmap -sC -sV 10.10.10.42

# Agressif (OS + version + scripts + traceroute)
nmap -A 10.10.10.42

# UDP (lent mais essentiel : DNS, SNMP, NTP)
sudo nmap -sU 10.10.10.42

# Si ICMP bloqué (skip host discovery)
nmap -Pn 10.10.10.42

# Plus rapide
nmap -T4 --min-rate=5000 10.10.10.42

# Sauvegarder
nmap -oA scan 10.10.10.42       # tous formats (.nmap .gnmap .xml)
```

## Scan typique début de box

```bash
nmap -sC -sV -oN initial 10.10.10.42                      # rapide
nmap -p- --min-rate=5000 -oN full 10.10.10.42             # complet en parallèle
```

## Types de scan

- `-sS` SYN half-open (default root, furtif)
- `-sT` TCP connect complet (default non-root)
- `-sU` UDP
- `-sn` ping scan uniquement
- `-sV` version
- `-O` OS

## NSE scripts (`/usr/share/nmap/scripts/`)

```bash
nmap --script=vuln 10.10.10.42                # vulns connues
nmap --script=http-enum 10.10.10.42           # énum web
nmap --script=smb-enum-shares 10.10.10.42     # shares Windows
```

Catégories : `default`, `safe`, `vuln`, `auth`, `brute`, `discovery`, `exploit`.
