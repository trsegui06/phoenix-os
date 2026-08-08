# Sprint 06 — Phoenix Wealth Foundation

**Project:** Phoenix OS
**Document:** Sprint 06 Specification
**Status:** Proposed — preparatory specification
**Scope:** Future Wealth Management foundation

---

## 1. Objectif

Construire le socle **Wealth Management** de Phoenix OS afin de centraliser la vision patrimoniale, les flux financiers, la protection de trésorerie et les décisions d'allocation.

Ce sprint prépare un domaine fiable et extensible. Il ne remplace pas le Trading Core : il consolide les données financières personnelles pour permettre des arbitrages cohérents entre sécurité, investissement, trading et développement de Phoenix OS.

---

## 2. Modules

- **Accounts** — comptes financiers et comptes de suivi.
- **Assets** — positions et éléments détenus ayant une valeur positive.
- **Liabilities** — dettes et engagements financiers à rembourser.
- **Transactions** — événements financiers horodatés et traçables.
- **Emergency Fund** — suivi du fonds de sécurité, de ses seuils et de ses snapshots.
- **Allocation Engine** — préparation des répartitions mensuelles applicables aux flux éligibles.
- **Monthly Financial Review** — revue mensuelle du patrimoine, des flux, des écarts et des décisions.

---

## 3. Modèle métier

### Account

Représente un support financier suivi par Phoenix OS : compte courant, épargne, courtier, portefeuille d'investissement, compte de trading, dette ou compte technique.

**Attributs principaux :**

- `id` (UUID)
- `name`
- `account_type`
- `institution`
- `currency` (ISO 4217)
- `status` (`active`, `archived`, `closed`)
- `opened_at`
- `closed_at` (optionnel)
- `created_at`

**Relations :** un Account possède des Transactions, peut héberger des Assets ou des Liabilities et peut être désigné comme support de l'Emergency Fund.

**Invariants :** un compte archivé ou clôturé reste consultable ; aucune Transaction validée n'est supprimée avec le compte ; la devise est obligatoire.

### Asset

Représente un élément à valeur positive détenu ou suivi : liquidités, ETF, action, immobilier, cryptoactif, capital de trading ou autre actif défini.

**Attributs principaux :**

- `id` (UUID)
- `account_id`
- `name`
- `asset_type`
- `allocation_bucket` (`emergency_fund`, `long_term`, `real_estate`, `trading`, `phoenix_os`, `opportunities_pleasure`)
- `quantity` (optionnel)
- `unit_value_cents`
- `valuation_cents`
- `valued_at`
- `status`

**Relations :** un Asset appartient à un Account ; ses mouvements de valeur ou de détention sont justifiés par des Transactions ; il est agrégé dans les allocations et les revues.

**Invariants :** `valuation_cents` est supérieur ou égal à zéro ; un Asset ne peut appartenir qu'à un seul Account à un instant donné ; toute valorisation est datée.

### Liability

Représente une obligation financière : prêt, crédit, dette fiscale ou autre engagement remboursable.

**Attributs principaux :**

- `id` (UUID)
- `account_id`
- `name`
- `liability_type`
- `principal_cents`
- `outstanding_balance_cents`
- `interest_rate_bps` (optionnel)
- `payment_amount_cents` (optionnel)
- `due_date` (optionnel)
- `status`

**Relations :** une Liability est rattachée à un Account ; ses décaissements et remboursements sont enregistrés comme Transactions ; elle est intégrée à la valeur nette dans les revues.

**Invariants :** `outstanding_balance_cents` ne peut pas être négatif ; une dette soldée est conservée avec le statut `closed` ; un remboursement ne peut pas excéder le solde restant sans événement de correction explicitement validé.

### Transaction

Représente un événement financier élémentaire et immuable après validation : revenu, dépense, transfert, contribution, achat, vente, apport, remboursement ou ajustement documenté.

**Attributs principaux :**

- `id` (UUID)
- `account_id`
- `transaction_type`
- `amount_cents`
- `currency`
- `occurred_at`
- `validated_at` (optionnel)
- `status` (`draft`, `validated`)
- `counterparty` (optionnel)
- `category`
- `asset_id` (optionnel)
- `liability_id` (optionnel)
- `allocation_id` (optionnel)
- `reference_transaction_id` (optionnel, pour annulation)
- `note` (optionnel)

