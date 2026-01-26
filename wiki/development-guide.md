# Development Guide

> **Last Updated:** January 2026
> **Status:** Active Development

---

Complete guide for setting up a development environment and contributing to MetricFrame.

## Development Setup

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Docker | 24.x+ | [docker.com](https://docker.com) |
| Docker Compose | 2.x+ | Included with Docker Desktop |
| Node.js | 20.x+ | [nodejs.org](https://nodejs.org) (optional for frontend dev) |
| Python | 3.11+ | [python.org](https://python.org) (optional for backend dev) |
| Poetry | 1.x+ | `pip install poetry` (optional) |
| Git | 2.30+ | [git-scm.com](https://git-scm.com) |

### Quick Setup (Docker)

```bash
# Clone repository
git clone https://github.com/your-org/metricframe.git
cd metricframe

# Copy environment file
cp backend/.env.example backend/.env

# Start all services
./dev.sh
```

### Local Development (Without Docker)

#### Backend Setup

```bash
cd backend

# Install dependencies with Poetry
poetry install

# Activate virtual environment
poetry shell

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Run database migrations
alembic upgrade head

# Seed database
python -m src.seeds.seed_all --clear

# Start development server
uvicorn src.main:app --reload --port 8002
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Database Setup

```bash
# Start PostgreSQL (Docker)
docker run -d \
  --name metricframe_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=metricframe \
  -p 5432:5432 \
  postgres:15

# Or connect to existing PostgreSQL
# Update DATABASE_URL in backend/.env
```

## Project Structure

```
metricframe/
├── backend/
│   ├── src/
│   │   ├── main.py           # FastAPI application entry
│   │   ├── config.py         # Configuration management
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic validation schemas
│   │   ├── database.py       # Database connection
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── metrics.py    # Metrics CRUD endpoints
│   │   │   ├── scores.py     # Score calculation endpoints
│   │   │   ├── ai.py         # AI assistant endpoints
│   │   │   ├── catalogs.py   # Catalog management
│   │   │   ├── csf.py        # Framework reference
│   │   │   └── frameworks.py # Multi-framework support
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── scoring.py    # Score calculation logic
│   │   │   ├── ai_client.py  # AI provider integration
│   │   │   ├── catalog_scoring.py
│   │   │   └── csf_reference.py
│   │   └── seeds/
│   │       ├── seed_all.py      # Master seed script
│   │       ├── load_metrics.py  # JSON metrics loader
│   │       └── data/
│   ├── alembic/
│   │   ├── versions/         # Migration files
│   │   └── env.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_metrics.py
│   │   └── test_scoring.py
│   ├── pyproject.toml        # Poetry dependencies
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Root component
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MetricsGrid.tsx
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── AIChat.tsx
│   │   │   ├── CatalogManager.tsx
│   │   │   └── CatalogWizard.tsx
│   │   ├── api/
│   │   │   └── client.ts     # API client
│   │   ├── types/
│   │   │   └── index.ts      # TypeScript definitions
│   │   └── hooks/
│   │       └── useMetrics.ts
│   ├── public/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── docs/
├── wiki/
├── dev.sh                    # Development startup script
└── README.md
```

## Backend Development

### FastAPI Patterns

#### Router Structure

```python
# backend/src/routers/metrics.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import MetricCreate, MetricResponse
from ..models import Metric

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/", response_model=list[MetricResponse])
async def list_metrics(
    function: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Metric)
    if function:
        query = query.filter(Metric.csf_function == function)
    return query.all()

@router.post("/", response_model=MetricResponse, status_code=201)
async def create_metric(
    metric: MetricCreate,
    db: Session = Depends(get_db)
):
    db_metric = Metric(**metric.model_dump())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric
```

#### Pydantic Schemas

```python
# backend/src/schemas.py
from pydantic import BaseModel, Field
from enum import Enum
from uuid import UUID

class MetricDirection(str, Enum):
    higher_is_better = "higher_is_better"
    lower_is_better = "lower_is_better"
    target_range = "target_range"
    binary = "binary"

class MetricPriority(str, Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"

class MetricBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    current_value: float | None = None
    target_value: float | None = None
    unit: str | None = None
    direction: MetricDirection = MetricDirection.higher_is_better
    csf_function: str
    csf_category: str | None = None
    priority: MetricPriority = MetricPriority.Medium

class MetricCreate(MetricBase):
    pass

class MetricResponse(MetricBase):
    id: UUID
    metric_number: str | None
    score: float | None

    class Config:
        from_attributes = True
```

#### Service Layer

```python
# backend/src/services/scoring.py
from decimal import Decimal
from ..models import Metric

def compute_metric_score(metric: Metric) -> float | None:
    """Calculate score for a single metric."""
    if metric.current_value is None or metric.target_value is None:
        return None

    current = float(metric.current_value)
    target = float(metric.target_value)

    if metric.direction == "higher_is_better":
        if target == 0:
            return 100.0 if current >= 0 else 0.0
        score = (current / target) * 100
        return min(100.0, max(0.0, score))

    elif metric.direction == "lower_is_better":
        if current <= target:
            return 100.0
        if current == 0:
            return 100.0
        score = (target / current) * 100
        return min(100.0, max(0.0, score))

    # ... handle other directions

    return None
```

### SQLAlchemy Models

```python
# backend/src/models.py
from sqlalchemy import Column, String, Numeric, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from .database import Base

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_number = Column(String(20))
    name = Column(String(200), nullable=False)
    description = Column(String)
    current_value = Column(Numeric(15, 4))
    target_value = Column(Numeric(15, 4))
    unit = Column(String(50))
    direction = Column(
        Enum("higher_is_better", "lower_is_better", "target_range", "binary",
             name="metric_direction"),
        nullable=False,
        default="higher_is_better"
    )
    csf_function = Column(String(10), nullable=False, index=True)
    csf_category = Column(String(20), index=True)
    priority = Column(
        Enum("High", "Medium", "Low", name="metric_priority"),
        nullable=False,
        default="Medium"
    )
    is_locked = Column(Boolean, default=False)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"))

    catalog = relationship("MetricCatalog", back_populates="metrics")
    history = relationship("MetricHistory", back_populates="metric")
```

## Frontend Development

### React Patterns

#### Component Structure

```typescript
// frontend/src/components/MetricsGrid.tsx
import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMetrics } from '../hooks/useMetrics';
import { Metric } from '../types';

interface MetricsGridProps {
  functionFilter?: string;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ functionFilter }) => {
  const { metrics, loading, error, refetch } = useMetrics(functionFilter);

  const columns: GridColDef[] = [
    { field: 'metric_number', headerName: 'Number', width: 100 },
    { field: 'name', headerName: 'Name', width: 250 },
    { field: 'current_value', headerName: 'Current', width: 100 },
    { field: 'target_value', headerName: 'Target', width: 100 },
    { field: 'score', headerName: 'Score', width: 100 },
    { field: 'priority', headerName: 'Priority', width: 100 },
  ];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <DataGrid
      rows={metrics}
      columns={columns}
      pageSize={25}
      getRowId={(row) => row.id}
    />
  );
};
```

#### Custom Hooks

```typescript
// frontend/src/hooks/useMetrics.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Metric } from '../types';

export function useMetrics(functionFilter?: string) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = functionFilter ? { function: functionFilter } : {};
      const response = await apiClient.get('/metrics', { params });
      setMetrics(response.data.data.metrics);
    } catch (err) {
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [functionFilter]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}
```

#### API Client

```typescript
// frontend/src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);
```

### TypeScript Definitions

```typescript
// frontend/src/types/index.ts
export type MetricDirection =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'target_range'
  | 'binary';

export type MetricPriority = 'High' | 'Medium' | 'Low';

export interface Metric {
  id: string;
  metric_number: string | null;
  name: string;
  description: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  direction: MetricDirection;
  csf_function: string;
  csf_category: string | null;
  priority: MetricPriority;
  score: number | null;
  is_locked: boolean;
}

export interface FunctionScore {
  code: string;
  name: string;
  score: number;
  rating: string;
  metric_count: number;
  trend: 'up' | 'down' | 'stable';
}
```

## Adding New Features

### Backend Feature Workflow

1. **Define schema** in `schemas.py`
2. **Create/update model** in `models.py`
3. **Generate migration**: `alembic revision --autogenerate -m "description"`
4. **Apply migration**: `alembic upgrade head`
5. **Implement service** logic in `services/`
6. **Create router** endpoints in `routers/`
7. **Register router** in `main.py`
8. **Write tests** in `tests/`

### Frontend Feature Workflow

1. **Define types** in `types/`
2. **Extend API client** if new endpoints
3. **Create/update hook** for data fetching
4. **Build component** in `components/`
5. **Add to routing** if new page
6. **Write tests** with React Testing Library

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_scoring.py

# Run specific test
pytest tests/test_scoring.py::test_higher_is_better
```

**Example Test:**
```python
# backend/tests/test_scoring.py
import pytest
from src.services.scoring import compute_metric_score
from src.models import Metric

def test_higher_is_better_at_target():
    metric = Metric(
        current_value=95,
        target_value=95,
        direction="higher_is_better"
    )
    score = compute_metric_score(metric)
    assert score == 100.0

def test_higher_is_better_below_target():
    metric = Metric(
        current_value=80,
        target_value=100,
        direction="higher_is_better"
    )
    score = compute_metric_score(metric)
    assert score == 80.0
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Database Migrations

### Creating Migrations

```bash
cd backend

# Auto-generate from model changes
alembic revision --autogenerate -m "Add new column to metrics"

# Create empty migration
alembic revision -m "Custom migration"
```

### Migration Commands

```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Show current revision
alembic current

# Show migration history
alembic history
```

## Debugging Tips

### Backend Debugging

```python
# Add debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug(f"Processing metric: {metric.id}")
```

```bash
# Run with auto-reload and debug
uvicorn src.main:app --reload --log-level debug
```

### Frontend Debugging

```typescript
// Use React DevTools
// Browser extension: React Developer Tools

// Debug API calls
console.log('API Response:', response.data);

// Use debugger statement
debugger;
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it metricframe_db psql -U postgres -d metricframe

# Useful queries
SELECT * FROM metrics LIMIT 10;
SELECT csf_function, COUNT(*) FROM metrics GROUP BY csf_function;
```

---

**Next:** [Troubleshooting](troubleshooting.md) - Solutions to common issues
