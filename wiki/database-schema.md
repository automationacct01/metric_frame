# Database Schema

> **Last Updated:** January 2026
> **Status:** Active Development

---

Documentation of the PostgreSQL database schema, models, relationships, and migrations for Cyber Metrics Flow.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRAMEWORK HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐       │
│  │  frameworks  │────<│ framework_       │────<│ framework_         │       │
│  │              │     │ functions        │     │ categories         │       │
│  │  id          │     │                  │     │                    │       │
│  │  name        │     │  id              │     │  id                │       │
│  │  version     │     │  framework_id    │     │  function_id       │       │
│  └──────────────┘     │  code            │     │  code              │       │
│                       │  name            │     │  name              │       │
│                       └──────────────────┘     └─────────┬──────────┘       │
│                                                          │                  │
│                                                          ▼                  │
│                                              ┌────────────────────┐         │
│                                              │ framework_         │         │
│                                              │ subcategories      │         │
│                                              │                    │         │
│                                              │  id                │         │
│                                              │  category_id       │         │
│                                              │  code              │         │
│                                              └────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              METRICS SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                          ┌──────────────────┐         │
│  │     metrics      │─────────────────────────<│  metric_history  │         │
│  │                  │                          │                  │         │
│  │  id              │                          │  id              │         │
│  │  metric_number   │                          │  metric_id       │         │
│  │  name            │                          │  value           │         │
│  │  current_value   │                          │  recorded_at     │         │
│  │  target_value    │                          │  note            │         │
│  │  csf_function    │                          └──────────────────┘         │
│  │  csf_category    │                                                       │
│  │  priority        │                                                       │
│  │  catalog_id (FK) │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                  │
│           │         ┌──────────────────┐                                    │
│           └────────>│  metric_catalogs │                                    │
│                     │                  │                                    │
│                     │  id              │                                    │
│                     │  name            │                                    │
│                     │  owner_id (FK)   │───────┐                            │
│                     │  is_active       │       │                            │
│                     └────────┬─────────┘       │                            │
│                              │                 │                            │
│                              ▼                 ▼                            │
│                 ┌────────────────────┐  ┌──────────────┐                   │
│                 │ metric_catalog_    │  │    users     │                   │
│                 │ items              │  │              │                   │
│                 │                    │  │  id          │                   │
│                 │  id                │  │  username    │                   │
│                 │  catalog_id        │  │  email       │                   │
│                 │  metric_data       │  │  active_     │                   │
│                 │  csf_mappings      │  │  catalog_id  │                   │
│                 └────────────────────┘  └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPPORTING TABLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │  ai_change_log   │     │  function_scores │     │  framework_      │    │
│  │                  │     │                  │     │  scores          │    │
│  │  id              │     │  id              │     │                  │    │
│  │  timestamp       │     │  function_code   │     │  id              │    │
│  │  action          │     │  score           │     │  framework_id    │    │
│  │  source          │     │  calculated_at   │     │  overall_score   │    │
│  │  prompt          │     │  catalog_id      │     │  calculated_at   │    │
│  │  result          │     └──────────────────┘     └──────────────────┘    │
│  │  user_id         │                                                       │
│  └──────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Framework Hierarchy Tables

### frameworks

Stores supported security frameworks.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `name` | VARCHAR(100) | No | Framework name |
| `version` | VARCHAR(20) | No | Framework version |
| `description` | TEXT | Yes | Framework description |
| `is_active` | BOOLEAN | No | Whether framework is enabled |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- Primary key on `id`
- Unique on `(name, version)`

### framework_functions

Stores functions within each framework.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `framework_id` | UUID | No | FK to frameworks |
| `code` | VARCHAR(10) | No | Function code (GV, ID, PR, etc.) |
| `name` | VARCHAR(100) | No | Function name |
| `description` | TEXT | Yes | Function description |
| `sort_order` | INTEGER | No | Display order |
| `created_at` | TIMESTAMP | No | Record creation time |

**Indices:**
- Primary key on `id`
- Foreign key on `framework_id`
- Unique on `(framework_id, code)`

### framework_categories

Stores categories within functions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `function_id` | UUID | No | FK to framework_functions |
| `code` | VARCHAR(20) | No | Category code (PR.AA, DE.CM, etc.) |
| `name` | VARCHAR(200) | No | Category name |
| `description` | TEXT | Yes | Category description |
| `sort_order` | INTEGER | No | Display order |
| `created_at` | TIMESTAMP | No | Record creation time |

