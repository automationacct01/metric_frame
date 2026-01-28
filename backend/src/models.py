"""SQLAlchemy ORM models for multi-framework cybersecurity metrics application.

Supports NIST CSF 2.0 (with integrated Cyber AI Profile) and NIST AI RMF 1.0.
"""

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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base


# ==============================================================================
# ENUMS
# ==============================================================================

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


class MappingType(enum.Enum):
    """Type of cross-framework mapping."""
    DIRECT = "direct"
    PARTIAL = "partial"
    RELATED = "related"


class MappingMethod(enum.Enum):
    """How a mapping was created."""
    AUTO = "auto"
    MANUAL = "manual"
    SUGGESTED = "suggested"


class CSFFunction(enum.Enum):
    """NIST CSF 2.0 Core Functions."""
    GOVERN = "gv"
    IDENTIFY = "id"
    PROTECT = "pr"
    DETECT = "de"
    RESPOND = "rs"
    RECOVER = "rc"


class UserRole(enum.Enum):
    """User roles for access control."""
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"


# ==============================================================================
# FRAMEWORK HIERARCHY TABLES
# ==============================================================================

class Framework(Base):
    """Framework definition table.

    Supports multiple frameworks like NIST CSF 2.0, AI RMF, Cyber AI Profile.
    """

    __tablename__ = "frameworks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(30), unique=True, nullable=False, index=True)  # 'csf_2_0', 'ai_rmf', 'cyber_ai_profile'
    name = Column(String(255), nullable=False)
    version = Column(String(20))
    description = Column(Text)
    source_url = Column(String(500))  # Link to official documentation
    active = Column(Boolean, default=True, index=True)
    is_extension = Column(Boolean, default=False)  # True for Cyber AI Profile (extends CSF 2.0)
    parent_framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    functions = relationship("FrameworkFunction", back_populates="framework", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="framework")
    catalogs = relationship("MetricCatalog", back_populates="framework")
    source_mappings = relationship(
        "FrameworkCrossMapping",
        foreign_keys="FrameworkCrossMapping.source_framework_id",
        back_populates="source_framework"
    )
    target_mappings = relationship(
        "FrameworkCrossMapping",
        foreign_keys="FrameworkCrossMapping.target_framework_id",
        back_populates="target_framework"
    )
    parent_framework = relationship("Framework", remote_side=[id])

    def __repr__(self) -> str:
        return f"<Framework(code='{self.code}', name='{self.name}', version='{self.version}')>"


class FrameworkFunction(Base):
    """Framework functions/focus areas.

    Examples:
    - CSF 2.0: Govern (GV), Identify (ID), Protect (PR), etc.
    - AI RMF: Govern, Map, Measure, Manage
    - Cyber AI Profile: Secure, Defend, Thwart
    """

    __tablename__ = "framework_functions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False)
    code = Column(String(20), nullable=False, index=True)  # 'gv', 'govern', 'secure'
    name = Column(String(120), nullable=False)
    description = Column(Text)
    display_order = Column(Integer, default=0)
    color_hex = Column(String(7))  # '#4A90D9'
    icon_name = Column(String(50))  # For frontend icon reference

    __table_args__ = (
        UniqueConstraint('framework_id', 'code', name='uq_framework_function_code'),
    )

    # Relationships
    framework = relationship("Framework", back_populates="functions")
    categories = relationship("FrameworkCategory", back_populates="function", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="function")

    def __repr__(self) -> str:
        return f"<FrameworkFunction(code='{self.code}', name='{self.name}')>"


class FrameworkCategory(Base):
    """Framework categories within functions.

    Examples:
    - CSF 2.0: GV.OC (Organizational Context), ID.AM (Asset Management)
    - AI RMF: GOVERN-1 (Policies and Procedures)
    """

    __tablename__ = "framework_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    function_id = Column(UUID(as_uuid=True), ForeignKey("framework_functions.id"), nullable=False)
    code = Column(String(30), nullable=False, index=True)  # 'GV.OC', 'GOVERN-1'
    name = Column(String(200), nullable=False)
    description = Column(Text)
    display_order = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint('function_id', 'code', name='uq_category_function_code'),
    )

    # Relationships
    function = relationship("FrameworkFunction", back_populates="categories")
    subcategories = relationship("FrameworkSubcategory", back_populates="category", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="category")

    def __repr__(self) -> str:
        return f"<FrameworkCategory(code='{self.code}', name='{self.name}')>"


