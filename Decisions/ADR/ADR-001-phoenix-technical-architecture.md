# ADR-001 — Phoenix OS Technical Architecture V1

## Status

Accepted

## Date

2026-08-09

## Decision Owners

Phoenix OS — Product / Architecture

---

## Context

Phoenix OS est actuellement un repository documentaire : les documents produit, architecture, modèle de données, design system et backlog existent, mais aucune stack applicative, interface, API, base de données ou migration n'est encore implémentée.

Le produit doit évoluer vers une application web de trading et de gestion patrimoniale. Il doit pouvoir présenter un dashboard dynamique, persister des données financières relationnelles fiables, calculer des indicateurs à partir de données source et progresser par domaines sans sur-architecturer le produit.

L'architecture doit être simple à mettre en œuvre, cohérente avec les principes existants de modularité et de source unique de vérité, et compatible avec un développement assisté par Codex. Elle doit aussi préserver une évolution future vers des services séparés lorsque des besoins réels le justifieront.

---

## Decision

Phoenix OS adopte **l'Architecture A** comme architecture technique de référence V1.

| Domaine | Décision |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| UI | Tailwind CSS et Phoenix Design System |
| Application / backend | Next.js Server, Server Actions lorsque pertinentes, services métier séparés du code UI |
| Database | PostgreSQL |
| Infrastructure | Supabase |
| Authentication | Supabase Auth |
| Testing | Vitest et Playwright |
| Code quality | ESLint et Prettier |
| Repository | GitHub |
| Engineering agent | Codex |

Cette décision sélectionne une architecture applicative initiale ; elle ne met en œuvre ni projet Next.js, ni base de données, ni configuration Supabase, ni code métier.

---

## Principes architecturaux

1. **UI ≠ Business Logic.** Les composants de présentation affichent l'état et déclenchent des cas d'usage ; ils ne portent ni calcul financier ni règle métier.
2. **Business Logic ≠ Database Access.** Les services de domaine ne dépendent pas directement de composants UI et accèdent aux données via une couche dédiée.
3. **Supabase est une infrastructure, pas la couche métier de Phoenix.** Il fournit PostgreSQL, l'authentification et les capacités d'infrastructure retenues ; les règles Phoenix restent dans l'application.
4. Les règles métier résident dans des services ou modules de domaine testables indépendamment de l'UI.
5. Le dashboard n'est jamais une source de vérité.
6. Les données financières persistées constituent la source de vérité.
7. Les données calculées sont produites par des read models ou services à partir des données source validées.
8. Les montants financiers sont représentés par des entiers en centimes ; aucun calcul monétaire ne repose sur des nombres flottants.
9. Les transactions validées sont immuables ; une correction est tracée par une contrepassation ou un événement lié.
10. Les migrations de base de données sont versionnées dans le repository.
11. Toute fonctionnalité importante doit être testable indépendamment de l'UI.
12. L'architecture doit permettre d'extraire ultérieurement des services séparés si la complexité le justifie, sans imposer cette séparation dès la V1.

Ces principes complètent l'Architecture existante : modularité, communication par le modèle de données, absence de duplication et statistiques calculées automatiquement.

---

## Architecture logique

```text
Presentation Layer
        ↓
Application Layer
        ↓
Domain / Business Services
        ↓
Data Access Layer
        ↓
PostgreSQL / Supabase
```

### Presentation Layer

Contient les pages, layouts, composants, navigation et interactions Next.js/React. Elle applique le Phoenix Design System et les UX Guidelines. Elle consomme des données préparées et délègue les actions à la couche applicative.

### Application Layer

Orchestre les cas d'usage : autorisation, validation d'entrée, composition des services de domaine et formatage des réponses. Les Server Actions sont utilisées lorsqu'elles sont adaptées à une interaction serveur simple et contrôlée ; elles ne remplacent pas les services métier.

### Domain / Business Services

Contient les invariants, règles de Trading, Wealth, Reviews, Psychology et Automation, les calculs, les politiques d'allocation, les transformations et les read models. Cette couche ne dépend pas de l'UI.

### Data Access Layer

Isole les requêtes PostgreSQL/Supabase, les transactions de persistance et les mappings entre stockage et domaine. Elle ne définit pas les règles métier.

### PostgreSQL / Supabase

PostgreSQL stocke les données relationnelles et les migrations versionnées définissent leur évolution. Supabase fournit l'infrastructure PostgreSQL et les services d'authentification retenus, sans devenir la source de règles métier Phoenix.

---

## Domaines préparés

Cette architecture prépare les domaines suivants, sans les implémenter dans cette ADR :

- Trading
- Wealth
- Reviews
- Psychology
- Automation
- Phoenix OS
- AI

Chaque domaine possède ses services, règles et accès aux données. Les intégrations entre domaines passent par des contrats de données et des read models explicites afin de conserver une source unique de vérité.

---

## Database

PostgreSQL est retenu car Phoenix OS requiert :

- un modèle relationnel pour Trading, Wealth, Reviews et objectifs ;
- l'intégrité référentielle et des contraintes explicites ;
- des transactions ACID adaptées aux opérations financières ;
- des requêtes analytiques pour KPI, dashboard, allocations et revues ;
- la gestion de relations complexes entre comptes, transactions, actifs, passifs et objectifs.

