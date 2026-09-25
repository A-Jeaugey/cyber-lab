---
title: Linux — SSH, processus, services & cron
category: linux
icon: ⚙️
difficulty: Fondamentaux
tags: [linux, ssh, scp, processes, systemctl, cron, apt, privesc]
summary: Transferts SSH/SCP, serveur HTTP Python, gestion des processus et jobs, services systemctl, apt et tâches planifiées cron.
updated: 2026-09-25
source: cheatsheet
---

## SSH & transferts

```bash
ssh user@IP                            # connexion
scp file user@IP:/dest/                # envoyer
scp user@IP:/src/file ./               # récupérer

# Servir des fichiers (côté source)
python3 -m http.server                 # port 8000

# Télécharger (côté cible)
wget http://IP:8000/file
```

## Processus & services

```bash
ps aux                  # TOUS les processus
top                     # temps réel (q pour quitter)
kill <PID>              # SIGTERM (propre)
kill -KILL <PID>        # SIGKILL (immédiat)
kill -TSTP <PID>        # SIGSTOP (pause)
kill -CONT <PID>        # reprendre

cmd &                   # lancer en background
Ctrl+Z                  # suspendre + background
fg                      # ramener en foreground
jobs                    # lister les jobs background

systemctl start/stop <svc>     # démarrer / arrêter
systemctl enable/disable <svc> # activer / désactiver au boot
systemctl status <svc>         # état
```

## apt & cron

```bash
sudo apt update && sudo apt upgrade
sudo apt install <package>
sudo add-apt-repository <repo>

crontab -e        # éditer tâches planifiées
crontab -l        # lister
# Format : minute heure jour mois jour-semaine commande
# Aliases : @reboot, @daily, @hourly
```

> **Privesc classique** : un cron tournant en root sur un script dont tu as les droits d'écriture.
