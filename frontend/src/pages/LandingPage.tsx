/**
 * Landing Page
 *
 * Marketing landing page for MetricFrame showcasing
 * cybersecurity metrics dashboard features.
 */

import React from 'react';
import { Box } from '@mui/material';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import SocialProofBar from '../components/landing/SocialProofBar';
import ProblemSection from '../components/landing/ProblemSection';
import SolutionSection from '../components/landing/SolutionSection';
import WhyNowSection from '../components/landing/WhyNowSection';
import FeatureShowcase from '../components/landing/FeatureShowcase';
import BYOMSection from '../components/landing/BYOMSection';
import HowItWorks from '../components/landing/HowItWorks';
import UseCasesSection from '../components/landing/UseCasesSection';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <LandingNavbar />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <SolutionSection />
      <WhyNowSection />
      <FeatureShowcase />
      <BYOMSection />
      <HowItWorks />
      <UseCasesSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </Box>
  );
}