class FrameworkSubcategory(Base):
    """Framework subcategories/outcomes.

    The most granular level of framework hierarchy.
    Examples:
    - CSF 2.0: GV.OC-01, GV.OC-02
    - AI RMF: GOVERN-1.1, GOVERN-1.2
    """

    __tablename__ = "framework_subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("framework_categories.id"), nullable=False)
    code = Column(String(40), nullable=False, index=True)  # 'GV.OC-01', 'GOVERN-1.1'
    outcome = Column(Text, nullable=False)  # The full outcome/subcategory text
    display_order = Column(Integer, default=0)

    # AI Profile specific fields (nullable for non-AI profile subcategories)
    ai_profile_focus = Column(String(50))  # 'secure', 'defend', 'thwart'
    trustworthiness_characteristic = Column(String(100))  # AI RMF: 'valid_reliable', 'safe', 'secure_resilient', etc.

    __table_args__ = (
        UniqueConstraint('category_id', 'code', name='uq_subcategory_category_code'),
    )

    # Relationships
    category = relationship("FrameworkCategory", back_populates="subcategories")
    metrics = relationship("Metric", back_populates="subcategory")
    source_mappings = relationship(
        "FrameworkCrossMapping",
        foreign_keys="FrameworkCrossMapping.source_subcategory_id",
        back_populates="source_subcategory"
    )
    target_mappings = relationship(
        "FrameworkCrossMapping",
        foreign_keys="FrameworkCrossMapping.target_subcategory_id",
        back_populates="target_subcategory"
    )

    def __repr__(self) -> str:
        return f"<FrameworkSubcategory(code='{self.code}')>"


class FrameworkCrossMapping(Base):
    """Cross-framework mappings.

    Maps subcategories between frameworks, e.g., Cyber AI Profile to CSF 2.0,
    or future mappings like CSF 2.0 to ISO 27001.
    """

    __tablename__ = "framework_cross_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False)
    target_framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False)
    source_subcategory_id = Column(UUID(as_uuid=True), ForeignKey("framework_subcategories.id"), nullable=False)
    target_subcategory_id = Column(UUID(as_uuid=True), ForeignKey("framework_subcategories.id"), nullable=False)
    mapping_type = Column(Enum(MappingType), default=MappingType.DIRECT)
    confidence = Column(Numeric(3, 2))  # 0.00 - 1.00
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    source_framework = relationship("Framework", foreign_keys=[source_framework_id], back_populates="source_mappings")
    target_framework = relationship("Framework", foreign_keys=[target_framework_id], back_populates="target_mappings")
    source_subcategory = relationship("FrameworkSubcategory", foreign_keys=[source_subcategory_id], back_populates="source_mappings")
    target_subcategory = relationship("FrameworkSubcategory", foreign_keys=[target_subcategory_id], back_populates="target_mappings")

    def __repr__(self) -> str:
        return f"<FrameworkCrossMapping(source={self.source_subcategory_id}, target={self.target_subcategory_id})>"


# ==============================================================================
# METRICS TABLES
# ==============================================================================