**Indices:**
- Primary key on `id`
- Foreign key on `function_id`
- Unique on `(function_id, code)`

### framework_subcategories

Stores subcategories within categories.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `category_id` | UUID | No | FK to framework_categories |
| `code` | VARCHAR(30) | No | Subcategory code (PR.AA-01) |
| `description` | TEXT | No | Subcategory description |
| `sort_order` | INTEGER | No | Display order |
| `created_at` | TIMESTAMP | No | Record creation time |

**Indices:**
- Primary key on `id`
- Foreign key on `category_id`
- Unique on `(category_id, code)`

## Metrics Tables

### metrics

Core table storing all security metrics.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `metric_number` | VARCHAR(20) | Yes | Display number (PR-001) |
| `name` | VARCHAR(200) | No | Metric name |
| `description` | TEXT | Yes | Detailed description |
| `current_value` | DECIMAL(15,4) | Yes | Current measured value |
| `target_value` | DECIMAL(15,4) | Yes | Target/goal value |
| `target_lower` | DECIMAL(15,4) | Yes | Lower bound (for ranges) |
| `target_upper` | DECIMAL(15,4) | Yes | Upper bound (for ranges) |
| `unit` | VARCHAR(50) | Yes | Unit of measurement |
| `direction` | ENUM | No | higher_is_better, lower_is_better, target_range, binary |
| `csf_function` | VARCHAR(10) | No | CSF function code |
| `csf_category` | VARCHAR(20) | Yes | CSF category code |
| `priority` | ENUM | No | High, Medium, Low |
| `is_locked` | BOOLEAN | No | Prevent edits (default: false) |
| `catalog_id` | UUID | Yes | FK to metric_catalogs |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- Primary key on `id`
- Foreign key on `catalog_id`
- Index on `csf_function`
- Index on `csf_category`
- Index on `priority`
- Index on `catalog_id`

**Enum Types:**
```sql
CREATE TYPE metric_direction AS ENUM (
    'higher_is_better',
    'lower_is_better',
    'target_range',
    'binary'
);

CREATE TYPE metric_priority AS ENUM (
    'High',
    'Medium',
    'Low'
);
```

### metric_history

Time series data for metric values.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `metric_id` | UUID | No | FK to metrics |
| `value` | DECIMAL(15,4) | No | Recorded value |
| `recorded_at` | TIMESTAMP | No | When value was recorded |
| `note` | TEXT | Yes | Optional note |
| `recorded_by` | UUID | Yes | FK to users |
| `created_at` | TIMESTAMP | No | Record creation time |

**Indices:**
- Primary key on `id`
- Foreign key on `metric_id`
- Index on `(metric_id, recorded_at)`

## Catalog Tables

### metric_catalogs

Custom metric catalog definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `name` | VARCHAR(200) | No | Catalog name |
| `description` | TEXT | Yes | Catalog description |
| `owner_id` | UUID | No | FK to users |
| `is_active` | BOOLEAN | No | Currently active for owner |
| `source_file` | VARCHAR(500) | Yes | Original import filename |
| `import_metadata` | JSONB | Yes | Import details |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- Primary key on `id`
- Foreign key on `owner_id`
- Index on `owner_id`
- Index on `is_active`

### metric_catalog_items

Individual metrics within a catalog.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `catalog_id` | UUID | No | FK to metric_catalogs |
| `original_data` | JSONB | No | Raw imported data |
| `name` | VARCHAR(200) | No | Metric name |
| `description` | TEXT | Yes | Metric description |
| `current_value` | DECIMAL(15,4) | Yes | Current value |
| `target_value` | DECIMAL(15,4) | Yes | Target value |
| `unit` | VARCHAR(50) | Yes | Unit of measurement |
| `direction` | ENUM | Yes | Value direction |
| `priority` | ENUM | Yes | Priority level |
| `is_enhanced` | BOOLEAN | No | AI enhancement applied |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- Primary key on `id`
- Foreign key on `catalog_id`
- Index on `catalog_id`

### metric_catalog_framework_mappings

Framework mappings for catalog items.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `catalog_item_id` | UUID | No | FK to metric_catalog_items |
| `framework_id` | UUID | No | FK to frameworks |
| `function_code` | VARCHAR(10) | No | Mapped function |
| `category_code` | VARCHAR(20) | Yes | Mapped category |
| `subcategory_code` | VARCHAR(30) | Yes | Mapped subcategory |
| `confidence` | DECIMAL(5,4) | Yes | AI mapping confidence |
| `is_ai_suggested` | BOOLEAN | No | AI-generated mapping |
| `is_confirmed` | BOOLEAN | No | User confirmed |
| `created_at` | TIMESTAMP | No | Record creation time |

