# Architecture.md

Project: Phoenix OS
Document: System Architecture
Version: 1.0.0
Status: Approved
Sprint: 00
Last Update: 2026-08-02

---

# 1. Purpose

Ce document décrit l'architecture globale de Phoenix OS.

Son objectif est de définir les composants du système, leurs responsabilités, leurs interactions et les principes qui gouvernent le développement de Phoenix OS.

Il constitue la référence technique principale du projet.

---

# 2. Architectural Vision

Phoenix OS est conçu comme un système modulaire.

Chaque module possède une responsabilité unique.

Les modules communiquent uniquement via le modèle de données.

Aucun module ne doit contenir des informations dupliquées.

L'ensemble du système repose sur une source unique de vérité.

---

# 3. High Level Architecture

```

```
                        +----------------------+
                        |     Dashboard        |
                        +----------+-----------+
                                   |
                      Analytics & KPIs
                                   |
+---------------------------------------------------------------+
|                     Business Logic Layer                      |
|---------------------------------------------------------------|
| Trading | Risk | Psychology | Reviews | Prop Firms | Goals    |
+---------------------------------------------------------------+
                                   |
                                   |
+---------------------------------------------------------------+
|                        Data Layer                             |
|---------------------------------------------------------------|
| Trades | Sessions | Setups | Errors | Objectives | Accounts   |
+---------------------------------------------------------------+
                                   |
                                   |
+---------------------------------------------------------------+
|                    Documentation Layer                        |
|---------------------------------------------------------------|
| Playbook | PRD | Vision | Business Rules | Decisions | ADR    |
+---------------------------------------------------------------+

```

---

# 4. Core Modules

## 4.1 Trading Module

Responsabilités :

- enregistrer les trades
- calculer les performances
- suivre le risque
- mesurer la discipline

Entrées :

- setup
- prix
- risque
- résultat

Sorties :

- statistiques
- KPIs

---

## 4.2 Session Module

Responsabilités :

- préparer les journées
- enregistrer le biais
- documenter les revues

---

## 4.3 Setup Module

Responsabilités :

- centraliser les stratégies
- mesurer leur performance
- conserver leurs évolutions

---

## 4.4 Prop Firm Module

Responsabilités :

- suivre les comptes
- suivre les drawdowns
- suivre la consistency
- suivre les payouts

---

## 4.5 Psychology Module

Responsabilités :

- enregistrer l'état émotionnel
- identifier les erreurs
- mesurer la discipline

---

## 4.6 Review Module

Responsabilités :

- revue journalière
- revue hebdomadaire
- revue mensuelle

---

## 4.7 Dashboard Module

Responsabilités :

- afficher les KPIs
- afficher les performances
- afficher les alertes

Le Dashboard ne contient aucune donnée.

Toutes les données proviennent du Data Layer.

---

# 5. Data Flow

```

Préparation Session

↓

Création Trade

↓

Validation Setup

↓

Résultat

↓

Calcul KPIs

↓

Dashboard

↓

Review

↓

Amélioration

```

---

# 6. Data Ownership

Chaque information appartient à une seule entité.

Exemple :

Trade

↓

Session

↓

Setup

↓

Prop Firm

Aucune duplication n'est autorisée.

---

# 7. Dependencies

Dashboard

↓

Analytics

↓

Trades

↓

Sessions

↓

Setups

↓

Prop Firms

---

# 8. Design Principles

## Single Source of Truth

Chaque donnée est enregistrée une seule fois.

---

## Modularité

Chaque module est indépendant.

---

## Scalabilité

L'ajout d'un nouveau module ne doit pas casser les modules existants.

---

## Documentation First

Toute nouvelle fonctionnalité doit être documentée avant son développement.

---

## Process First

Le système privilégie le respect du processus plutôt que le résultat financier.

---

# 9. Future Modules

Version 2

- Wealth Management

- Portfolio

- Investment Tracking

- Tax Reporting

Version 3

- Broker API

- Trading Journal Automation

- AI Review Assistant

Version 4

- Mobile Application

- Cloud Synchronisation

- Team Mode

---

# 10. Technical Rules

Les modules ne doivent jamais communiquer directement entre eux.

Toute communication passe par le modèle de données.

Les statistiques sont calculées automatiquement.

Les décisions sont historisées.

Toutes les modifications sont versionnées.

---

# 11. Definition of Done

Une fonctionnalité est terminée uniquement si :

- elle est documentée ;

- elle respecte cette architecture ;

- elle respecte les Business Rules ;

- elle possède des critères d'acceptation ;

- elle est intégrée au Product Backlog.

---

# 12. Evolution Strategy

Phoenix OS est développé par incréments.

Chaque Sprint produit :

- une amélioration fonctionnelle ;

- une amélioration documentaire ;

- une amélioration de l'architecture.

Aucune dette documentaire n'est acceptée.

---

# End of Document
