/**
 * Feature Card Component
 *
 * Individual feature card with screenshot/GIF or styled placeholder.
 */

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';

// Mock placeholder components for each feature type
const DashboardPlaceholder = () => {
  const scoreCards = [
    { name: 'GV', score: 87, color: '#22c55e' },
    { name: 'ID', score: 92, color: '#22c55e' },
    { name: 'PR', score: 68, color: '#f59e0b' },
    { name: 'DE', score: 85, color: '#22c55e' },
    { name: 'RS', score: 45, color: '#ef4444' },
    { name: 'RC', score: 78, color: '#22c55e' },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ width: 60, height: 8, backgroundColor: '#cbd5e1', borderRadius: 0.5 }} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 36, height: 14, backgroundColor: '#e2e8f0', borderRadius: 0.5 }} />
          <Box sx={{ width: 36, height: 14, backgroundColor: '#0ea5e9', borderRadius: 0.5 }} />
        </Box>
      </Box>
      {/* Score Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, flex: 1 }}>
        {scoreCards.map((item) => (
          <Box
            key={item.name}
            sx={{
              backgroundColor: '#fff',
              borderRadius: 1,
              p: 1,
              borderLeft: `3px solid ${item.color}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: 8, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
              {item.name}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
              {item.score}%
            </Typography>
            <Box sx={{ mt: 0.75, height: 3, backgroundColor: '#f1f5f9', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ width: `${item.score}%`, height: '100%', backgroundColor: item.color, borderRadius: 1 }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const CoverageMapPlaceholder = () => {
  const treeData = [
    {
      code: 'GOVERN',
      expanded: true,
      children: [
        { code: 'GV.OC', name: 'Organizational Context', covered: true },
        { code: 'GV.RM', name: 'Risk Management', covered: true },
        { code: 'GV.SC', name: 'Supply Chain', covered: false },
      ],
    },
    {
      code: 'IDENTIFY',
      expanded: true,
      children: [
        { code: 'ID.AM', name: 'Asset Management', covered: true },
        { code: 'ID.RA', name: 'Risk Assessment', covered: true },
        { code: 'ID.IM', name: 'Improvement', covered: false },
      ],
    },
    {
      code: 'PROTECT',
      expanded: false,
      children: [],
    },
    {
      code: 'DETECT',
      expanded: false,
      children: [],
    },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      {/* Tree structure */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {treeData.map((func) => (
          <Box key={func.code}>
            {/* Function row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, px: 0.5, backgroundColor: '#f1f5f9', borderRadius: 0.5 }}>
              <Typography sx={{ fontSize: 8, color: '#64748b' }}>{func.expanded ? '▼' : '▶'}</Typography>
              <Typography sx={{ fontSize: 7, color: '#334155', fontWeight: 600 }}>{func.code}</Typography>
            </Box>
            {/* Children */}
            {func.expanded && func.children.map((cat) => (
              <Box key={cat.code} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, pl: 2, pr: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: cat.covered ? '#22c55e' : '#ef4444',
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: 6, color: '#64748b', fontWeight: 500 }}>{cat.code}</Typography>
                <Typography sx={{ fontSize: 5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, pt: 0.5, borderTop: '1px solid #e5e7eb', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <Typography sx={{ fontSize: 5, color: '#64748b' }}>Covered</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <Typography sx={{ fontSize: 5, color: '#64748b' }}>Gap</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const MetricsGridPlaceholder = () => {
  const rows = [
    { metric: 'MFA Adoption Rate', target: '95%', current: '87%', score: '92%', color: '#dcfce7' },
    { metric: 'Patch Compliance', target: '98%', current: '72%', score: '73%', color: '#fef9c3' },
    { metric: 'Incident Response', target: '4hr', current: '2.5hr', score: '100%', color: '#dcfce7' },
    { metric: 'Vuln Scan Coverage', target: '100%', current: '94%', score: '94%', color: '#dcfce7' },
    { metric: 'Backup Success', target: '99%', current: '85%', score: '86%', color: '#fef9c3' },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column' }}>
      {/* Header row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0.5, mb: 0.5 }}>
        {['Metric', 'Target', 'Current', 'Score'].map((h, i) => (
          <Box key={i} sx={{ backgroundColor: '#e2e8f0', height: 14, borderRadius: 0.5, display: 'flex', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: 7, color: '#64748b', fontWeight: 600 }}>{h}</Typography>
          </Box>
        ))}
      </Box>
      {/* Data rows */}
      {rows.map((row, idx) => (
        <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0.5, mb: 0.5 }}>
          <Box sx={{ backgroundColor: '#fff', height: 16, borderRadius: 0.5, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: 6, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden' }}>{row.metric}</Typography>
          </Box>
          <Box sx={{ backgroundColor: '#fff', height: 16, borderRadius: 0.5, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: 6, color: '#64748b' }}>{row.target}</Typography>
          </Box>
          <Box sx={{ backgroundColor: '#fff', height: 16, borderRadius: 0.5, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: 6, color: '#334155' }}>{row.current}</Typography>
          </Box>
          <Box sx={{ backgroundColor: row.color, height: 16, borderRadius: 0.5, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: 6, color: '#166534', fontWeight: 600 }}>{row.score}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const AIChatPlaceholder = () => (
  <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
    {/* Chat messages */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ alignSelf: 'flex-end', backgroundColor: '#0ea5e9', borderRadius: 1.5, px: 1.5, py: 0.75, maxWidth: '75%' }}>
        <Typography sx={{ fontSize: 8, color: '#fff' }}>Create a metric for MFA adoption</Typography>
      </Box>
      <Box sx={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 1.5, px: 1.5, py: 0.75, maxWidth: '85%', border: '1px solid #e5e7eb' }}>
        <Typography sx={{ fontSize: 8, color: '#334155' }}>I'll create an MFA adoption metric mapped to PR.AA...</Typography>
      </Box>
      <Box sx={{ alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 1, px: 1, py: 0.5, border: '1px solid #bbf7d0' }}>
        <Typography sx={{ fontSize: 7, color: '#166534' }}>✓ Metric created</Typography>
      </Box>
    </Box>
    {/* Input bar */}
    <Box sx={{ backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e5e7eb', px: 1, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 0.5 }} />
      <Box sx={{ width: 16, height: 16, backgroundColor: '#0ea5e9', borderRadius: 0.5 }} />
    </Box>
  </Box>
);

const CatalogWizardPlaceholder = () => {
  const steps = ['Upload', 'Map', 'Review', 'Import'];
  const currentStep = 2;

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Step indicators */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
        {steps.map((label, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: idx < currentStep ? '#0ea5e9' : idx === currentStep ? '#0ea5e9' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {idx < currentStep ? (
                  <Typography sx={{ fontSize: 8, color: '#fff' }}>✓</Typography>
                ) : (
                  <Typography sx={{ fontSize: 8, color: idx <= currentStep ? '#fff' : '#94a3b8', fontWeight: 600 }}>{idx + 1}</Typography>
                )}
              </Box>
              <Typography sx={{ fontSize: 5, color: idx <= currentStep ? '#0ea5e9' : '#94a3b8', mt: 0.25 }}>{label}</Typography>
            </Box>
            {idx < 3 && <Box sx={{ width: 16, height: 2, backgroundColor: idx < currentStep ? '#0ea5e9' : '#e2e8f0', mb: 1.5 }} />}
          </Box>
        ))}
      </Box>
      {/* Content area */}
      <Box sx={{ flex: 1, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e5e7eb', p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontSize: 8, color: '#334155', fontWeight: 600 }}>Map CSV Fields to Metrics</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 0.5, p: 0.5, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontSize: 5, color: '#64748b' }}>CSV Column</Typography>
            <Typography sx={{ fontSize: 6, color: '#334155' }}>metric_name</Typography>
          </Box>
          <Box sx={{ backgroundColor: '#eff6ff', borderRadius: 0.5, p: 0.5, border: '1px solid #bfdbfe' }}>
            <Typography sx={{ fontSize: 5, color: '#64748b' }}>Maps to</Typography>
            <Typography sx={{ fontSize: 6, color: '#1d4ed8' }}>Name</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 0.5, p: 0.5, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontSize: 5, color: '#64748b' }}>CSV Column</Typography>
            <Typography sx={{ fontSize: 6, color: '#334155' }}>target_value</Typography>
          </Box>
          <Box sx={{ backgroundColor: '#eff6ff', borderRadius: 0.5, p: 0.5, border: '1px solid #bfdbfe' }}>
            <Typography sx={{ fontSize: 5, color: '#64748b' }}>Maps to</Typography>
            <Typography sx={{ fontSize: 6, color: '#1d4ed8' }}>Target</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto', justifyContent: 'flex-end' }}>
          <Box sx={{ px: 1, py: 0.5, backgroundColor: '#e2e8f0', borderRadius: 0.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 6, color: '#64748b' }}>Back</Typography>
          </Box>
          <Box sx={{ px: 1, py: 0.5, backgroundColor: '#0ea5e9', borderRadius: 0.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 6, color: '#fff' }}>Next</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const InlineEditingPlaceholder = () => {
  const rows = [
    { metric: 'Patch compliance rate', current: '87%', target: '95%', editing: true },
    { metric: 'MFA enrollment', current: '92%', target: '100%', editing: false },
    { metric: 'Endpoint protection', current: '98%', target: '99%', editing: false },
    { metric: 'Security training', current: '76%', target: '90%', editing: false },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: 1.5, display: 'flex', flexDirection: 'column' }}>
      {/* Grid with edit state */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 0.5, mb: 0.5 }}>
        {['Metric Name', 'Current', 'Target'].map((h, i) => (
          <Box key={i} sx={{ backgroundColor: '#e2e8f0', height: 14, borderRadius: 0.5, px: 0.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 7, color: '#64748b', fontWeight: 600 }}>{h}</Typography>
          </Box>
        ))}
      </Box>
      {/* Data rows */}
      {rows.map((row, idx) => (
        <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 0.5, mb: 0.5 }}>
          <Box sx={{ backgroundColor: '#fff', height: 18, borderRadius: 0.5, border: '1px solid #e5e7eb', px: 0.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 6, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden' }}>{row.metric}</Typography>
          </Box>
          <Box sx={{
            backgroundColor: row.editing ? '#eff6ff' : '#fff',
            height: 18,
            borderRadius: 0.5,
            border: row.editing ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            px: 0.5,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Typography sx={{ fontSize: 6, color: row.editing ? '#1d4ed8' : '#334155' }}>{row.current}</Typography>
            {row.editing && <Box sx={{ ml: 'auto', width: 1.5, height: 10, backgroundColor: '#3b82f6', animation: 'blink 1s infinite' }} />}
          </Box>
          <Box sx={{ backgroundColor: '#fff', height: 18, borderRadius: 0.5, border: '1px solid #e5e7eb', px: 0.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 6, color: '#334155' }}>{row.target}</Typography>
          </Box>
        </Box>
      ))}
      {/* Lock indicator */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
        <Box sx={{ backgroundColor: '#dcfce7', borderRadius: 0.5, px: 0.75, py: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: 6, color: '#166534' }}>🔓 Editing enabled</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const placeholderComponents: Record<string, React.FC> = {
  dashboard: DashboardPlaceholder,
  'coverage-map': CoverageMapPlaceholder,
  'metrics-grid': MetricsGridPlaceholder,
  'ai-chat': AIChatPlaceholder,
  'catalog-wizard': CatalogWizardPlaceholder,
  'inline-editing': InlineEditingPlaceholder,
};

interface FeatureCardProps {
  title: string;
  description: string;
  image?: string;
  badge?: string;
  badgeColor?: string;
  imageAlt?: string;
  reversed?: boolean;
  placeholderType?: string;
}

export default function FeatureCard({
  title,
  description,
  image,
  badge,
  badgeColor = '#0ea5e9',
  imageAlt,
  reversed = false,
  placeholderType,
}: FeatureCardProps) {
  const PlaceholderComponent = placeholderType ? placeholderComponents[placeholderType] : null;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Screenshot Area */}
      <Box
        sx={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          aspectRatio: '16/10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {image ? (
          <Box
            component="img"
            src={image}
            alt={imageAlt || title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : PlaceholderComponent ? (
          // Styled placeholder
          <Box
            sx={{
              width: '90%',
              height: '85%',
              backgroundColor: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            <PlaceholderComponent />
          </Box>
        ) : (
          // Default placeholder
          <Box
            sx={{
              width: '90%',
              height: '85%',
              backgroundColor: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Screenshot Coming Soon
            </Typography>
          </Box>
        )}

        {/* Badge */}
        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: badgeColor,
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        )}
      </Box>

      {/* Content */}
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.7,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
