# BusinessRules.md

Project: Phoenix OS
Document: Business Rules
Version: 1.0.0
Status: Approved
Sprint: 00
Last Update: 2026-08-02

---

# 1. Purpose

Ce document définit l'ensemble des règles métier de Phoenix OS.

Ces règles garantissent la cohérence des données, la discipline du trader et le fonctionnement du système.

Aucune fonctionnalité ne peut être développée sans respecter ces règles.

---

# 2. Core Principles

Les règles métier reposent sur cinq principes.

1. Le processus est plus important que le résultat.
2. Le capital est prioritaire.
3. Une donnée n'existe qu'une seule fois.
4. Toutes les décisions sont mesurables.
5. Toute amélioration est documentée.

---

# 3. Trading Rules

## BR-001

Chaque Trade appartient à une seule Session.

---

## BR-002

Chaque Trade utilise un seul Setup principal.

---

## BR-003

Chaque Trade appartient à un seul Trading Account.

---

## BR-004

Chaque Trade possède obligatoirement :

- une date
- un actif
- une direction
- un prix d'entrée
- un Stop Loss
- un Take Profit
- un résultat

---

## BR-005

Un Trade ne peut jamais être supprimé.

Il peut uniquement être archivé.

---

# 4. Risk Management Rules

## BR-100

Chaque Trade possède un risque défini avant son ouverture.

---

## BR-101

Le risque maximal est défini par le plan de trading.

---

## BR-102

Le système doit enregistrer tout dépassement du risque autorisé.

---

## BR-103

Une alerte est générée lorsqu'une règle de risque est violée.

---

# 5. Prop Firm Rules

## BR-200

Chaque compte est associé à une seule Prop Firm.

---

## BR-201

Le système suit automatiquement :

- Drawdown journalier
- Drawdown maximal
- Consistency
- Profit cible

---

## BR-202

Toute violation d'une règle Prop Firm est enregistrée.

---

# 6. Setup Rules

## BR-300

Chaque Setup possède :

- des critères d'entrée
- des critères de sortie
- des critères de validation

---

## BR-301

Un Setup ne peut être utilisé que s'il respecte ses critères.

---

## BR-302

Chaque modification d'un Setup est historisée.

---

# 7. Psychology Rules

## BR-400

Chaque Session possède un état émotionnel.

---

## BR-401

Chaque erreur psychologique est enregistrée.

---

## BR-402

Les erreurs sont classées par catégorie.

Exemples :

- FOMO
- Revenge Trading
- Overtrading
- Early Exit
- Late Entry
- Non-respect du plan

---

# 8. Review Rules

## BR-500

Une revue quotidienne est créée après chaque journée de trading.

---

## BR-501

Une revue hebdomadaire est obligatoire.

---

## BR-502

Une revue mensuelle est obligatoire.

---

# 9. Statistics Rules

Les statistiques ne sont jamais saisies.

Toutes les statistiques sont calculées automatiquement.

---

Les indicateurs comprennent notamment :

- Win Rate
- Profit Factor
- Average RR
- Expectancy
- Drawdown
- Discipline Score
- Phoenix Index

---

# 10. Documentation Rules

Toute nouvelle fonctionnalité doit être documentée.

Toute modification importante doit être historisée.

Aucune règle métier ne peut être implicite.

---

# 11. Security Rules

Les données historiques sont immuables.

Les suppressions définitives sont interdites.

Chaque modification doit pouvoir être retracée.

---

# 12. Versioning Rules

Toute évolution des règles entraîne une nouvelle version du document.

Exemple :

v1.0

↓

v1.1

↓

v2.0

---

# 13. Definition of Done

Une fonctionnalité est considérée comme terminée uniquement si :

- elle respecte le PRD ;
- elle respecte l'Architecture ;
- elle respecte le Data Model ;
- elle respecte les Business Rules ;
- elle est documentée ;
- elle possède des critères d'acceptation.

---

#
