---
title: Networking — modèles, ports & protocoles
category: networking
icon: 🌐
difficulty: Fondamentaux
tags: [networking, osi, tcp, udp, ports, dhcp, arp, dns, nat, icmp, mail]
summary: OSI/TCP-IP, plages privées et ports, TCP vs UDP, protocoles essentiels (DHCP/ARP/NAT/ICMP), DNS records et protocoles mail.
updated: 2026-09-25
source: cheatsheet
---

## Modèles OSI / TCP-IP

| Couche OSI | TCP/IP | Unité | Exemples |
|---|---|---|---|
| 7 Application | App | data | HTTP, DNS, FTP, SSH |
| 6 Presentation | App | data | TLS, JPEG |
| 5 Session | App | data | NetBIOS, RPC |
| 4 Transport | Transport | segment | TCP, UDP |
| 3 Network | Internet | packet | IP, ICMP, OSPF |
| 2 Data Link | Net Access | frame | Ethernet, MAC, ARP |
| 1 Physical | Net Access | bits | câble, wifi |

> **Repères pentest** : L2=switch/MAC, L3=routeur/IP, L4=firewall/ports, L7=WAF/proxy applicatif

## IPs & ports

**Plages privées RFC 1918** (= derrière NAT, pas joignables depuis internet) :
- `10.0.0.0/8` (grosses entreprises)
- `172.16.0.0/12` (172.16 à 172.31)
- `192.168.0.0/16` (perso/maison)

Spéciaux : `127.0.0.1` (loopback), `169.254.x.x` (APIPA — DHCP foiré)

**65536 ports** (2¹⁶) :
- 0-1023 = well-known (root pour bind)
- 1024-49151 = registered
- 49152-65535 = dynamic/ephemeral

## Ports à connaître

| Port | Protocole |
|---|---|
| 21 | FTP |
| 22 | SSH |
| 23 | Telnet (obsolète) |
| 25 | SMTP |
| 53 | DNS (UDP, TCP en fallback) |
| 80 | HTTP |
| 110 | POP3 |
| 143 | IMAP |
| 443 | HTTPS |
| 445 | SMB (partage Windows) |
| 993 | IMAPS |
| 995 | POP3S |
| 3306 | MySQL |
| 3389 | RDP |
| 5432 | PostgreSQL |

## TCP vs UDP

| | TCP | UDP |
|---|---|---|
| Fiabilité | Garanti, ordonné | Best-effort |
| Vitesse | Lent | Rapide |
| Handshake | 3-way (SYN, SYN-ACK, ACK) | Aucun |
| Usage | Web, SSH, FTP, mail | DNS, streaming, jeux, VoIP |

> **Pentest** : `nmap -sS` = SYN scan (half-open, plus furtif, complète pas le handshake)

## Protocoles essentiels

**DHCP** : assignation auto IP. Process **DORA** :
- **D**iscover (client broadcast `0.0.0.0` → `255.255.255.255`)
- **O**ffer (serveur propose IP)
- **R**equest (client demande officiellement)
- **A**cknowledge (serveur confirme)

**ARP** : mapping IP ↔ MAC sur le LAN. Broadcast `ff:ff:ff:ff:ff:ff`. **Attaque** : ARP spoofing (MITM via `bettercap`, `ettercap`).

**NAT** : 1 IP publique pour N appareils privés. Conséquence pentest : machines derrière NAT non joignables directement → reverse shell > bind shell.

**ICMP** : protocole de diagnostic L3.
- `ping` : echo request/reply
- `traceroute` : TTL incrémental pour découvrir les routeurs
- Si TTL = 0 → routeur drop + envoie ICMP "Time Exceeded"

> **Nmap si ICMP bloqué** : `-Pn` (skip host discovery)

## DNS records

| Type | Maps... |
|---|---|
| **A** | nom → IPv4 |
| **AAAA** | nom → IPv6 |
| **CNAME** | alias nom → autre nom |
| **MX** | domaine → serveur mail |
| **TXT** | texte libre (SPF, DKIM, vérifs) |
| **NS** | serveur DNS faisant autorité |

Outils recon DNS : `dig`, `nslookup`, `dnsenum`, `dnsrecon`. Cherche les sous-domaines (`dev.target.com`, `staging.target.com`).

## Mail

- **SMTP** (25) : *envoyer* (client→serveur, serveur→serveur)
- **POP3** (110) : *télécharger + supprimer* du serveur
- **IMAP** (143) : *consulter en laissant* sur le serveur (sync multi-device)

Versions TLS : SMTPS (465), POP3S (995), IMAPS (993)
