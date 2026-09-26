---
title: "Interaction manuelle avec les services (telnet/nc)"
category: recon
icon: "🔌"
tags: [telnet, netcat, banner-grabbing, enumeration, smtp, pop3, imap, ftp, http, clear-text, sniffing]
summary: "Parler les protocoles à la main (telnet/nc) : banner grabbing, énum SMTP via VRFY/EXPN, lecture de mails POP3, FTP anonymous, et le réflexe clair = creds sniffables."
updated: 2026-09-26
source: agent
---

## Pourquoi parler le protocole à la main

- Un client GUI cache le protocole brut. Se connecter en telnet/nc sur un port = voir et parler le protocole soi-même → banner grabbing, énumération, compréhension du service.
- Protocoles en clair (Telnet, HTTP, FTP, SMTP, POP3, IMAP) : les credentials transitent sans chiffrement → sniffables sur le réseau (Wireshark/tcpdump, voir [[traffic-analysis]]).
- Versions chiffrées : HTTPS (443), FTPS/SFTP, SMTPS (465), POP3S (995), IMAPS (993). Le TLS enveloppe le même protocole en dessous.

## Se connecter à un service à la main

```bash
telnet IP PORT        # parler le protocole en clair
nc IP PORT            # idem, plus flexible (aussi pour banner grab)
```

## Banner grabbing

- Sur un port ouvert, le service se présente souvent tout seul (logiciel + version) → chercher une CVE dessus.
- Réflexe : banner en clair = renseignement gratuit avant tout exploit.

## SMTP (25) — énumération d'utilisateurs

```
HELO x
VRFY root            # 250/252 = user existe, 550 = non
EXPN <alias>         # expand une mailing list / alias
```

- `VRFY` / `EXPN` permettent de valider des noms d'utilisateurs valides sur le serveur mail → liste de users pour la suite (brute force, spray).

## POP3 (110) — lire les mails à la main

```
USER bob
PASS <password>
LIST                 # lister les mails
RETR 1               # lire le mail n°1
```

## FTP (21)

```bash
ftp IP               # tenter le login anonymous / anonymous
```

## Réflexe pentest

- Service en clair + accès au trafic (LAN, position MITM) → sniff des creds directement (voir [[traffic-analysis]]).
- Toujours tenter l'interaction manuelle **avant** un client GUI : c'est là qu'apparaissent les versions, les users valides et les messages d'erreur exploitables.
