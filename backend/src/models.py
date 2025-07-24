"""SQLAlchemy ORM models for NIST CSF 2.0 metrics application."""

import enum
from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base


class CSFFunction(enum.Enum):
    """NIST CSF 2.0 Core Functions."""
    GOVERN = "gv"
    IDENTIFY = "id" 
    PROTECT = "pr"
    DETECT = "de"
    RESPOND = "rs"
    RECOVER = "rc"


class MetricDirection(enum.Enum):
    """Direction for metric scoring."""
    HIGHER_IS_BETTER = "higher_is_better"
    LOWER_IS_BETTER = "lower_is_better"
    TARGET_RANGE = "target_range"
    BINARY = "binary"


class CollectionFrequency(enum.Enum):
    """How often metrics are collected."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    AD_HOC = "ad_hoc"


class Metric(Base):
    """Core metrics table aligned to NIST CSF 2.0."""
    
    __tablename__ = "metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_number = Column(String(10), unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    formula = Column(Text)
    calc_expr_json = Column(JSON)
    
    # NIST CSF 2.0 alignment
    csf_function = Column(Enum(CSFFunction, name='csffunction', values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    csf_category_code = Column(String(20))
    csf_subcategory_code = Column(String(20))
    csf_category_name = Column(String(120))
    csf_subcategory_outcome = Column(Text)
    
    # Priority and weighting
    priority_rank = Column(Integer, default=2, index=True)  # 1=High, 2=Med, 3=Low
    weight = Column(Numeric(4, 2), default=1.0)
    
    # Scoring configuration
    direction = Column(Enum(MetricDirection), nullable=False)
    target_value = Column(Numeric(10, 4))
    target_units = Column(String(50))
    tolerance_low = Column(Numeric(10, 4))
    tolerance_high = Column(Numeric(10, 4))
    
    # Ownership and data source
    owner_function = Column(String(100))
    data_source = Column(String(200))
    collection_frequency = Column(Enum(CollectionFrequency))
    
    # Current state
    last_collected_at = Column(DateTime(timezone=True))
    current_value = Column(Numeric(10, 4))
    current_label = Column(String(100))
    
    # Metadata
    notes = Column(Text)
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    history = relationship("MetricHistory", back_populates="metric", cascade="all, delete-orphan")
    ai_changes = relationship("AIChangeLog", back_populates="metric")
    
    def __repr__(self) -> str:
        return f"<Metric(id={self.id}, name='{self.name}', function={self.csf_function.value})>"


class MetricHistory(Base):
    """Time series data for metrics."""
    
    __tablename__ = "metric_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), nullable=False)
    collected_at = Column(DateTime(timezone=True), nullable=False)
    raw_value_json = Column(JSON)
    normalized_value = Column(Numeric(10, 4))
    source_ref = Column(String(200))
    
    # Relationships
    metric = relationship("Metric", back_populates="history")
    
    def __repr__(self) -> str:
        return f"<MetricHistory(metric_id={self.metric_id}, collected_at={self.collected_at})>"


class AIChangeLog(Base):
    """Audit log for AI-driven changes."""
    
    __tablename__ = "ai_change_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), nullable=True)
    user_prompt = Column(Text, nullable=False)
    ai_response_json = Column(JSON, nullable=False)
    applied = Column(Boolean, default=False)
    applied_by = Column(String(100))
    applied_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    metric = relationship("Metric", back_populates="ai_changes")
    
    def __repr__(self) -> str:
        return f"<AIChangeLog(id={self.id}, applied={self.applied})>"


class MetricCatalog(Base):
    """Metric catalogs for multi-tenant support."""
    
    __tablename__ = "metric_catalogs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner = Column(String(255))  # Future: FK to users table
    active = Column(Boolean, default=False, index=True)
    is_default = Column(Boolean, default=False)
    file_format = Column(String(20))  # 'csv' or 'json'
    original_filename = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    catalog_items = relationship("MetricCatalogItem", back_populates="catalog", cascade="all, delete-orphan")
    csf_mappings = relationship("MetricCatalogCSFMapping", back_populates="catalog", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<MetricCatalog(id={self.id}, name='{self.name}', active={self.active})>"


class MetricCatalogItem(Base):
    """Items within a metric catalog."""
    
    __tablename__ = "metric_catalog_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"), nullable=False)
    metric_id = Column(String(100), nullable=False)  # User's original metric ID
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    formula = Column(Text)
    
    # Core required fields
    direction = Column(Enum(MetricDirection), nullable=False)
    target_value = Column(Numeric(10, 4))
    target_units = Column(String(50))
    tolerance_low = Column(Numeric(10, 4))
    tolerance_high = Column(Numeric(10, 4))
    
    # Priority and weighting
    priority_rank = Column(Integer, default=2)  # 1=High, 2=Med, 3=Low
    weight = Column(Numeric(4, 2), default=1.0)
    
    # Data source information
    owner_function = Column(String(100))
    data_source = Column(String(200))
    collection_frequency = Column(Enum(CollectionFrequency))
    
    # Current state
    current_value = Column(Numeric(10, 4))
    current_label = Column(String(100))
    
    # Import metadata
    original_row_data = Column(JSON)  # Store original import data
    import_notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    catalog = relationship("MetricCatalog", back_populates="catalog_items")
    csf_mappings = relationship("MetricCatalogCSFMapping", back_populates="catalog_item")
    
    def __repr__(self) -> str:
        return f"<MetricCatalogItem(id={self.id}, name='{self.name}', catalog_id={self.catalog_id})>"


class MetricCatalogCSFMapping(Base):
    """CSF mappings for catalog items."""
    
    __tablename__ = "metric_catalog_csf_mappings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"), nullable=False)
    catalog_item_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalog_items.id"), nullable=False)
    
    # CSF mapping
    csf_function = Column(Enum(CSFFunction, name='csffunction', values_callable=lambda obj: [e.value for e in obj]), nullable=False, index=True)
    csf_category_code = Column(String(20))
    csf_subcategory_code = Column(String(20))
    csf_category_name = Column(String(120))
    csf_subcategory_outcome = Column(Text)
    
    # Mapping metadata
    confidence_score = Column(Numeric(3, 2))  # AI confidence in mapping (0.0-1.0)
    mapping_method = Column(String(50))  # 'auto', 'manual', 'suggested'
    mapping_notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    catalog = relationship("MetricCatalog", back_populates="csf_mappings")
    catalog_item = relationship("MetricCatalogItem", back_populates="csf_mappings")
    
    def __repr__(self) -> str:
        return f"<MetricCatalogCSFMapping(catalog_item_id={self.catalog_item_id}, csf_function={self.csf_function.value})>"


class User(Base):
    """User table (placeholder for future auth)."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    role = Column(String(50))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}')>"


# Create composite indices for better query performance
Index("idx_metrics_function_priority", Metric.csf_function, Metric.priority_rank)
Index("idx_metrics_active_function", Metric.active, Metric.csf_function)
Index("idx_metrics_csf_category", Metric.csf_category_code, Metric.csf_subcategory_code)
Index("idx_history_metric_collected", MetricHistory.metric_id, MetricHistory.collected_at.desc())
Index("idx_ai_changes_applied", AIChangeLog.applied, AIChangeLog.created_at.desc())

# Catalog indices
Index("idx_catalog_active_owner", MetricCatalog.active, MetricCatalog.owner)
Index("idx_catalog_items_catalog_id", MetricCatalogItem.catalog_id, MetricCatalogItem.name)
Index("idx_catalog_mappings_catalog_function", MetricCatalogCSFMapping.catalog_id, MetricCatalogCSFMapping.csf_function)