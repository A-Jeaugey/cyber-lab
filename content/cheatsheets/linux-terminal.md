---
title: Linux — Terminal & fichiers
category: linux
icon: 🐧
difficulty: Fondamentaux
tags: [linux, terminal, cmd, windows, find, permissions, files]
summary: Équivalences Linux/Windows, find & wildcards, redirections, lecture de fichiers, gestion de fichiers, permissions et arborescence système.
updated: 2026-09-25
source: cheatsheet
---

## Linux ↔ Windows CMD

| Quoi faire | Linux | Windows CMD |
|---|---|---|
| Où je suis | `pwd` | `cd` (sans argument) |
| Lister | `ls` | `dir` |
| Lister + cachés | `ls -la` | `dir /a` |
| Changer de dossier | `cd <dir>` | `cd <dir>` |
| Remonter | `cd ..` | `cd ..` |
| Home | `cd ~` ou `cd` | `cd %USERPROFILE%` |
| Chercher un fichier partout | `find / -name "fichier" 2>/dev/null` | `dir /s fichier` (depuis `C:\`) |
| Lire un fichier | `cat file` | `type file` |
| Qui je suis | `whoami` | `whoami` |
| Nom de la machine | `hostname` | `hostname` |
| Infos système complètes | `uname -a` + `cat /etc/os-release` | `systeminfo` |
| Infos réseau | `ip a` | `ipconfig` |
| Infos réseau détaillées | `ip a` | `ipconfig /all` |
| Espace disque | `df -h` | `wmic logicaldisk get size,freespace,caption` |
| RAM | `free -h` | dans `systeminfo` |
| Effacer l'écran | `clear` | `cls` |

## Linux — find (wildcards)

```bash
find ~ -name "*.txt"                # quoter les wildcards !
find ~ -iname "*Day1*"              # case-insensitive
find / -perm -4000 2>/dev/null      # SUID — privesc
find ~ -type f -size +10M           # > 10M
```

## Linux — redirections

```bash
cmd > file        # stdout vers file (écrase)
cmd >> file       # append
cmd 2>/dev/null   # cache les erreurs
cmd1 | cmd2       # pipe
```

## Linux — lire un fichier (variantes)

```bash
less file         # gros fichier (/motif pour chercher, q pour quitter)
tail -f file.log  # suivre un log en live
head file         # 10 premières lignes
nano file         # éditer (Ctrl+O save, Ctrl+X quit)
```

## Linux — gestion fichiers

```bash
touch file        # créer fichier vide
mkdir dir         # créer dossier
cp src dst        # copier (cp -r pour dossier)
mv src dst        # déplacer / renommer
rm file           # supprimer (rm -r dossier, rm -rf force)
file <f>          # déterminer le type d'un fichier
```

## Linux — permissions (`ls -l`)

Format : `drwxr-xr-x` (10 chars)
- char 1 : type → `d`=dir, `-`=fichier, `l`=lien
- chars 2-4 : owner / chars 5-7 : group / chars 8-10 : other
- `r`=read, `w`=write, `x`=execute, `-`=none

```bash
su user2          # devenir user2
sudo cmd          # exécuter en root
```

## Linux — dossiers système

| Dossier | Contenu |
|---|---|
| `/etc` | Configs (`/etc/passwd` lisible par tous, `/etc/shadow` root only) |
| `/var/log` | Tous les logs |
| `/root` | Home de root |
| `/tmp` | Temporaires (vidés au reboot) |
| `/home/<user>` | Home users |