**Relations :** une Transaction appartient à un Account, peut référencer un Asset ou une Liability, peut alimenter une Allocation et est la source de vérité des flux présentés dans les revues.

**Invariants :** le montant est non nul ; un crédit est positif et un débit négatif ; une Transaction validée n'est ni modifiée ni supprimée ; une correction utilise une nouvelle Transaction de contrepassation validée, liée à la transaction d'origine ; tout transfert entre comptes est représenté par des événements liés et équilibrés ; une même Transaction ne référence pas simultanément un Asset et une Liability sauf type d'événement explicitement défini.

### Emergency Fund

Représente la politique et la position de sécurité de trésorerie, suivie au travers d'un ou plusieurs Accounts désignés.

**Attributs principaux :**

- `id` (UUID)
- `goal_cents`
- `critical_threshold_cents`
- `intermediate_threshold_cents`
- `current_balance_cents` (valeur préparée)
- `status` (`critical`, `below_intermediate`, `building`, `funded`)
- `effective_from`
- `effective_to` (optionnel)

**Relations :** l'Emergency Fund est relié à un ou plusieurs Accounts ; il produit des snapshots ; son statut influence l'Allocation Engine.

**Invariants :** `critical_threshold_cents` ≤ `intermediate_threshold_cents` ≤ `goal_cents` ; le solde courant est calculé depuis les comptes et snapshots désignés, jamais saisi comme source concurrente ; le statut est dérivé des seuils et non modifié manuellement.

### Allocation

Représente une règle de répartition mensuelle versionnée et les montants préparés qui en découlent pour une période.

**Attributs principaux :**

- `id` (UUID)
- `version`
- `effective_from`
- `effective_to` (optionnel)
- `trigger_condition`
- `bucket`
- `percentage_basis_points`
- `prepared_amount_cents`
- `goal_id` (optionnel)
- `status` (`draft`, `active`, `superseded`, `applied`)

**Relations :** une Allocation peut être alimentée par des Transactions éligibles et reliée à un Goal ; elle est utilisée pour préparer le dashboard et la revue mensuelle.

**Invariants :** pour une même version et condition, les pourcentages totalisent 10 000 points de base ; une version active ne peut pas être réécrite ; toute évolution crée une nouvelle version avec une période d'effet explicite ; les montants préparés totalisent exactement le montant allouable en centimes, l'éventuel reliquat d'arrondi étant distribué par une règle déterministe documentée lors de l'implémentation.

### Goal

Représente une cible financière mesurable rattachée à une allocation ou à un domaine patrimonial.

**Attributs principaux :**

- `id` (UUID)
- `name`
- `goal_type`
- `target_cents`
- `target_date` (optionnel)
- `status`
- `created_at`

**Relations :** un Goal peut recevoir une ou plusieurs Allocations ; l'objectif Emergency Fund référence la cible de sécurité.

**Invariants :** `target_cents` est strictement positif ; les progrès sont calculés à partir des données validées, pas modifiés manuellement.

### EmergencyFundSnapshot

Représente l'état figé du fonds de sécurité à une date donnée afin de préserver l'historique de sa progression.

**Attributs principaux :**

- `id` (UUID)
- `emergency_fund_id`
- `as_of_date`
- `balance_cents`
- `status`
- `created_at`

**Relations :** un snapshot appartient à un Emergency Fund et est utilisé par les revues mensuelles et le dashboard préparé.

**Invariants :** un seul snapshot par fonds et par date de référence ; un snapshot publié est immuable.

### MonthlyFinancialReview

Représente une synthèse mensuelle calculée et validée : évolution de la valeur nette, flux, allocations, état de l'Emergency Fund et décisions de suivi.

**Attributs principaux :**

- `id` (UUID)
- `period_start`
- `period_end`
- `net_worth_cents`
- `income_cents`
- `expense_cents`
- `allocation_summary`
- `emergency_fund_status`
- `decisions`
- `status` (`draft`, `validated`)
- `validated_at` (optionnel)

**Relations :** une MonthlyFinancialReview consolide les Transactions, Assets, Liabilities, Allocations et snapshots pertinents à la période.