class Metric(Base):
    """Core metrics table with multi-framework support.

    Metrics are linked to the framework hierarchy through foreign keys.
    """

    __tablename__ = "metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_number = Column(String(20), index=True)  # User-friendly metric ID
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    formula = Column(Text)
    calc_expr_json = Column(JSON)

    # Framework linkage (new multi-framework support)
    framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False, index=True)
    function_id = Column(UUID(as_uuid=True), ForeignKey("framework_functions.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("framework_categories.id"), nullable=True, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("framework_subcategories.id"), nullable=True, index=True)

    # AI-specific fields (for AI RMF and Cyber AI Profile metrics)
    trustworthiness_characteristic = Column(String(100))  # AI RMF specific
    ai_profile_focus = Column(String(50))  # Cyber AI Profile: 'secure', 'defend', 'thwart'

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
    risk_definition = Column(Text)  # Why this metric matters - business risk context
    active = Column(Boolean, default=True, index=True)
    locked = Column(Boolean, default=True, index=True)  # Locked metrics cannot be edited
    locked_by = Column(String(100))  # Who locked/unlocked the metric
    locked_at = Column(DateTime(timezone=True))  # When it was locked/unlocked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('framework_id', 'metric_number', name='uq_framework_metric_number'),
    )

    # Relationships
    framework = relationship("Framework", back_populates="metrics")
    function = relationship("FrameworkFunction", back_populates="metrics")
    category = relationship("FrameworkCategory", back_populates="metrics")
    subcategory = relationship("FrameworkSubcategory", back_populates="metrics")
    history = relationship("MetricHistory", back_populates="metric", cascade="all, delete-orphan")
    ai_changes = relationship("AIChangeLog", back_populates="metric")
    versions = relationship("MetricVersion", back_populates="metric", cascade="all, delete-orphan")

    @property
    def csf_function(self):
        """Backward compatibility property - returns CSFFunction enum if applicable."""
        if self.function:
            try:
                return CSFFunction(self.function.code)
            except ValueError:
                return None
        return None

    @property
    def csf_category_code(self):
        """Backward compatibility property - returns category code."""
        return self.category.code if self.category else None

    @property
    def csf_subcategory_code(self):
        """Backward compatibility property - returns subcategory code."""
        return self.subcategory.code if self.subcategory else None

    @property
    def csf_category_name(self):
        """Backward compatibility property - returns category name."""
        return self.category.name if self.category else None

    @property
    def csf_subcategory_outcome(self):
        """Backward compatibility property - returns subcategory outcome."""
        return self.subcategory.outcome if self.subcategory else None

    # =========================================================================
    # AI RMF Properties - for NIST AI RMF 1.0 framework metrics
    # =========================================================================

    @property
    def ai_rmf_function(self):
        """Returns AI RMF function code if this metric belongs to AI RMF framework."""
        if self.function and self.framework and self.framework.code == "ai_rmf":
            return self.function.code
        return None

    @property
    def ai_rmf_function_name(self):
        """Returns AI RMF function name if this metric belongs to AI RMF framework."""
        if self.function and self.framework and self.framework.code == "ai_rmf":
            return self.function.name
        return None

    @property
    def ai_rmf_category_code(self):
        """Returns AI RMF category code if this metric belongs to AI RMF framework."""
        if self.category and self.framework and self.framework.code == "ai_rmf":
            return self.category.code
        return None

    @property
    def ai_rmf_category_name(self):
        """Returns AI RMF category name if this metric belongs to AI RMF framework."""
        if self.category and self.framework and self.framework.code == "ai_rmf":
            return self.category.name
        return None

    @property
    def ai_rmf_subcategory_code(self):
        """Returns AI RMF subcategory code if this metric belongs to AI RMF framework."""
        if self.subcategory and self.framework and self.framework.code == "ai_rmf":
            return self.subcategory.code
        return None

    @property
    def ai_rmf_subcategory_outcome(self):
        """Returns AI RMF subcategory outcome if this metric belongs to AI RMF framework."""
        if self.subcategory and self.framework and self.framework.code == "ai_rmf":
            return self.subcategory.outcome
        return None

    def __repr__(self) -> str:
        return f"<Metric(id={self.id}, name='{self.name}', framework_id={self.framework_id})>"


class MetricHistory(Base):
    """Time series data for metrics."""

    __tablename__ = "metric_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), nullable=False, index=True)
    collected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    raw_value_json = Column(JSON)
    normalized_value = Column(Numeric(10, 4))
    source_ref = Column(String(200))
    period_label = Column(String(50))  # e.g., 'Q1 2024', 'Jan 2024'

    # Relationships
    metric = relationship("Metric", back_populates="history")

    def __repr__(self) -> str:
        return f"<MetricHistory(metric_id={self.metric_id}, collected_at={self.collected_at})>"


class MetricVersion(Base):
    """Full state snapshots of metrics on every update.

    Captures the complete metric state before changes are applied,
    enabling version comparison, audit trails, and rollback support.
    """

    __tablename__ = "metric_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    snapshot_json = Column(JSON, nullable=False)
    changed_fields = Column(JSON)  # List of field names that changed
    changed_by = Column(String(255))
    change_source = Column(String(50))  # 'api', 'ai', 'import', 'system'
    change_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('metric_id', 'version_number', name='uq_metric_version_number'),
    )

    # Relationships
    metric = relationship("Metric", back_populates="versions")

    def __repr__(self) -> str:
        return f"<MetricVersion(metric_id={self.metric_id}, version={self.version_number})>"


