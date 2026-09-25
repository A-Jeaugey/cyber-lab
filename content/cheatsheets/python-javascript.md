---
title: Python ↔ JavaScript
category: scripting
icon: 🐍
difficulty: Fondamentaux
tags: [python, javascript, syntax, comparison, strict-equality]
summary: Table d'équivalences Python/JavaScript (variables, affichage, conditions, conversions, random, input) et le piège des comparaisons loose en JS.
updated: 2026-09-25
source: cheatsheet
---

| Quoi | Python | JavaScript |
|---|---|---|
| Variable | `x = 5` | `let x = 5;` |
| Constante | (par convention `X = 5`) | `const X = 5;` |
| Afficher | `print(x)` | `console.log(x)` |
| else if | `elif` | `else if` |
| Pas égal | `!=` | `!==` (strict) ou `!=` (loose, à éviter) |
| Égal | `==` | `===` (strict) ou `==` (loose, à éviter) |
| Convertir en int | `int(text)` | `parseInt(text, 10)` |
| Random 1-20 | `random.randint(1, 20)` | `Math.floor(Math.random() * 20) + 1` |
| Input user | `input("...")` | `await rl.question("...")` (Node.js) |

> ⚠️ JS : toujours `===` / `!==`, jamais `==` / `!=`. Les comparaisons loose font des conversions de type automatiques qui causent des bugs et des auth bypass en CTF.