**Indices:**
- Primary key on `id`
- Foreign key on `catalog_item_id`
- Foreign key on `framework_id`
- Index on `(catalog_item_id, framework_id)`

## Supporting Tables

### users

User accounts and preferences.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `username` | VARCHAR(100) | No | Unique username |
| `email` | VARCHAR(255) | No | Email address |
| `password_hash` | VARCHAR(255) | Yes | Hashed password |
| `active_catalog_id` | UUID | Yes | FK to metric_catalogs |
| `preferences` | JSONB | Yes | User preferences |
| `is_active` | BOOLEAN | No | Account active |
| `created_at` | TIMESTAMP | No | Account creation |
| `last_login` | TIMESTAMP | Yes | Last login time |

**Indices:**
- Primary key on `id`
- Unique on `username`
- Unique on `email`
- Foreign key on `active_catalog_id`

### ai_change_log

Audit trail for AI-driven changes.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `timestamp` | TIMESTAMP | No | When action occurred |
| `action` | VARCHAR(50) | No | Action type |
| `source` | VARCHAR(50) | No | Source (ai_assistant, etc.) |
| `mode` | VARCHAR(50) | Yes | AI mode used |
| `user_id` | UUID | Yes | FK to users |
| `prompt` | TEXT | Yes | User prompt |
| `result` | JSONB | Yes | Action result |
| `ai_provider` | VARCHAR(50) | Yes | AI provider used |
| `ai_model` | VARCHAR(100) | Yes | AI model used |
| `tokens_used` | INTEGER | Yes | Token consumption |
| `created_at` | TIMESTAMP | No | Record creation |

**Indices:**
- Primary key on `id`
- Index on `timestamp`
- Index on `action`
- Index on `user_id`

### function_scores

Cached function-level scores.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `framework_id` | UUID | No | FK to frameworks |
| `function_code` | VARCHAR(10) | No | Function code |
| `catalog_id` | UUID | Yes | FK to metric_catalogs |
| `score` | DECIMAL(5,2) | No | Calculated score |
| `rating` | VARCHAR(20) | No | Risk rating |
| `metric_count` | INTEGER | No | Metrics in calculation |
| `calculated_at` | TIMESTAMP | No | When calculated |
| `valid_until` | TIMESTAMP | Yes | Cache expiry |

**Indices:**
- Primary key on `id`
- Index on `(framework_id, function_code, catalog_id)`
- Index on `calculated_at`

### framework_scores

Overall framework scores.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `framework_id` | UUID | No | FK to frameworks |
| `catalog_id` | UUID | Yes | FK to metric_catalogs |
| `overall_score` | DECIMAL(5,2) | No | Overall score |
| `overall_rating` | VARCHAR(20) | No | Risk rating |
| `function_scores` | JSONB | No | Function breakdown |
| `calculated_at` | TIMESTAMP | No | When calculated |

**Indices:**
- Primary key on `id`
- Index on `(framework_id, catalog_id)`

## Key Indices Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `metrics` | `idx_metrics_function` | `csf_function` | Filter by function |
| `metrics` | `idx_metrics_category` | `csf_category` | Filter by category |
| `metrics` | `idx_metrics_catalog` | `catalog_id` | Catalog filtering |
| `metric_history` | `idx_history_metric_date` | `metric_id, recorded_at` | Time series queries |
| `metric_catalog_items` | `idx_catalog_items_catalog` | `catalog_id` | Catalog contents |
| `ai_change_log` | `idx_changelog_date` | `timestamp` | Audit queries |

## Migrations

### Using Alembic

Generate new migration:
```bash
cd backend
alembic revision --autogenerate -m "Description of change"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback one migration:
```bash
alembic downgrade -1
```

### Migration Files Location

```
backend/
└── alembic/
    ├── versions/
    │   ├── 001_initial_schema.py
    │   ├── 002_add_catalogs.py
    │   ├── 003_add_frameworks.py
    │   └── ...
    ├── env.py
    └── alembic.ini
```

### Migration Best Practices

1. **Always generate from models** - Use `--autogenerate`
2. **Review generated migrations** - Check before applying
3. **Test rollback** - Ensure `downgrade()` works
4. **Keep migrations small** - One logical change per migration
5. **Never edit applied migrations** - Create new ones instead

---

**Next:** [Development Guide](development-guide.md) - Set up your development environment