**Invariants :** les périodes ne se chevauchent pas pour une même cadence mensuelle ; les chiffres de synthèse restent reproductibles depuis les données source et les snapshots ; une revue validée est immuable et historisée.

---

## 4. Emergency Fund

La politique de sécurité est définie par les seuils suivants :

| Niveau | Montant |
| --- | ---: |
| Seuil critique | 1 500 € |
| Seuil intermédiaire | 3 000 € |
| Cible finale | 7 500 € |

Le statut est calculé à partir du solde préparé du ou des Accounts associés :

- **Critical** : solde inférieur à 1 500 €.
- **Below intermediate** : solde compris entre 1 500 € et 2 999,99 €.
- **Building** : solde compris entre 3 000 € et 7 499,99 €.
- **Funded** : solde supérieur ou égal à 7 500 €.

Le seuil de 3 000 € détermine la règle d'allocation mensuelle applicable.

---

## 5. Allocation mensuelle sous 3 000 €

Lorsque le solde préparé de l'Emergency Fund est strictement inférieur à 3 000 €, les flux mensuels allouables utilisent la version de politique suivante :

| Destination | Part |
| --- | ---: |
| Emergency Fund | 50 % |
| Long Term | 20 % |
| Real Estate | 10 % |
| Trading | 10 % |
| Phoenix OS | 5 % |
| Opportunities/Pleasure | 5 % |
| **Total** | **100 %** |

---

## 6. Allocation mensuelle après 3 000 €

Lorsque le solde préparé de l'Emergency Fund est supérieur ou égal à 3 000 €, les flux mensuels allouables utilisent la version de politique suivante :

| Destination | Part |
| --- | ---: |
| Emergency Fund | 10 % |
| Long Term | 35 % |
| Real Estate | 20 % |
| Trading | 15 % |
| Phoenix OS | 10 % |
| Opportunities/Pleasure | 10 % |
| **Total** | **100 %** |

---

## 7. Allocation cible du portefeuille

La cible stratégique de répartition du portefeuille est :

| Poche | Part cible |
| --- | ---: |
| Long Term | 50 % |
| Real Estate | 20 % |
| Trading | 15 % |
| Opportunities | 10 % |
| Phoenix OS | 5 % |
| **Total** | **100 %** |

Cette allocation est un repère de pilotage à long terme. Elle est distincte des règles de distribution mensuelle et ne déclenche pas seule de mouvement financier.

---

## 8. Règles techniques

- Tous les montants monétaires sont stockés en **centimes entiers** (`*_cents`) ; aucune valeur monétaire ne repose sur un nombre à virgule flottante.
- Une Transaction validée est immuable. Toute correction est une contrepassation liée, suivie si nécessaire d'une nouvelle Transaction.
- Les crédits sont enregistrés avec un montant positif et les débits avec un montant négatif ; les montants d'allocation préparés restent non négatifs.
- Les répartitions en pourcentage sont calculées en centimes et leur reliquat d'arrondi est attribué par une règle déterministe documentée avant l'implémentation.
- Les règles d'allocations mensuelles sont versionnées, datées et jamais modifiées rétroactivement.
- L'Emergency Fund produit des snapshots datés et immuables pour préserver l'historique.
- Les règles métier, calculs d'éligibilité, statuts et répartitions restent hors de l'UI.
- Le dashboard consomme des données préparées, calculées à partir des sources validées, et ne devient jamais une source de vérité.
- Les agrégats de patrimoine doivent distinguer valeur brute des Assets, valeur des Liabilities et valeur nette.
- Toute donnée calculée doit être traçable à sa période, sa version de politique et ses données source.

---

## 9. Relations

