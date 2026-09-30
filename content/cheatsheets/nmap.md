---
title: "Nmap — le scanner"
category: recon
icon: "📡"
difficulty: "Essentiel"
tags: [nmap, scanning, recon, nse, ports, syn-scan, host-discovery, ping-scan, arp, firewall-evasion, idle-scan]
summary: "Scans de base à agressifs, workflow type de début de box, types de scan (-sS/-sT/-sU/-sV/-O) et scripts NSE."
updated: 2026-09-30
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

## Host discovery — qui est vivant

```bash
nmap -sn 10.10.10.0/24      # ping sweep : hôtes vivants SANS scan de ports
nmap -sL 10.10.10.0/24      # liste les cibles sans envoyer 1 paquet (ultra furtif)
nmap -n ...                 # pas de résolution DNS (plus rapide / discret)
```

Sur un réseau **LOCAL** (même sous-réseau) : nmap fait de l'**ARP** tout seul (`-PR`) — imbloquable.
**Hors LAN**, tu choisis ta sonde de découverte :
- `-PE` ICMP echo (ping classique) · `-PP` timestamp · `-PM` address mask
- `-PS<port>` TCP SYN ping (marche sans root) · `-PA<port>` TCP ACK ping (root)
- `-PU<port>` UDP ping

> **Réflexe** : LAN → ARP auto. Hors LAN + ICMP bloqué → pings TCP/UDP. Cible qui répond pas au ping mais est up (fréquent sur Windows) → `-Pn`.

## Évasion de firewall / scans avancés (référence — rarement utilisés)

> À **reconnaître**, pas à mémoriser. Sers-toi-en le jour où un firewall/IDS te bloque ; sinon tu passes.

```bash
-f  /  --mtu <n>          # fragmenter les paquets (passer sous le radar)
-D ip1,ip2,ME            # leurres : noyer ton IP parmi des fausses
-g <port> / --source-port # usurper le port source (53/80 souvent autorisés en sortie)
--spoof-mac <mac>        # usurper l'adresse MAC
-sN / -sF / -sX          # scans null / FIN / Xmas (se faufiler à travers vieux firewalls stateless)
-sI <zombie>             # idle scan : scanner via un hôte tiers pour cacher ton IP (niche / trivia)
```

> **Pourquoi root pour `-sS` / `-sU` / `-O` / scans furtifs** : ils fabriquent des paquets bruts (raw sockets, `CAP_NET_RAW`) — opération privilégiée. Sans root, nmap retombe automatiquement sur `-sT` (connect, complet mais bruyant).
