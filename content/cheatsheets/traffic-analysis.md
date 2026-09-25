---
title: Tcpdump & Wireshark
category: recon
icon: 🦈
difficulty: Intermédiaire
tags: [tcpdump, wireshark, pcap, bpf, display-filters, capture]
summary: Capture CLI avec tcpdump et filtres BPF, analyse graphique Wireshark avec display filters et Follow TCP Stream.
updated: 2026-09-25
source: cheatsheet
---

## Tcpdump — capture CLI

```bash
sudo tcpdump -D                          # lister interfaces
sudo tcpdump -i eth0                     # capture sur eth0
sudo tcpdump -i eth0 -w cap.pcap         # enregistrer
tcpdump -r cap.pcap                      # relire
sudo tcpdump -i eth0 -nn                 # pas de résolution DNS/port
sudo tcpdump -i any                      # toutes interfaces
sudo tcpdump -i eth0 -c 10               # 10 paquets puis stop
```

**Filters (syntaxe BPF)** :

```bash
sudo tcpdump host 10.0.0.1
sudo tcpdump src host 10.0.0.1
sudo tcpdump port 80
sudo tcpdump src port 22
sudo tcpdump icmp / tcp / udp / arp
sudo tcpdump 'tcp and (port 80 or port 443)'
sudo tcpdump host 10.0.0.1 and port 80
```

## Wireshark — analyse graphique (.pcap)

**Display filters** (syntaxe différente de tcpdump) :

```
ip.addr == 192.168.1.1
ip.src == 192.168.1.1 / ip.dst == ...
tcp.port == 80
http / dns / ftp / smb
http.request.method == "POST"
tcp.flags.syn == 1
tcp contains "password"
ip.src == 10.0.0.1 and tcp.port == 80
not arp
```

> **Killer feature** : clic droit sur un paquet → **Follow → TCP Stream** → reconstitue toute la conversation lisible.