Supabase fournit l'infrastructure PostgreSQL. Phoenix OS garde le contrôle de son modèle métier, de ses migrations, de ses règles d'intégrité et de sa couche d'accès aux données. Les entités Wealth préparées dans Sprint 06 devront être rapprochées du Data Model approuvé avant toute migration.

---

## Authentication & Security

- L'authentification est assurée par Supabase Auth.
- Les contrôles d'accès sont exécutés côté serveur.
- Aucune donnée financière sensible n'est exposée côté client sans autorisation contrôlée.
- Les secrets restent uniquement dans les variables d'environnement côté serveur.
- Toutes les données entrantes sont validées au niveau applicatif avant appel des services métier.
- Le principe du moindre privilège s'applique aux utilisateurs, services et accès aux données.
- Row Level Security est utilisée lorsque le modèle de données et les accès multi-utilisateurs le nécessitent.
- Les opérations financières critiques sont auditées : acteur, date, opération, données de référence et événement de correction éventuel.

---

## Testing

### Vitest

Vitest couvre notamment :

- logique métier et services de domaine ;
- calculs financiers ;
- règles d'allocation ;
- invariants et transformations de données ;
- read models et scénarios de correction.

### Playwright

Playwright couvre notamment :

- parcours utilisateur critiques ;
- dashboard ;
- authentification ;
- scénarios de saisie, validation et consultation.

Les calculs financiers sont obligatoirement testés indépendamment de l'interface.

---

## Deployment

La stratégie initiale reste volontairement simple :

- application web Next.js ;
- déploiement web de l'application ;
- PostgreSQL fourni par Supabase ;
- variables d'environnement gérées côté serveur ;
- migrations versionnées dans le repository ;
- CI ajoutée après l'initialisation du projet pour exécuter qualité, tests et contrôles de migration.

Aucun fournisseur supplémentaire n'est choisi par cette ADR, car aucun besoin non couvert par cette architecture initiale n'est documenté.

---

## Why Not Architecture B

L'architecture `Next.js + FastAPI + PostgreSQL` n'est pas retenue immédiatement. Elle introduirait prématurément deux runtimes, une API supplémentaire, deux surfaces de déploiement et une maintenance accrue. Pour le périmètre initial, cette séparation réduirait la vitesse de développement sans répondre à un besoin démontré.

Un backend séparé pourra être envisagé ultérieurement si des besoins concrets l'exigent : charge soutenue, forte complexité métier isolable, exigences de sécurité ou d'isolation, multiplication des intégrations, équipe dédiée, ou traitements asynchrones importants.

---

## Why Not Architecture C

Un monolithe TypeScript sans Supabase n'est pas retenu pour la V1. Il imposerait de construire et maintenir davantage d'infrastructure, notamment la base de données gérée, l'authentification, le déploiement et les opérations associées. Supabase permet de conserver PostgreSQL tout en réduisant ce coût initial, sans déplacer les règles métier hors de Phoenix OS.

---

## Trade-offs

### Avantages

- vitesse de développement ;
- simplicité d'une stack TypeScript cohérente ;
- bon support des dashboards et interfaces React ;
- PostgreSQL adapté aux données Trading et Wealth ;
- compatibilité avec un développement assisté par Codex ;
- évolution progressive vers des services spécialisés.

### Inconvénients et risques

- dépendance à Supabase pour l'infrastructure sélectionnée ;
- dépendance à l'écosystème Next.js ;
- risque de rapprocher la logique métier de l'infrastructure si les conventions de séparation ne sont pas respectées.

Les principes architecturaux et les tests de services de domaine constituent les garde-fous de ce dernier risque.

---

## Evolution Path

V1 :

```text
Next.js + Supabase
```

Évolution possible lorsque justifiée :

```text
Next.js
    ↓
Services métier
    ↓
Services spécialisés
```

Un backend séparé n'est introduit qu'en réponse à des besoins réels de charge, complexité, isolation, équipe, sécurité, intégrations ou traitement asynchrone important.

---

## Consequences

### Positives

- Une base de décision claire avant l'initialisation du code.
- Une séparation explicite entre UI, services métier et accès aux données.
- Une infrastructure relationnelle compatible avec les données financières et les évolutions Wealth.
- Une stratégie de test adaptée aux règles financières et aux parcours utilisateur.
- Une voie d'évolution sans microservices prématurés.

### Négatives

- Les conventions de couches devront être appliquées et vérifiées dès le premier domaine.
- La dépendance à Next.js et Supabase devra être surveillée.
- L'initialisation du projet exige de définir les conventions de repository, migrations, sécurité et tests avant de livrer des fonctionnalités.

---

## Implementation Roadmap

Les étapes techniques suivantes sont approuvées comme séquence d'implémentation, sans être exécutées par cette ADR :

1. Initialiser le projet Next.js + TypeScript.
2. Configurer Tailwind CSS et le Phoenix Design System.
3. Configurer Supabase/PostgreSQL.
4. Configurer les migrations versionnées.
5. Configurer ESLint et Prettier.
6. Configurer Vitest.
7. Configurer Playwright.
8. Créer les premières conventions d'architecture.
9. Implémenter le premier domaine selon le Product Backlog.
10. Mettre en place la CI.

---

## Decision Rule

Phoenix OS adopte cette architecture comme architecture technique de référence V1. Toute modification structurante doit faire l'objet d'une nouvelle ADR.
