/**
 * Pricing Card Component
 *
 * Individual pricing tier card.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  comingSoon?: boolean;
  ctaText?: string;
  ctaAction?: () => void;
}

export default function PricingCard({
  name,
  price,
  period = '/month',
  description,
  features,
  highlighted = false,
  comingSoon = false,
  ctaText = 'Get Started',
  ctaAction,
}: PricingCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (ctaAction) {
      ctaAction();
    } else {
      navigate('/app');
    }
  };

  return (
    <Card
      elevation={comingSoon ? 0 : highlighted ? 8 : 0}
      sx={{
        height: '100%',
        border: comingSoon ? '1px solid #e5e7eb' : highlighted ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
        borderRadius: 3,
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.3s ease',
        opacity: comingSoon ? 0.5 : 1,
        '&:hover': comingSoon ? {} : {
          transform: 'translateY(-4px)',
          boxShadow: highlighted
            ? '0 25px 50px -12px rgba(14, 165, 233, 0.25)'
            : '0 10px 40px -15px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* Coming Soon Badge */}
      {comingSoon && (
        <Chip
          label="Coming Soon"
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#9ca3af',
            color: '#ffffff',
            fontWeight: 600,
          }}
        />
      )}

      {/* Popular Badge */}
      {highlighted && !comingSoon && (
        <Chip
          label="Most Popular"
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0ea5e9',
            color: '#ffffff',
            fontWeight: 600,
          }}
        />
      )}

      <CardContent sx={{ p: 4 }}>
        {/* Plan Name */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: highlighted ? '#0ea5e9' : 'text.primary',
            mb: 1,
          }}
        >
          {name}
        </Typography>

        {/* Price */}
        <Box sx={{ mb: 2 }}>
          <Typography
            component="span"
            sx={{
              fontSize: '3rem',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {price}
          </Typography>
          {period && price !== 'Custom' && (
            <Typography
              component="span"
              sx={{
                color: 'text.secondary',
                ml: 0.5,
              }}
            >
              {period}
            </Typography>
          )}
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 3,
            minHeight: 40,
          }}
        >
          {description}
        </Typography>

        {/* CTA Button */}
        <Button
          variant={highlighted ? 'contained' : 'outlined'}
          fullWidth
          size="large"
          disabled={comingSoon}
          onClick={handleClick}
          sx={{
            mb: 3,
            py: 1.5,
            ...(highlighted && !comingSoon && {
              backgroundColor: '#0ea5e9',
              '&:hover': {
                backgroundColor: '#0284c7',
              },
            }),
          }}
        >
          {comingSoon ? 'Coming Soon' : ctaText}
        </Button>

        {/* Features */}
        <List dense disablePadding>
          {features.map((feature) => (
            <ListItem key={feature} disablePadding sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon sx={{ color: '#059669', fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={feature}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