# ==============================================================================
# AI CHANGE LOG
# ==============================================================================

class AIChangeLog(Base):
    """Audit log for AI-driven changes.

    Tracks all AI operations including metric creation, recommendations, and mappings.
    """

    __tablename__ = "ai_change_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), nullable=True)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"), nullable=True)
    operation_type = Column(String(50), nullable=False, index=True)  # 'create', 'recommend', 'map', 'enhance'
    user_prompt = Column(Text, nullable=False)
    ai_response_json = Column(JSON, nullable=False)
    model_used = Column(String(100))  # 'claude-sonnet-4-5-20250929'
    applied = Column(Boolean, default=False, index=True)
    applied_by = Column(String(100))
    applied_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    metric = relationship("Metric", back_populates="ai_changes")
    catalog = relationship("MetricCatalog", back_populates="ai_changes")

    def __repr__(self) -> str:
        return f"<AIChangeLog(id={self.id}, operation_type='{self.operation_type}', applied={self.applied})>"


# ==============================================================================
# CATALOG TABLES
# ==============================================================================

class MetricCatalog(Base):
    """Metric catalogs for multi-tenant and framework support."""

    __tablename__ = "metric_catalogs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False, index=True)
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
    framework = relationship("Framework", back_populates="catalogs")
    catalog_items = relationship("MetricCatalogItem", back_populates="catalog", cascade="all, delete-orphan")
    framework_mappings = relationship("MetricCatalogFrameworkMapping", back_populates="catalog", cascade="all, delete-orphan")
    ai_changes = relationship("AIChangeLog", back_populates="catalog")

    def __repr__(self) -> str:
        return f"<MetricCatalog(id={self.id}, name='{self.name}', framework_id={self.framework_id})>"


