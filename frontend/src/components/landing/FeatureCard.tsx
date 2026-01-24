/**
 * Feature Card Component
 *
 * Individual feature card with screenshot/GIF.
 */

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';

interface FeatureCardProps {
  title: string;
  description: string;
  image?: string;
  badge?: string;
  badgeColor?: string;
  imageAlt?: string;
  reversed?: boolean;
}

export default function FeatureCard({
  title,
  description,
  image,
  badge,
  badgeColor = '#0ea5e9',
  imageAlt,
  reversed = false,
}: FeatureCardProps) {
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
        ) : (
          // Placeholder
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
