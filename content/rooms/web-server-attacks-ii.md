---
title: "Web Server Attacks - II"
category: rooms
icon: "🪟"
difficulty: "Medium"
platform: "THM"
status: "Terminée"
tags: [web, iis, windows, webdav, tilde-8.3, aspx, webshell, ntlm, seimpersonate, recon]
summary: "Attaque IIS : fingerprint, enumeration tilde 8.3 pour trouver des fichiers caches, upload d'un webshell .aspx via WebDAV (auth NTLM), et notes privesc SeImpersonate/Potato."
updated: 2026-10-06
source: agent
---

> Room guidée (pas une box) : attaquer IIS (serveur web Windows). Fingerprint IIS → énumération tilde 8.3 pour deviner des noms de fichiers/dossiers cachés → WebDAV pour uploader un webshell. C'est la suite Windows de WSA-I.

## TL;DR
IIS trahit ses fichiers cachés via les **noms courts 8.3** (`BACKUP~1`), et un **WebDAV** mal configuré laisse uploader un `.aspx` → exécution de commandes. Deux misconfigs Windows très anciennes, toujours présentes.

## Fingerprint IIS
```bash
curl -sI http://IP        # Server: Microsoft-IIS/10.0 · X-Powered-By: ASP.NET
curl -X OPTIONS http://IP/webdav/ -i   # DAV: 1,2,3 + MS-Author-Via: DAV = WebDAV actif
```

## 1. Énumération tilde 8.3 (noms courts NTFS)
- NTFS garde un vieux nom "8.3" (`BackupFiles` → `BACKUP~1`) à côté du nom long.
- IIS répond différemment selon que le nom court existe : **404** = ça matche quelque chose, **400** = n'existe pas. On devine les noms cachés lettre par lettre.
- Outil qui automatise : `IIS-ShortName-Scanner` (java) ou le script `shortscan`.
- Ici → révèle `BACKUP~1` → dossier `BackupFiles/` → `webdav_notes.txt` contenant les creds WebDAV en clair.

## 2. Upload webshell via WebDAV
- WebDAV accepte `PUT` mais demande une auth NTLM (les creds trouvés à l'étape 1).
- Upload d'un webshell ASPX :
```bash
curl --ntlm -u 'user:pass' -T cmd.aspx http://IP/webdav/cmd.aspx
```
- Puis exécution de commandes via le shell uploadé (cf. le curl `-g -G --data-urlencode` pour passer la commande).
- Piège vu dans la room : `STATUS_PASSWORD_EXPIRED` = le mot de passe trouvé est valide mais expiré (>42 j, max age IIS par défaut). Le compte est bon, le mdp est mort.

## Autres misconfigs IIS à checker
- `trace.axd` activé (`<trace enabled="true">`) → expose l'historique des requêtes + données de session.
- Directory browsing → fichiers `.bak` exposés.
- `nmap --script http-methods IP` → énumère les verbes HTTP (PUT, DELETE...).

## Note privesc (hors scope room, bon à savoir)
- L'app pool IIS (`iis apppool\defaultapppool`) a le privilège **SeImpersonate** par défaut → escalade via famille **Potato** (JuicyPotato, PrintSpoofer) une fois un shell obtenu.

## Réflexes acquis
- **Réflexe** : `Microsoft-IIS` + `ASP.NET` dans les en-têtes = cible Windows → penser tilde 8.3, WebDAV, trace.axd, webshell `.aspx` (pas `.php`).
- **Réflexe** : WebDAV (`OPTIONS` → `DAV:`) actif = tester l'upload `PUT` d'un webshell, avec les creds trouvés ailleurs.
- **Réflexe** : des creds valides mais `PASSWORD_EXPIRED` → le compte existe, c'est pas un mur définitif (réinitialisation possible, ou réutilisation ailleurs).
- **Réflexe** : shell obtenu sur IIS → vérifier `whoami /priv` ; SeImpersonate présent = Potato = SYSTEM.