class MetricCatalogItem(Base):
    """Items within a metric catalog."""

    __tablename__ = "metric_catalog_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"), nullable=False, index=True)
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
    framework_mappings = relationship("MetricCatalogFrameworkMapping", back_populates="catalog_item", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<MetricCatalogItem(id={self.id}, name='{self.name}', catalog_id={self.catalog_id})>"


class MetricCatalogFrameworkMapping(Base):
    """Framework mappings for catalog items.

    Maps imported catalog items to framework subcategories.
    Replaces the old CSF-specific mapping table with a generic one.
    """

    __tablename__ = "metric_catalog_framework_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    catalog_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalogs.id"), nullable=False, index=True)
    catalog_item_id = Column(UUID(as_uuid=True), ForeignKey("metric_catalog_items.id"), nullable=False, index=True)

    # Framework mapping (generic, not CSF-specific)
    function_id = Column(UUID(as_uuid=True), ForeignKey("framework_functions.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("framework_categories.id"), nullable=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("framework_subcategories.id"), nullable=True)

    # Mapping metadata
    confidence_score = Column(Numeric(3, 2))  # AI confidence in mapping (0.0-1.0)
    mapping_method = Column(Enum(MappingMethod), default=MappingMethod.AUTO)
    mapping_notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    catalog = relationship("MetricCatalog", back_populates="framework_mappings")
    catalog_item = relationship("MetricCatalogItem", back_populates="framework_mappings")
    function = relationship("FrameworkFunction")
    category = relationship("FrameworkCategory")
    subcategory = relationship("FrameworkSubcategory")

    def __repr__(self) -> str:
        return f"<MetricCatalogFrameworkMapping(catalog_item_id={self.catalog_item_id}, function_id={self.function_id})>"


# ==============================================================================
# AI PROVIDER TABLES
# ==============================================================================

class AIProvider(Base):
    """AI provider definitions (Anthropic, OpenAI, Together, Azure, Bedrock, Vertex)."""

    __tablename__ = "ai_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(30), unique=True, nullable=False, index=True)  # 'anthropic', 'openai', etc.
    name = Column(String(100), nullable=False)
    description = Column(Text)
    auth_type = Column(String(50), nullable=False)  # 'api_key', 'azure', 'aws_iam', 'gcp'
    auth_fields = Column(JSON)  # Required fields for this provider
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    models = relationship("AIModel", back_populates="provider", cascade="all, delete-orphan")
    configurations = relationship("UserAIConfiguration", back_populates="provider", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<AIProvider(code='{self.code}', name='{self.name}')>"


class AIModel(Base):
    """Available AI models per provider."""

    __tablename__ = "ai_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("ai_providers.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id = Column(String(100), nullable=False)  # 'claude-sonnet-4-5-20250929', 'gpt-4o'
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    context_window = Column(Integer)
    max_output_tokens = Column(Integer)
    supports_vision = Column(Boolean, default=False)
    supports_function_calling = Column(Boolean, default=True)
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('provider_id', 'model_id', name='uq_ai_models_provider_model'),
    )

    # Relationships
    provider = relationship("AIProvider", back_populates="models")

    def __repr__(self) -> str:
        return f"<AIModel(model_id='{self.model_id}', provider_id={self.provider_id})>"


class UserAIConfiguration(Base):
    """User's AI provider configurations with encrypted credentials."""

    __tablename__ = "user_ai_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("ai_providers.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=False)
    model_id = Column(String(100))  # Preferred model for this provider

    # Encrypted credentials (Fernet symmetric encryption)
    encrypted_credentials = Column(Text)  # JSON blob, encrypted

    # Settings
    max_tokens = Column(Integer, default=4096)
    temperature = Column(Numeric(3, 2), default=0.70)

    # Validation state
    credentials_validated = Column(Boolean, default=False)
    last_validated_at = Column(DateTime(timezone=True))
    validation_error = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'provider_id', name='uq_user_ai_config_user_provider'),
    )

    # Relationships
    user = relationship("User", back_populates="ai_configurations", foreign_keys=[user_id])
    provider = relationship("AIProvider", back_populates="configurations")

    def __repr__(self) -> str:
        return f"<UserAIConfiguration(user_id={self.user_id}, provider_id={self.provider_id}, is_active={self.is_active})>"


# ==============================================================================
# USER TABLE
# ==============================================================================

