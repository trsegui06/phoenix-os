# DataModel.md

Project: Phoenix OS
Document: Data Model
Version: 1.0.0
Status: Approved
Sprint: 00
Last Update: 2026-08-02

---

# 1. Purpose

Le Data Model définit toutes les entités métier de Phoenix OS, leurs attributs, leurs relations et les règles garantissant l'intégrité des données.

Il constitue la référence unique pour tout développement futur.

---

# 2. Design Principles

- Une donnée ne doit exister qu'une seule fois.
- Chaque entité possède un identifiant unique.
- Toutes les statistiques sont calculées à partir des données.
- Aucune donnée ne doit être dupliquée.
- Les relations sont privilégiées aux copies.

---

# 3. Domain Model

```
Trader
│
├── Prop Firm
│
├── Trading Account
│
├── Session
│
├── Trade
│
├── Setup
│
├── Error
│
├── Objective
│
├── Review
│
└── Statistics
```

---

# 4. Entities

## 4.1 Trader

Description

Utilisateur principal de Phoenix OS.

Attributes

- id
- name
- timezone
- experience_level
- created_at

Relations

- owns Accounts
- creates Sessions
- executes Trades

---

## 4.2 Trading Account

Description

Compte utilisé pour trader.

Attributes

- id
- broker
- account_name
- account_type
- initial_balance
- current_balance
- status

Relations

- belongs to Prop Firm
- contains Trades

---

## 4.3 Prop Firm

Description

Entreprise finançant le compte.

Attributes

- id
- name
- maximum_drawdown
- daily_drawdown
- payout_rule
- consistency_rule

Relations

- owns Accounts

---

## 4.4 Session

Description

Période de trading.

Attributes

- id
- date
- session_type
- market_bias
- emotional_state
- notes

Relations

- contains Trades

---

## 4.5 Setup

Description

Configuration technique utilisée.

Attributes

- id
- name
- timeframe
- market_condition
- entry_rules
- exit_rules
- validation_rules

Relations

- used by Trades

---

## 4.6 Trade

Description

Objet central de Phoenix OS.

Attributes

- id
- date
- asset
- direction
- entry_price
- stop_loss
- take_profit
- exit_price
- risk_percent
- position_size
- RR
- result
- pnl
- execution_quality
- screenshots
- notes

Relations

- belongs to Session
- belongs to Setup
- belongs to Trading Account
- may contain Errors

---

## 4.7 Error

Description

Erreur commise pendant un trade.

Attributes

- id
- category
- severity
- description
- solution

Relations

- belongs to Trade

---

## 4.8 Objective

Description

Objectif à atteindre.

Attributes

- id
- title
- description
- category
- target_date
- status

Relations

- linked to Reviews

---

## 4.9 Review

Description

Analyse périodique.

Attributes

- id
- review_type
- period
- summary
- strengths
- weaknesses
- action_plan

Relations

- analyses Trades
- evaluates Objectives

---

## 4.10 Statistics

Description

Vue calculée.

Aucune donnée n'est saisie.

Toutes les valeurs sont calculées.

Metrics

- Win Rate
- Profit Factor
- Average RR
- Expectancy
- Maximum Drawdown
- Average Gain
- Average Loss
- Discipline Score
- Phoenix Index

---

# 5. Relationships

```
Trader
    │
    ├──────────────┐
    │              │
Prop Firm      Objectives
    │
Trading Account
    │
Session
    │
Trade
 ├──────┐
 │      │
Setup  Error
 │
Review
 │
Statistics
```

---

# 6. Integrity Rules

Chaque Trade appartient à une seule Session.

Chaque Trade utilise un seul Setup principal.

Chaque Trade appartient à un seul Trading Account.

Une Error ne peut exister sans Trade.

Les Statistics sont toujours calculées automatiquement.

Les Reviews ne modifient jamais les données historiques.

---

# 7. Naming Convention

Toutes les entités utilisent :

- PascalCase pour les noms.
- snake_case pour les attributs.
- UUID pour les identifiants.
- ISO-8601 pour les dates.

---

# 8. Future Entities

Version 2

- Portfolio
- Investment
- Dividend
- Cash Flow

Version 3

- Broker API
- Economic Calendar
- AI Analysis

Version 4

- Mobile Sync
- Team Workspace

---

# End of Document