| Relation | Règle |
| --- | --- |
| Account → Transaction | Un Account possède zéro à plusieurs Transactions ; chaque Transaction appartient à un seul Account. |
| Asset → Account | Un Asset est rattaché à un Account à un instant donné ; un Account peut contenir plusieurs Assets. |
| Liability → Account | Une Liability est rattachée à un Account ; un Account peut suivre plusieurs Liabilities. |
| Transaction → Asset / Liability | Une Transaction peut référencer un Asset ou une Liability pour tracer un mouvement ou remboursement ; le lien est optionnel lorsque le flux n'affecte pas directement une position ou une dette. |
| Transaction → Allocation | Une Transaction éligible peut être associée à une Allocation ; une Allocation peut préparer plusieurs mouvements. |
| Allocation → Goal | Une Allocation peut contribuer à un Goal ; un Goal peut agréger plusieurs Allocations. |
| Emergency Fund → Account | Un Emergency Fund désigne un ou plusieurs Accounts dont les soldes alimentent son solde préparé. |
| Monthly Review → Transactions / Assets / Liabilities | Une MonthlyFinancialReview consolide les données validées et valorisations de la période, sans les modifier. |

---

## 10. Definition of Done

Le Sprint 06 est considéré comme terminé lorsque :

- le modèle de données Wealth est validé, documenté et cohérent avec le modèle global Phoenix OS ;
- les modules Accounts, Assets, Liabilities, Transactions, Emergency Fund, Allocation Engine et Monthly Financial Review sont définis avec leurs responsabilités et invariants ;
- les montants sont traités exclusivement en centimes ;
- l'immuabilité des Transactions validées et le mécanisme de contrepassation sont couverts par des tests ;
- les deux politiques mensuelles et l'allocation cible sont versionnées, calculables et couvertes par des tests de seuil ;
- les snapshots du fonds d'urgence sont reproductibles, datés et immuables ;
- les données préparées nécessaires au dashboard et à la revue mensuelle sont disponibles sans logique métier dans l'UI ;
- les scénarios critiques (solde sous 1 500 €, passage du seuil 3 000 €, atteinte de 7 500 €, remboursement de dette, correction de transaction) sont validés ;
- les règles de signe, les transferts équilibrés et l'arrondi des allocations sont couverts par des tests déterministes ;
- les dépendances documentaires et les décisions d'implémentation ouvertes ont reçu la validation requise ;
- aucune règle ne contredit les Business Rules, l'Architecture ou le Data Model approuvés de Phoenix OS.

---

## 11. Dépendances

- **docs/DataModel.md** — extension contrôlée du modèle approuvé ; les entités Wealth prévues en V2 (`Portfolio`, `Investment`, `Dividend`, `Cash Flow`) doivent être rapprochées de cette spécification avant toute implémentation.
- **docs/Architecture.md** — intégration en module Wealth Management, avec source unique de vérité dans la couche de données et données préparées pour le Dashboard.
- **docs/ProductBacklog.md** — EPIC-06 Wealth reste la référence de planification ; ce document le prépare sans modifier son statut ni sa position dans la roadmap.
- **Sprint 01 / Trading Core** — le PRD positionne le modèle de données au Sprint 01, tandis que le Product Backlog y positionne le Trading Core ; cette spécification dépend des principes communs d'Accounts, de traçabilité et de calculs, avec séparation stricte des données de trading et patrimoniales. La terminologie et le jalon de référence doivent être alignés avant implémentation, sans déplacer Wealth du Sprint 06.
- **Sprint 02 Dashboard** — exposition future des KPI Wealth via des vues préparées ; le Dashboard reste consommateur et ne porte aucune règle métier.

---

## 12. Questions ouvertes

- Quels `account_type`, `asset_type`, `liability_type` et `transaction_type` constituent le référentiel V1 officiellement approuvé ?
- L'Emergency Fund doit-il agréger plusieurs devises et, si oui, quelle source de taux et quelle règle de conversion sont validées ?
- Quel événement rend un flux mensuel « allouable » : revenu encaissé, solde net disponible après charges, ou montant explicitement validé ?
- Les poches « Opportunities » et « Pleasure » doivent-elles être séparées dans l'allocation cible, alors qu'elles sont regroupées dans les allocations mensuelles ?
- Quels actifs doivent être valorisés automatiquement, manuellement, ou par snapshot périodique ?
- Quelle fréquence, quel responsable de validation et quelle politique de clôture s'appliquent à la Monthly Financial Review ?
- Comment relier un Account de trading aux données du Sprint 01 sans dupliquer solde, performance ou transactions ?
- Quelle gouvernance d'accès et quel niveau de confidentialité sont requis pour les données patrimoniales ?

---

End of Document