class User(Base):
    """User table with framework preferences."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True)
    role = Column(String(50), default="viewer")
    active = Column(Boolean, default=True)

    # Framework preferences
    selected_framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=True)
    onboarding_completed = Column(Boolean, default=False)

    # AI provider preferences
    active_ai_config_id = Column(UUID(as_uuid=True), ForeignKey("user_ai_configurations.id", ondelete="SET NULL", use_alter=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    selected_framework = relationship("Framework")
    ai_configurations = relationship("UserAIConfiguration", back_populates="user", foreign_keys=[UserAIConfiguration.user_id])
    active_ai_config = relationship("UserAIConfiguration", foreign_keys=[active_ai_config_id], post_update=True)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}')>"


# ==============================================================================
# SCORING TABLES (for caching calculated scores)
# ==============================================================================

class FrameworkScore(Base):
    """Cached scores at the framework level."""

    __tablename__ = "framework_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    framework_id = Column(UUID(as_uuid=True), ForeignKey("frameworks.id"), nullable=False, index=True)
    calculated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    overall_score = Column(Numeric(5, 2))  # 0.00 - 100.00
    risk_level = Column(String(20))  # 'low', 'moderate', 'elevated', 'high', 'critical'
    metrics_count = Column(Integer)
    metrics_with_data_count = Column(Integer)
    score_details_json = Column(JSON)  # Detailed breakdown by function

    # Relationships
    framework = relationship("Framework")

    def __repr__(self) -> str:
        return f"<FrameworkScore(framework_id={self.framework_id}, overall_score={self.overall_score})>"


class FunctionScore(Base):
    """Cached scores at the function level."""

    __tablename__ = "function_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    function_id = Column(UUID(as_uuid=True), ForeignKey("framework_functions.id"), nullable=False, index=True)
    calculated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    score = Column(Numeric(5, 2))  # 0.00 - 100.00
    risk_level = Column(String(20))
    metrics_count = Column(Integer)
    metrics_with_data_count = Column(Integer)
    category_scores_json = Column(JSON)  # Detailed breakdown by category

    # Relationships
    function = relationship("FrameworkFunction")

    def __repr__(self) -> str:
        return f"<FunctionScore(function_id={self.function_id}, score={self.score})>"


# ==============================================================================
# DEMO MODE TABLES
# ==============================================================================

class DemoUser(Base):
    """Demo user session tracking with email capture and AI quotas.

    Tracks prospective users exploring the demo environment with:
    - Required email capture for lead generation
    - 24-hour demo window
    - AI metric creation quotas (2 per framework)
    """

    __tablename__ = "demo_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    video_skipped = Column(Boolean, default=False)
    demo_started_at = Column(DateTime(timezone=True), nullable=True)
    demo_expires_at = Column(DateTime(timezone=True), nullable=True)
    expired = Column(Boolean, default=False)
    ai_metrics_created_csf = Column(Integer, default=0)
    ai_metrics_created_ai_rmf = Column(Integer, default=0)
    # AI Chat guided wizard tracking
    ai_chat_interactions = Column(Integer, default=0)  # Total guided chat interactions
    ai_chat_locked = Column(Boolean, default=False)  # Lock after abuse detection
    invalid_request_count = Column(Integer, default=0)  # Track invalid/suspicious requests
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    demo_metrics = relationship("DemoMetric", back_populates="demo_user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<DemoUser(id={self.id}, email='{self.email}', session_id='{self.session_id}')>"

    @property
    def is_expired(self) -> bool:
        """Check if demo has expired."""
        if self.expired:
            return True
        if self.demo_expires_at:
            return datetime.now(self.demo_expires_at.tzinfo) > self.demo_expires_at
        return False

    @property
    def can_create_csf_metric(self) -> bool:
        """Check if user can create more CSF 2.0 metrics."""
        return self.ai_metrics_created_csf < 2

    @property
    def can_create_ai_rmf_metric(self) -> bool:
        """Check if user can create more AI RMF metrics."""
        return self.ai_metrics_created_ai_rmf < 2

    @property
    def can_use_ai_chat(self) -> bool:
        """Check if user can still use the guided AI chat wizard."""
        # 6 total interactions: 3 per framework (starter + optional refinement + create)
        MAX_DEMO_CHAT_INTERACTIONS = 6
        return (
            not self.ai_chat_locked
            and self.ai_chat_interactions < MAX_DEMO_CHAT_INTERACTIONS
        )

    @property
    def ai_chat_interactions_remaining(self) -> int:
        """Return remaining AI chat interactions."""
        MAX_DEMO_CHAT_INTERACTIONS = 6
        return max(0, MAX_DEMO_CHAT_INTERACTIONS - self.ai_chat_interactions)


class DemoMetric(Base):
    """Temporary metrics created during demo mode.

    Stores metrics created by demo users via AI. These are automatically
    deleted when the demo session expires (CASCADE on demo_user deletion).
    """

    __tablename__ = "demo_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    demo_user_id = Column(UUID(as_uuid=True), ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False)
    metric_data = Column(JSON, nullable=False)  # Full metric object as JSONB
    framework = Column(String(20), nullable=False)  # 'csf_2_0' or 'ai_rmf'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    demo_user = relationship("DemoUser", back_populates="demo_metrics")

    def __repr__(self) -> str:
        return f"<DemoMetric(id={self.id}, framework='{self.framework}', demo_user_id={self.demo_user_id})>"


# ==============================================================================
# SUBSCRIPTION / PAYMENT TABLES
# ==============================================================================

class SubscriptionStatus(enum.Enum):
    """Stripe subscription statuses."""
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    TRIALING = "trialing"


class Subscription(Base):
    """Stripe subscription records.

    Tracks customer subscriptions created via Stripe Checkout.
    No user FK required - identity is managed by Stripe via customer email.
    """

    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stripe_customer_id = Column(String(255), nullable=False, index=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=False, index=True)
    stripe_checkout_session_id = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=False, index=True)
    plan_name = Column(String(50), nullable=False)  # 'standard' or 'professional'
    status = Column(Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.INCOMPLETE)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, email='{self.customer_email}', plan='{self.plan_name}', status='{self.status.value}')>"


# ==============================================================================
# INDICES
# ==============================================================================

# Framework indices
Index("idx_framework_active", Framework.active)
Index("idx_framework_code", Framework.code)

# Function indices
Index("idx_function_framework_order", FrameworkFunction.framework_id, FrameworkFunction.display_order)

# Category indices
Index("idx_category_function_order", FrameworkCategory.function_id, FrameworkCategory.display_order)

# Subcategory indices
Index("idx_subcategory_category_order", FrameworkSubcategory.category_id, FrameworkSubcategory.display_order)
Index("idx_subcategory_ai_profile", FrameworkSubcategory.ai_profile_focus)
Index("idx_subcategory_trustworthiness", FrameworkSubcategory.trustworthiness_characteristic)

# Metric indices
Index("idx_metrics_framework_function", Metric.framework_id, Metric.function_id)
Index("idx_metrics_framework_priority", Metric.framework_id, Metric.priority_rank)
Index("idx_metrics_active_framework", Metric.active, Metric.framework_id)
Index("idx_metrics_category", Metric.category_id, Metric.subcategory_id)
Index("idx_metrics_ai_profile", Metric.ai_profile_focus)

# History indices
Index("idx_history_metric_collected", MetricHistory.metric_id, MetricHistory.collected_at.desc())

# Version indices
Index("idx_version_metric_id", MetricVersion.metric_id)
Index("idx_version_metric_created", MetricVersion.metric_id, MetricVersion.created_at.desc())

# AI change log indices
Index("idx_ai_changes_applied", AIChangeLog.applied, AIChangeLog.created_at.desc())
Index("idx_ai_changes_operation", AIChangeLog.operation_type, AIChangeLog.created_at.desc())

# Catalog indices
Index("idx_catalog_framework_active", MetricCatalog.framework_id, MetricCatalog.active)
Index("idx_catalog_active_owner", MetricCatalog.active, MetricCatalog.owner)
Index("idx_catalog_items_catalog_id", MetricCatalogItem.catalog_id, MetricCatalogItem.name)
Index("idx_catalog_mappings_function", MetricCatalogFrameworkMapping.catalog_id, MetricCatalogFrameworkMapping.function_id)

# Score indices
Index("idx_framework_score_latest", FrameworkScore.framework_id, FrameworkScore.calculated_at.desc())
Index("idx_function_score_latest", FunctionScore.function_id, FunctionScore.calculated_at.desc())

# AI Provider indices
Index("idx_ai_providers_code", AIProvider.code)
Index("idx_ai_providers_active", AIProvider.active)
Index("idx_ai_models_provider", AIModel.provider_id)
Index("idx_ai_models_active", AIModel.active)
Index("idx_user_ai_config_user", UserAIConfiguration.user_id)
Index("idx_user_ai_config_active", UserAIConfiguration.user_id, UserAIConfiguration.is_active)

# Demo indices
Index("idx_demo_users_session", DemoUser.session_id)
Index("idx_demo_users_email", DemoUser.email)
Index("idx_demo_users_expires", DemoUser.demo_expires_at)
Index("idx_demo_users_expired", DemoUser.expired)
Index("idx_demo_metrics_user", DemoMetric.demo_user_id)
Index("idx_demo_metrics_framework", DemoMetric.framework)

# Subscription indices
Index("idx_subscriptions_email_status", Subscription.customer_email, Subscription.status)
Index("idx_subscriptions_customer_stripe", Subscription.stripe_customer_id)

# Alias for backward compatibility
MetricCatalogCSFMapping = MetricCatalogFrameworkMapping
