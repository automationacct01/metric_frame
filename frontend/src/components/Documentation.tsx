import { useState } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Home as HomeIcon,
  RocketLaunch as StartIcon,
  Architecture as ArchitectureIcon,
  Dashboard as DashboardIcon,
  TableChart as MetricsIcon,
  SmartToy as AIIcon,
  ManageAccounts as UserManagementIcon,
  Calculate as ScoringIcon,
  AccountTree as FrameworkIcon,
  Api as ApiIcon,
  Storage as DatabaseIcon,
  Code as DevIcon,
  BugReport as TroubleshootIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  category?: string;
}

const docSections: DocSection[] = [
  { id: 'home', title: 'Home', icon: HomeIcon },
  { id: 'getting-started', title: 'Getting Started', icon: StartIcon, category: 'Getting Started' },
  { id: 'how-it-works', title: 'How It Works', icon: ArchitectureIcon, category: 'Getting Started' },
  { id: 'dashboard', title: 'Dashboard', icon: DashboardIcon, category: 'User Guide' },
  { id: 'metrics-management', title: 'Metrics Management', icon: MetricsIcon, category: 'User Guide' },
  { id: 'ai-assistant', title: 'AI Assistant', icon: AIIcon, category: 'User Guide' },
  { id: 'user-management', title: 'User Management', icon: UserManagementIcon, category: 'User Guide' },
  { id: 'scoring-methodology', title: 'Scoring Methodology', icon: ScoringIcon, category: 'Reference' },
  { id: 'frameworks-reference', title: 'Frameworks Reference', icon: FrameworkIcon, category: 'Reference' },
  { id: 'api-reference', title: 'API Reference', icon: ApiIcon, category: 'Reference' },
  { id: 'database-schema', title: 'Database Schema', icon: DatabaseIcon, category: 'Reference' },
  { id: 'development-guide', title: 'Development Guide', icon: DevIcon, category: 'Development' },
  { id: 'troubleshooting', title: 'Troubleshooting', icon: TroubleshootIcon, category: 'Development' },
];

const categories = ['Getting Started', 'User Guide', 'Reference', 'Development'];

export default function Documentation() {
  const [selectedDoc, setSelectedDoc] = useState('home');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(categories);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const renderContent = () => {
    switch (selectedDoc) {
      case 'home':
        return <HomeContent />;
      case 'getting-started':
        return <GettingStartedContent />;
      case 'how-it-works':
        return <HowItWorksContent />;
      case 'dashboard':
        return <DashboardContent />;
      case 'metrics-management':
        return <MetricsManagementContent />;
      case 'ai-assistant':
        return <AIAssistantContent />;
      case 'user-management':
        return <UserManagementContent />;
      case 'scoring-methodology':
        return <ScoringMethodologyContent />;
      case 'frameworks-reference':
        return <FrameworksReferenceContent />;
      case 'api-reference':
        return <APIReferenceContent />;
      case 'database-schema':
        return <DatabaseSchemaContent />;
      case 'development-guide':
        return <DevelopmentGuideContent />;
      case 'troubleshooting':
        return <TroubleshootingContent />;
      default:
        return <HomeContent />;
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, width: '100%', maxWidth: 1400 }}>
      {/* Sidebar Navigation */}
      <Paper sx={{ width: 280, flexShrink: 0, height: 'fit-content', position: 'sticky', top: 24 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            Documentation
          </Typography>
        </Box>
        <List dense>
          {/* Home */}
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedDoc === 'home'}
              onClick={() => setSelectedDoc('home')}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ my: 1 }} />

          {/* Categories */}
          {categories.map((category) => (
            <Box key={category}>
              <ListItemButton onClick={() => toggleCategory(category)}>
                <ListItemText
                  primary={category}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}
                />
                {expandedCategories.includes(category) ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={expandedCategories.includes(category)} timeout="auto">
                <List component="div" disablePadding dense>
                  {docSections
                    .filter((doc) => doc.category === category)
                    .map((doc) => (
                      <ListItem key={doc.id} disablePadding>
                        <ListItemButton
                          selected={selectedDoc === doc.id}
                          onClick={() => setSelectedDoc(doc.id)}
                          sx={{ pl: 3 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <doc.icon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={doc.title} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                </List>
              </Collapse>
            </Box>
          ))}
        </List>
      </Paper>

      {/* Content Area */}
      <Paper sx={{ flex: 1, p: 4, minHeight: 600 }}>
        {renderContent()}
      </Paper>
    </Box>
  );
}

// Shared styles
const tableStyles = {
  width: '100%',
  borderCollapse: 'collapse',
  '& td, & th': { p: 1.5, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'left' }
};
const codeBlockStyles = { bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' };
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mt: 4 }}>
    <Typography variant="h5" gutterBottom fontWeight={600}>{title}</Typography>
    {children}
  </Box>
);
const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom fontWeight={500}>{title}</Typography>
    {children}
  </Box>
);

// Content Components
function HomeContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>MetricFrame</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        A comprehensive web application for managing and visualizing cybersecurity Key Risk Indicators (KRIs)
        aligned with multiple security frameworks including NIST CSF 2.0, AI RMF, and the Cyber AI Profile.
        The application provides executive dashboards, AI-powered metrics management, and transparent risk scoring.
      </Typography>

      <Section title="Key Highlights">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Feature</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>356 Pre-Configured Metrics</strong></td><td>276 CSF 2.0 + 80 AI RMF metrics</td></tr>
            <tr><td><strong>Multi-Framework Support</strong></td><td>NIST CSF 2.0 and AI RMF 1.0 with unified dashboard</td></tr>
            <tr><td><strong>10 Framework Functions</strong></td><td>6 CSF (Govern-Recover) + 4 AI RMF (Govern-Manage)</td></tr>
            <tr><td><strong>7 AI Trustworthiness Types</strong></td><td>Track AI system trustworthiness characteristics</td></tr>
            <tr><td><strong>AI Integration</strong></td><td>Claude-powered metrics creation and analysis</td></tr>
            <tr><td><strong>Bring Your Own Catalog</strong></td><td>Import and manage custom metric catalogs</td></tr>
            <tr><td><strong>Gap-to-Target Scoring</strong></td><td>Transparent weighted risk calculations</td></tr>
            <tr><td><strong>Executive Dashboard</strong></td><td>Red/Amber/Green risk visualization</td></tr>
            <tr><td><strong>Column Tooltips</strong></td><td>Hover over any column header for field explanations</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="How It Works">
        <Box component="pre" sx={codeBlockStyles}>
{`┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│   React Frontend  │<--->│  FastAPI Backend  │<--->│   PostgreSQL DB   │
│   Material-UI     │     │  SQLAlchemy ORM   │     │   356 Metrics     │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
         │                        │
         │                        v
         │               ┌───────────────────┐
         │               │                   │
         └──────────────>│   AI Assistant    │
                         │   Claude Sonnet   │
                         └───────────────────┘`}
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Data Flow:</strong> Users interact with the React dashboard → API requests flow to FastAPI backend →
          Backend queries PostgreSQL for metrics data → Scoring engine calculates risk scores →
          AI assistant provides intelligent analysis → Results render in executive dashboard.
        </Typography>
      </Section>

      <Section title="Current Status">
        <Typography variant="body1" paragraph>The application is under active development with the following features implemented:</Typography>
        <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
          <li>Executive risk dashboard with color-coded risk scoring</li>
          <li>Complete metrics CRUD operations</li>
          <li>Multi-framework support (NIST CSF 2.0 and AI RMF 1.0)</li>
          <li>Multi-catalog support (BYOC)</li>
          <li>5-step catalog import wizard</li>
          <li>AI-powered metrics creation and enhancement</li>
          <li>Framework-specific scoring and views</li>
          <li>CSV import/export functionality</li>
          <li>Column tooltips for all metrics fields</li>
        </Box>
      </Section>

      <Section title="Dashboard Sections">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Section</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Score Cards</strong></td><td>Function-level risk scores with Red/Amber/Green coloring</td></tr>
            <tr><td><strong>CSF Coverage</strong></td><td>Visual coverage map across framework categories</td></tr>
            <tr><td><strong>Metrics Grid</strong></td><td>Filterable table of all KRIs</td></tr>
            <tr><td><strong>AI Chat</strong></td><td>Natural language metrics assistant</td></tr>
            <tr><td><strong>Catalog Manager</strong></td><td>Custom catalog administration</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Technology Stack">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Layer</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Technology</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Frontend</td><td>React 18, TypeScript, Material-UI, Vite</td></tr>
            <tr><td>Backend</td><td>FastAPI, SQLAlchemy, Pydantic</td></tr>
            <tr><td>Database</td><td>PostgreSQL 15</td></tr>
            <tr><td>AI</td><td>Anthropic Claude Sonnet</td></tr>
            <tr><td>Infrastructure</td><td>Docker Compose</td></tr>
          </tbody>
        </Box>
      </Section>
    </Box>
  );
}

function GettingStartedContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Getting Started</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Get MetricFrame running locally in 5 minutes.
      </Typography>

      <Section title="Prerequisites">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Requirement</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Version</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Docker</td><td>20.10+</td><td>Container runtime</td></tr>
            <tr><td>Docker Compose</td><td>2.0+</td><td>Multi-container orchestration</td></tr>
            <tr><td>Git</td><td>2.30+</td><td>Repository cloning</td></tr>
          </tbody>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Optional (for AI features):</strong> Bring your own API key with 6 provider options available in AI configuration settings
        </Typography>
      </Section>

      <Section title="Quick Start">
        <SubSection title="Step 1: Clone the Repository">
          <Box component="pre" sx={codeBlockStyles}>
{`git clone https://github.com/automationacct01/metric_frame.git
cd metric_frame`}
          </Box>
        </SubSection>

        <SubSection title="Step 2: Configure Environment">
          <Typography variant="body2" paragraph>Create the backend environment file:</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`cp backend/.env.example backend/.env`}
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>Edit <code>backend/.env</code> with your configuration:</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# Database (default works with Docker)
DATABASE_URL=postgresql://postgres:postgres@db:5432/metricframe

# Application Settings
DEBUG=true
LOG_LEVEL=INFO`}
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Note:</strong> AI provider configuration is done through Settings → AI Configuration in the app, where you can bring your own API key and choose from 6 provider options.
          </Typography>
        </SubSection>

        <SubSection title="Step 3: Start the Application">
          <Box component="pre" sx={codeBlockStyles}>{`./dev.sh`}</Box>
          <Typography variant="body2" sx={{ mt: 2 }}>This script will:</Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Build Docker containers</li>
            <li>Start PostgreSQL database</li>
            <li>Run database migrations</li>
            <li>Seed 356 pre-configured metrics</li>
            <li>Launch frontend and backend services</li>
          </Box>
        </SubSection>

        <SubSection title="Step 4: Verify Installation">
          <Box component="pre" sx={codeBlockStyles}>
{`# Check running containers
docker compose ps

# Expected output:
# NAME                    STATUS
# metricframe-db   running
# metricframe-api  running
# metricframe-web  running`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Access the Application">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Service</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>URL</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Frontend</strong></td><td>http://localhost:5175</td><td>Main dashboard</td></tr>
            <tr><td><strong>API Docs</strong></td><td>http://localhost:8002/docs</td><td>Swagger UI</td></tr>
            <tr><td><strong>Database</strong></td><td>localhost:5434</td><td>PostgreSQL (user: nist)</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="First Steps After Setup">
        <SubSection title="1. Explore the Dashboard">
          <Typography variant="body2">Navigate to http://localhost:5175 to see the executive dashboard:</Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <li>View risk score cards for each CSF function</li>
            <li>Explore the pre-loaded 356 metrics</li>
            <li>Check framework coverage visualization</li>
          </Box>
        </SubSection>

        <SubSection title="2. Review Pre-Loaded Metrics">
          <Typography variant="body2">The application seeds 356 metrics (276 CSF 2.0 + 80 AI RMF) distributed across functions:</Typography>
          <Box component="table" sx={{ ...tableStyles, mt: 2 }}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Metrics</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Examples</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>GOVERN</td><td>48</td><td>Board briefings, policy compliance, AI governance</td></tr>
              <tr><td>IDENTIFY</td><td>47</td><td>Asset inventory, vulnerability scanning, AI asset mapping</td></tr>
              <tr><td>PROTECT</td><td>56</td><td>MFA adoption, patching cadence, AI safeguards</td></tr>
              <tr><td>DETECT</td><td>44</td><td>MTTD, monitoring coverage, AI anomaly detection</td></tr>
              <tr><td>RESPOND</td><td>42</td><td>MTTR, incident containment, AI incident response</td></tr>
              <tr><td>RECOVER</td><td>39</td><td>RTO achievement, backup success, AI recovery</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="3. Try the AI Assistant">
          <Typography variant="body2">If you configured API keys, test the AI assistant:</Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Click the AI Chat icon</li>
            <li>Try: "Create a metric for tracking phishing test click rates"</li>
            <li>Review the generated metric structure</li>
          </Box>
        </SubSection>
      </Section>

      <Section title="Environment Configuration Reference">
        <SubSection title="Optional Variables">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Variable</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Default</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>AI_API_KEY</td><td>API key for AI provider (configured in settings)</td><td>None</td></tr>
              <tr><td>DEBUG</td><td>Enable debug mode</td><td>false</td></tr>
              <tr><td>LOG_LEVEL</td><td>Logging verbosity</td><td>INFO</td></tr>
              <tr><td>CORS_ORIGINS</td><td>Allowed frontend origins</td><td>http://localhost:5175</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="Scoring Thresholds">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Variable</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Default</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>SCORE_VERY_LOW_THRESHOLD</td><td>Very Low risk minimum</td><td>90</td></tr>
              <tr><td>SCORE_LOW_THRESHOLD</td><td>Low risk minimum</td><td>75</td></tr>
              <tr><td>SCORE_MODERATE_THRESHOLD</td><td>Moderate risk minimum</td><td>60</td></tr>
              <tr><td>SCORE_ELEVATED_THRESHOLD</td><td>Elevated risk minimum</td><td>40</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>

      <Section title="Stopping and Updating">
        <Box component="pre" sx={codeBlockStyles}>
{`# Stop all containers
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v

# Update to latest
git pull origin main
docker compose build
./dev.sh`}
        </Box>
      </Section>
    </Box>
  );
}

function HowItWorksContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>How It Works</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        A technical overview of MetricFrame's architecture, data flow, and component interactions.
      </Typography>

      <Section title="System Architecture">
        <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │ MetricsGrid │  │  AI Chat    │  │  Catalog    │        │
│  │  ScoreCards │  │  CRUD Ops   │  │  Assistant  │  │  Manager    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND (Vite)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Client (axios)  │  State Management  │  Material-UI Components │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           API ROUTERS                                 │  │
│  │  /metrics  │  /scores  │  /ai  │  /catalogs  │  /csf  │  /frameworks │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         SERVICES LAYER                                │  │
│  │  ScoringService  │  AIClient  │  CatalogScoring  │  CSFReference     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       SQLAlchemy ORM                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                    │
          ▼                                                    ▼
┌─────────────────────┐                          ┌─────────────────────────┐
│    PostgreSQL DB    │                          │    AI Services          │
│  ┌───────────────┐  │                          │  ┌───────────────────┐  │
│  │ 356 Metrics   │  │                          │  │ Anthropic Claude  │  │
│  │ Catalogs      │  │                          │  │ (Primary)         │  │
│  │ Scores        │  │                          │  ├───────────────────┤  │
│  │ Frameworks    │  │                          │  │ OpenAI GPT        │  │
│  └───────────────┘  │                          │  │ (Fallback)        │  │
└─────────────────────┘                          └─────────────────────────┘`}
        </Box>
      </Section>

      <Section title="Technology Stack">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Layer</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Technology</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Version</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Frontend</strong></td><td>React</td><td>18.x</td><td>UI framework</td></tr>
            <tr><td></td><td>TypeScript</td><td>5.x</td><td>Type safety</td></tr>
            <tr><td></td><td>Material-UI</td><td>5.x</td><td>Component library</td></tr>
            <tr><td></td><td>Vite</td><td>5.x</td><td>Build tooling</td></tr>
            <tr><td><strong>Backend</strong></td><td>FastAPI</td><td>0.100+</td><td>API framework</td></tr>
            <tr><td></td><td>SQLAlchemy</td><td>2.x</td><td>ORM</td></tr>
            <tr><td></td><td>Pydantic</td><td>2.x</td><td>Data validation</td></tr>
            <tr><td></td><td>Alembic</td><td>1.x</td><td>Migrations</td></tr>
            <tr><td><strong>Database</strong></td><td>PostgreSQL</td><td>15.x</td><td>Primary data store</td></tr>
            <tr><td><strong>AI</strong></td><td>Anthropic Claude</td><td>Sonnet</td><td>Primary AI</td></tr>
            <tr><td></td><td>OpenAI GPT</td><td>4o</td><td>Fallback AI</td></tr>
            <tr><td><strong>Infrastructure</strong></td><td>Docker Compose</td><td>2.x</td><td>Orchestration</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Request Lifecycle">
        <SubSection title="Dashboard Load Flow">
          <Box component="pre" sx={codeBlockStyles}>
{`User opens dashboard
        │
        ▼
Frontend requests /scores/overview
        │
        ▼
Backend ScoringService calculates:
  1. Get active catalog (or default metrics)
  2. Fetch all metrics with current values
  3. Calculate individual metric scores
  4. Aggregate by CSF category
  5. Aggregate by CSF function
  6. Apply risk rating thresholds
        │
        ▼
Response: Function scores + category breakdowns
        │
        ▼
Frontend renders ScoreCards with Red/Amber/Green colors`}
          </Box>
        </SubSection>

        <SubSection title="Metric Creation Flow">
          <Box component="pre" sx={codeBlockStyles}>
{`User enters metric in AI Chat
        │
        ▼
Frontend POST /ai/chat { mode: "metrics", prompt: "..." }
        │
        ▼
Backend AIClient:
  1. Build system prompt
  2. Call Claude API
  3. Parse structured response
  4. Validate against schemas
        │
        ▼
AI returns metric structure
        │
        ▼
User confirms → Frontend POST /metrics
        │
        ▼
Backend creates metric + audit log`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Backend Routers">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Router</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Base Path</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Responsibilities</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>metrics</code></td><td>/api/v1/metrics</td><td>CRUD operations, CSV export</td></tr>
            <tr><td><code>scores</code></td><td>/api/v1/scores</td><td>Score calculations, aggregations</td></tr>
            <tr><td><code>ai</code></td><td>/api/v1/ai</td><td>Chat modes, enhancements</td></tr>
            <tr><td><code>catalogs</code></td><td>/api/v1/catalogs</td><td>Catalog CRUD, activation</td></tr>
            <tr><td><code>csf</code></td><td>/api/v1/csf</td><td>Framework reference data</td></tr>
            <tr><td><code>frameworks</code></td><td>/api/v1/frameworks</td><td>Multi-framework support</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Services Layer">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Service</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>File</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>ScoringService</td><td>scoring.py</td><td>Gap-to-target calculations</td></tr>
            <tr><td>AIClient</td><td>ai_client.py</td><td>Claude/GPT integration</td></tr>
            <tr><td>CatalogScoring</td><td>catalog_scoring.py</td><td>Catalog-aware aggregation</td></tr>
            <tr><td>CSFReference</td><td>csf_reference.py</td><td>Framework hierarchy</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Multi-Framework Support">
        <Typography variant="body2" paragraph>The application supports three security frameworks:</Typography>
        <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│  Framework                                                       │
│    └── Functions                                                │
│          └── Categories                                         │
│                └── Subcategories                                │
│                      └── Metrics                                │
└─────────────────────────────────────────────────────────────────┘

NIST CSF 2.0                 AI RMF 1.0              Cyber AI Profile
├── GOVERN (GV)              ├── GOVERN              ├── Extended CSF
├── IDENTIFY (ID)            ├── MAP                 │   with AI
├── PROTECT (PR)             ├── MEASURE             │   considerations
├── DETECT (DE)              └── MANAGE              └── AI-specific
├── RESPOND (RS)                                         controls
└── RECOVER (RC)`}
        </Box>
      </Section>
    </Box>
  );
}

function DashboardContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Dashboard Guide</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        The executive dashboard provides a comprehensive view of your organization's cybersecurity posture
        through risk visualization, framework coverage, and actionable insights.
      </Typography>

      <Section title="Dashboard Layout">
        <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Framework Select│  │ Active Catalog  │  │ Overall Score: 72%          │  │
│  │ [NIST CSF 2.0 ▼]│  │ "Q4 Security"   │  │ ████████████░░░░ Moderate   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  SCORE CARDS                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ GOVERN  │ │IDENTIFY │ │ PROTECT │ │ DETECT  │ │ RESPOND │ │ RECOVER │   │
│  │   78%   │ │   65%   │ │   82%   │ │   71%   │ │   68%   │ │   74%   │   │
│  │  LOW    │ │MODERATE │ │  LOW    │ │MODERATE │ │MODERATE │ │MODERATE │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  CSF COVERAGE VIEW                               │  METRICS NEEDING ATTENTION│
│  GV.OC ████████░░ 80%                            │  MFA Adoption    42%      │
│  GV.RM ██████████ 95%                            │  Patch Cadence   38%      │
│  ID.AM ███████░░░ 72%                            │  MTTD            55%      │
│  ...                                              │  ...                      │
└─────────────────────────────────────────────────────────────────────────────┘`}
        </Box>
      </Section>

      <Section title="Risk Score Cards">
        <Typography variant="body2" paragraph>Each CSF function displays a dedicated score card showing:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Element</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Function Name</strong></td><td>GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER</td></tr>
            <tr><td><strong>Percentage Score</strong></td><td>Weighted average of all metrics in function</td></tr>
            <tr><td><strong>Visual Bar</strong></td><td>Color-coded progress indicator</td></tr>
            <tr><td><strong>Risk Rating</strong></td><td>Text label (Very Low, Low, Moderate, Elevated, High)</td></tr>
            <tr><td><strong>Trend Indicator</strong></td><td>Arrow showing change from previous period</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Risk Color Coding">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Score Range</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Color</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Risk Rating</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Meaning</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>90-100%</td><td>Dark Green</td><td>Very Low</td><td>Exceeding security targets</td></tr>
            <tr><td>75-89%</td><td>Green</td><td>Low</td><td>Meeting most targets</td></tr>
            <tr><td>60-74%</td><td>Yellow</td><td>Moderate</td><td>Approaching targets</td></tr>
            <tr><td>40-59%</td><td>Orange</td><td>Elevated</td><td>Below targets</td></tr>
            <tr><td>0-39%</td><td>Red</td><td>High</td><td>Significantly below targets</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="CSF Coverage View">
        <Typography variant="body2" paragraph>The coverage view provides a visual map of framework implementation:</Typography>
        <Box component="pre" sx={codeBlockStyles}>
{`Function: GOVERN (GV)
├── GV.OC - Organizational Context    ████████░░ 80%  (8/10 metrics)
├── GV.RM - Risk Management Strategy  ██████████ 95%  (6/6 metrics)
├── GV.RR - Roles & Responsibilities  ███████░░░ 72%  (5/7 metrics)
├── GV.PO - Policy                    ████████░░ 85%  (7/8 metrics)
├── GV.OV - Oversight                 ██████░░░░ 62%  (4/6 metrics)
└── GV.SC - Supply Chain Management   ████░░░░░░ 45%  (3/8 metrics)`}
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>Coverage metrics show:</Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li><strong>Progress Bar:</strong> Visual representation of category score</li>
          <li><strong>Percentage:</strong> Average score for metrics in category</li>
          <li><strong>Metric Count:</strong> Number of metrics vs total possible</li>
          <li><strong>Color:</strong> Risk status color matching score thresholds</li>
        </Box>
      </Section>

      <Section title="Active Catalog Display">
        <Typography variant="body2" paragraph>The dashboard header shows the currently active metric catalog:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>State</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Display</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Default Catalog</td><td>"Default (356 metrics)"</td></tr>
            <tr><td>Custom Active</td><td>Catalog name with metric count</td></tr>
            <tr><td>No Catalog</td><td>"No active catalog - using defaults"</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Framework Selector">
        <Typography variant="body2" paragraph>Switch between supported frameworks:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Framework</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>NIST CSF 2.0</strong></td><td>Cybersecurity Framework (default)</td></tr>
            <tr><td><strong>NIST AI RMF</strong></td><td>AI Risk Management Framework</td></tr>
            <tr><td><strong>Cyber AI Profile</strong></td><td>CSF extended for AI systems</td></tr>
          </tbody>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>When switching frameworks:</Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>Score cards show framework-specific functions</li>
          <li>Coverage view shows framework categories</li>
          <li>Metrics filter to framework-mapped items</li>
          <li>Scores recalculate using framework-specific aggregation</li>
        </Box>
      </Section>

      <Section title="Metrics Needing Attention">
        <Typography variant="body2" paragraph>The attention panel highlights metrics below target:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Criteria</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Score below 60%</td><td>Configurable threshold</td></tr>
            <tr><td>High priority</td><td>Marked as high importance</td></tr>
            <tr><td>No recent updates</td><td>Stale data warnings</td></tr>
            <tr><td>Negative trend</td><td>Significant score decline</td></tr>
          </tbody>
        </Box>
      </Section>
    </Box>
  );
}

function MetricsManagementContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Metrics Management</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Comprehensive guide to managing Key Risk Indicators (KRIs) in MetricFrame, including the 356
        pre-configured metrics (276 CSF + 80 AI RMF), catalog system, and import/export capabilities.
      </Typography>

      <Section title="Metrics Overview">
        <Typography variant="body2" paragraph>Metrics represent measurable security KRIs. Each metric includes:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Field</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Example</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Name</strong></td><td>Descriptive identifier</td><td>"MFA Adoption Rate"</td></tr>
            <tr><td><strong>Description</strong></td><td>Detailed explanation</td><td>"Percentage of users with MFA enabled"</td></tr>
            <tr><td><strong>Current Value</strong></td><td>Latest measurement</td><td>85</td></tr>
            <tr><td><strong>Target Value</strong></td><td>Goal to achieve</td><td>95</td></tr>
            <tr><td><strong>Unit</strong></td><td>Measurement unit</td><td>"%"</td></tr>
            <tr><td><strong>Direction</strong></td><td>How to interpret values</td><td>higher_is_better</td></tr>
            <tr><td><strong>CSF Function</strong></td><td>NIST CSF alignment</td><td>PROTECT</td></tr>
            <tr><td><strong>CSF Category</strong></td><td>Specific category</td><td>PR.AA</td></tr>
            <tr><td><strong>Priority</strong></td><td>Importance weighting</td><td>High</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="356 Pre-Configured Metrics">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Count</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Focus Areas</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>GOVERN</strong></td><td>35</td><td>Board reporting, policy compliance, risk management</td></tr>
            <tr><td><strong>IDENTIFY</strong></td><td>34</td><td>Asset management, vulnerability scanning, risk assessment</td></tr>
            <tr><td><strong>PROTECT</strong></td><td>44</td><td>Access control, awareness, data security, maintenance</td></tr>
            <tr><td><strong>DETECT</strong></td><td>30</td><td>Monitoring, detection processes, event analysis</td></tr>
            <tr><td><strong>RESPOND</strong></td><td>28</td><td>Response planning, communications, analysis, mitigation</td></tr>
            <tr><td><strong>RECOVER</strong></td><td>28</td><td>Recovery planning, improvements, communications</td></tr>
          </tbody>
        </Box>

        <SubSection title="Example Metrics by Function">
          <Typography variant="body2"><strong>GOVERN (GV):</strong> Board cybersecurity briefing frequency, Policy compliance rate, Security budget allocation, Risk assessment completion rate</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>IDENTIFY (ID):</strong> Asset inventory completeness, Vulnerability scan coverage, Risk assessment currency, Supply chain assessments</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>PROTECT (PR):</strong> MFA adoption rate, Patching cadence, Encryption coverage, Security awareness training completion</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>DETECT (DE):</strong> Mean Time to Detect (MTTD), Security monitoring coverage, False positive rate, Threat hunting frequency</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>RESPOND (RS):</strong> Mean Time to Respond (MTTR), Incident containment rate, Post-incident review completion</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>RECOVER (RC):</strong> RTO/RPO achievement, Backup restore success rate, Business continuity test frequency</Typography>
        </SubSection>
      </Section>

      <Section title="MetricsGrid Features">
        <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────────────────────────┐
│  FILTERS & SEARCH                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────────────┐ │
│  │ Function ▼  │ │ Category ▼  │ │ Priority ▼  │ │ 🔍 Search metrics...   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  TOOLBAR                                                                     │
│  [+ Add Metric] [📤 Export CSV] [📥 Import] [🔄 Refresh]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  METRICS TABLE                                                               │
│  ┌────────┬──────────────────┬─────────┬────────┬───────┬────────┬───────┐ │
│  │ Number │ Name             │ Current │ Target │ Score │ Status │Actions│ │
│  ├────────┼──────────────────┼─────────┼────────┼───────┼────────┼───────┤ │
│  │ PR-001 │ MFA Adoption     │ 85%     │ 95%    │ 89%   │ 🟢     │ ✏️ 🔒 │ │
│  │ PR-002 │ Patch Cadence    │ 12 days │ 7 days │ 58%   │ 🟠     │ ✏️ 🔒 │ │
│  └────────┴──────────────────┴─────────┴────────┴───────┴────────┴───────┘ │
└─────────────────────────────────────────────────────────────────────────────┘`}
        </Box>

        <SubSection title="Filtering Options">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Filter</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Options</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Behavior</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Function</strong></td><td>GV, ID, PR, DE, RS, RC</td><td>Show metrics in function</td></tr>
              <tr><td><strong>Category</strong></td><td>All categories for selected function</td><td>Show metrics in category</td></tr>
              <tr><td><strong>Priority</strong></td><td>High, Medium, Low</td><td>Filter by importance</td></tr>
              <tr><td><strong>Status</strong></td><td>All, Meeting Target, Below Target</td><td>Filter by performance</td></tr>
              <tr><td><strong>Search</strong></td><td>Free text</td><td>Matches name, description</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>

      <Section title="Adding New Metrics">
        <SubSection title="Manual Creation">
          <Typography variant="body2" paragraph>Click "+ Add Metric" and fill required fields:</Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <li>Name and Description</li>
            <li>Current Value and Target Value</li>
            <li>Unit and Direction type</li>
            <li>CSF Function and Category</li>
            <li>Priority level</li>
          </Box>
        </SubSection>

        <SubSection title="AI-Assisted Creation">
          <Typography variant="body2" paragraph>Use the AI Chat to create metrics from natural language:</Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Open AI Chat panel</li>
            <li>Describe the metric: "Create a metric for tracking the percentage of endpoints with EDR agents installed"</li>
            <li>Review AI-generated structure</li>
            <li>Confirm to create metric</li>
          </Box>
        </SubSection>

        <SubSection title="Direction Types">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Direction</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Example</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>higher_is_better</code></td><td>Higher values = better performance</td><td>MFA adoption rate</td></tr>
              <tr><td><code>lower_is_better</code></td><td>Lower values = better performance</td><td>Mean Time to Detect</td></tr>
              <tr><td><code>target_range</code></td><td>Value should be within range</td><td>Budget variance</td></tr>
              <tr><td><code>binary</code></td><td>Pass/fail (0 or 100)</td><td>Annual audit completion</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>

      <Section title="Catalog System (BYOC)">
        <Typography variant="body2" paragraph>
          The Bring Your Own Catalog system allows custom metric libraries with full framework integration.
        </Typography>

        <SubSection title="5-Step Import Wizard">
          <Box component="pre" sx={codeBlockStyles}>
{`Step 1: UPLOAD          Step 2: MAPPING         Step 3: CSF MAPPING
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Drop CSV here   │    │ CSV → Fields    │    │ AI suggests CSF │
│ or click browse │ => │ name → Name     │ => │ categories for  │
│                 │    │ value → Current │    │ each metric     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      ▼
Step 5: ACTIVATION      Step 4: ENHANCEMENT
┌─────────────────┐    ┌─────────────────┐
│ Set as active   │    │ AI suggests     │
│ catalog for     │ <= │ improvements:   │
│ scoring         │    │ priorities, etc │
└─────────────────┘    └─────────────────┘`}
          </Box>
        </SubSection>

        <SubSection title="Field Mapping">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Metric Field</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Required</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Auto-Detect Columns</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>Name</td><td>Yes</td><td>"name", "metric_name"</td></tr>
              <tr><td>Current Value</td><td>Yes</td><td>"current", "value"</td></tr>
              <tr><td>Target Value</td><td>No</td><td>"target", "goal"</td></tr>
              <tr><td>Description</td><td>No</td><td>"description", "desc"</td></tr>
              <tr><td>Unit</td><td>No</td><td>"unit", "uom"</td></tr>
              <tr><td>Priority</td><td>No</td><td>"priority", "importance"</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="Catalog Management">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Action</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>View</strong></td><td>See all metrics in catalog</td></tr>
              <tr><td><strong>Edit</strong></td><td>Modify catalog name/description</td></tr>
              <tr><td><strong>Clone</strong></td><td>Copy catalog as starting point</td></tr>
              <tr><td><strong>Export</strong></td><td>Download catalog as CSV</td></tr>
              <tr><td><strong>Activate</strong></td><td>Set as active for scoring</td></tr>
              <tr><td><strong>Delete</strong></td><td>Remove catalog (with confirmation)</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>

      <Section title="CSV Import/Export">
        <SubSection title="Export Format">
          <Box component="pre" sx={codeBlockStyles}>
{`metric_number,name,description,current_value,target_value,unit,direction,csf_function,csf_category,priority
PR-001,MFA Adoption Rate,Percentage of users with MFA,85,95,%,higher_is_better,PROTECT,PR.AA,High
PR-002,Patch Compliance,Critical patches applied within SLA,78,95,%,higher_is_better,PROTECT,PR.PS,High`}
          </Box>
        </SubSection>
      </Section>
    </Box>
  );
}

function AIAssistantContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>AI Assistant</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        MetricFrame integrates AI capabilities powered by Anthropic Claude to assist with metrics creation,
        analysis, recommendations, and catalog management.
      </Typography>

      <Section title="AI Integration Overview">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Capability</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Metric Generation</strong></td><td>Create metrics from natural language</td></tr>
            <tr><td><strong>Risk Explanation</strong></td><td>Plain-language risk analysis</td></tr>
            <tr><td><strong>Executive Reports</strong></td><td>Generate summary reports</td></tr>
            <tr><td><strong>CSF Mapping</strong></td><td>Automatic framework alignment</td></tr>
            <tr><td><strong>Enhancement Suggestions</strong></td><td>Improve imported metrics</td></tr>
            <tr><td><strong>Recommendations</strong></td><td>Prioritized improvement actions</td></tr>
          </tbody>
        </Box>

        <SubSection title="AI Configuration">
          <Typography variant="body2" paragraph>
            Configure your AI provider through <strong>Settings → AI Configuration</strong> in the app.
            Bring your own API key and choose from 6 provider options including Anthropic Claude, OpenAI, Together.ai, Azure OpenAI, AWS Bedrock, and GCP Vertex AI.
          </Typography>
          <Typography variant="body2" paragraph>Optional environment settings:</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# AI Settings (optional)
AI_TIMEOUT=30
AI_MAX_RETRIES=3`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Chat Modes">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Mode</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Trigger Words</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Metrics</strong></td><td>Create and modify metrics</td><td>"create metric", "add metric"</td></tr>
            <tr><td><strong>Explain</strong></td><td>Interpret risk scores and data</td><td>"explain", "why", "what does this mean"</td></tr>
            <tr><td><strong>Report</strong></td><td>Generate executive summaries</td><td>"report", "summary", "brief"</td></tr>
            <tr><td><strong>Recommendations</strong></td><td>Suggest improvement actions</td><td>"recommend", "suggest", "how can we improve"</td></tr>
            <tr><td><strong>Enhance</strong></td><td>Improve imported metrics</td><td>"enhance", "improve", "optimize"</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Metric Generation">
        <Typography variant="body2" paragraph>The AI converts natural language descriptions into complete metric definitions:</Typography>

        <SubSection title="Example Input">
          <Box component="pre" sx={codeBlockStyles}>
{`"We need to track how many of our servers get patched within 7 days
of critical vulnerabilities being announced"`}
          </Box>
        </SubSection>

        <SubSection title="AI Output">
          <Box component="pre" sx={codeBlockStyles}>
{`{
  "name": "Critical Patch Compliance Rate",
  "description": "Percentage of servers patched within 7 days of critical vulnerability disclosure",
  "current_value": null,
  "target_value": 95,
  "unit": "%",
  "direction": "higher_is_better",
  "csf_function": "PROTECT",
  "csf_category": "PR.PS",
  "priority": "High",
  "suggested_data_sources": [
    "Vulnerability scanner",
    "Patch management system",
    "CMDB"
  ]
}`}
          </Box>
        </SubSection>
      </Section>

      <Section title="CSF Mapping Suggestions">
        <Typography variant="body2" paragraph>When importing metrics or creating new ones, AI suggests framework mappings:</Typography>
        <Box component="pre" sx={codeBlockStyles}>
{`Input Metric: "Privileged Access Review Frequency"

AI Analysis:
  Analyzing metric characteristics:
  - "Privileged Access" → Access Control domain
  - "Review" → Verification/audit process
  - "Frequency" → Periodic activity

  Suggested Mapping:
    Function: PROTECT (PR)
    Category: PR.AA (Identity Management, Authentication, and Access Control)
    Subcategory: PR.AA-05 (Access permissions managed)
    Confidence: 92%

  Alternative Mappings:
    - GV.OV (Oversight) - 45% confidence
    - ID.AM (Asset Management) - 38% confidence`}
        </Box>
      </Section>

      <Section title="Enhancement Suggestions">
        <Typography variant="body2" paragraph>When importing custom catalogs, AI suggests improvements:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Original</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Enhanced</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Name: "patch compliance"</td><td>Name: "Patch Compliance Rate"</td></tr>
            <tr><td>Description: "patches"</td><td>Description: "Percentage of systems with all critical and high severity patches applied within the defined SLA timeframe"</td></tr>
            <tr><td>Target: 100</td><td>Target: 95 (adjusted for realistic achievement)</td></tr>
            <tr><td>Priority: (not set)</td><td>Priority: High</td></tr>
          </tbody>
        </Box>

        <SubSection title="Enhancement Categories">
          <Box component="ul" sx={{ pl: 3 }}>
            <li><strong>Clarity:</strong> Improve names and descriptions</li>
            <li><strong>Targets:</strong> Suggest realistic target values</li>
            <li><strong>Priority:</strong> Recommend appropriate priority</li>
            <li><strong>Direction:</strong> Correct measurement direction</li>
            <li><strong>Completeness:</strong> Add missing fields</li>
            <li><strong>Alignment:</strong> Better CSF mapping</li>
          </Box>
        </SubSection>
      </Section>

      <Section title="Example Prompts">
        <SubSection title="Metrics Mode">
          <Box component="ul" sx={{ pl: 3 }}>
            <li>"Create a metric for endpoint detection coverage"</li>
            <li>"Add a KRI for measuring backup success rate"</li>
            <li>"I need to track mean time to contain incidents"</li>
          </Box>
        </SubSection>

        <SubSection title="Explain Mode">
          <Box component="ul" sx={{ pl: 3 }}>
            <li>"Explain why IDENTIFY has a low score"</li>
            <li>"What's causing the elevated risk in DETECT?"</li>
            <li>"Why did our overall score drop this month?"</li>
          </Box>
        </SubSection>

        <SubSection title="Report Mode">
          <Box component="ul" sx={{ pl: 3 }}>
            <li>"Generate a board-level security summary"</li>
            <li>"Create a monthly risk report"</li>
            <li>"Summarize our PROTECT function status"</li>
          </Box>
        </SubSection>

        <SubSection title="Recommendations Mode">
          <Box component="ul" sx={{ pl: 3 }}>
            <li>"What should we prioritize to improve our score?"</li>
            <li>"Recommend actions for the RESPOND function"</li>
            <li>"Suggest quick wins for our security posture"</li>
          </Box>
        </SubSection>
      </Section>

      <Section title="Audit Trail">
        <Typography variant="body2" paragraph>All AI-driven changes are logged for compliance:</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Action</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>metric_created</code></td><td>New metric from AI</td></tr>
            <tr><td><code>metric_enhanced</code></td><td>AI improvement applied</td></tr>
            <tr><td><code>csf_mapping_suggested</code></td><td>Framework mapping</td></tr>
            <tr><td><code>report_generated</code></td><td>Executive report</td></tr>
            <tr><td><code>recommendation_made</code></td><td>Improvement suggestion</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Error Handling">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Error</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Cause</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Resolution</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>AI_TIMEOUT</code></td><td>Request took too long</td><td>Retry or simplify prompt</td></tr>
            <tr><td><code>AI_RATE_LIMIT</code></td><td>Too many requests</td><td>Wait and retry</td></tr>
            <tr><td><code>AI_INVALID_KEY</code></td><td>Bad API key</td><td>Check .env configuration</td></tr>
            <tr><td><code>AI_UNAVAILABLE</code></td><td>Service down</td><td>Use fallback or wait</td></tr>
          </tbody>
        </Box>
      </Section>
    </Box>
  );
}

function ScoringMethodologyContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Scoring Methodology</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        A detailed explanation of how MetricFrame calculates risk scores, from individual metrics through organizational rollups.
      </Typography>

      <Section title="Gap-to-Target Philosophy">
        <Typography variant="body2" paragraph>The scoring system measures how close current values are to target values:</Typography>
        <Box component="pre" sx={codeBlockStyles}>
{`Score = How well are we meeting our security targets?

100% = At or exceeding target
 0%  = No progress toward target`}
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>This approach:</Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>Focuses on goal achievement rather than arbitrary scales</li>
          <li>Enables comparison across different metric types</li>
          <li>Supports both "higher is better" and "lower is better" metrics</li>
          <li>Provides actionable insight into improvement needed</li>
        </Box>
      </Section>

      <Section title="Direction Types">
        <Typography variant="body2" paragraph>Metrics measure different aspects of security, requiring different scoring approaches:</Typography>

        <SubSection title="Higher is Better">
          <Typography variant="body2"><strong>Definition:</strong> Higher values indicate better performance</Typography>
          <Typography variant="body2"><strong>Examples:</strong> MFA adoption rate (target: 95%), Patch compliance (target: 100%)</Typography>
          <Box component="pre" sx={{ ...codeBlockStyles, mt: 2 }}>
{`Scoring Formula:
score = min(100, (current_value / target_value) * 100)

Example:
  Metric: MFA Adoption Rate
  Current: 85%
  Target: 95%
  Score: (85 / 95) * 100 = 89.5%`}
          </Box>
        </SubSection>

        <SubSection title="Lower is Better">
          <Typography variant="body2"><strong>Definition:</strong> Lower values indicate better performance</Typography>
          <Typography variant="body2"><strong>Examples:</strong> Mean Time to Detect (target: 1 hour), Vulnerability count (target: 0)</Typography>
          <Box component="pre" sx={{ ...codeBlockStyles, mt: 2 }}>
{`Scoring Formula:
if current_value <= target_value:
    score = 100
else:
    score = max(0, (target_value / current_value) * 100)

Example:
  Metric: Mean Time to Detect (MTTD)
  Current: 4 hours
  Target: 1 hour
  Score: (1 / 4) * 100 = 25%`}
          </Box>
        </SubSection>

        <SubSection title="Target Range">
          <Typography variant="body2"><strong>Definition:</strong> Value should fall within a specified range</Typography>
          <Typography variant="body2"><strong>Examples:</strong> Budget variance (target: -5% to +5%), Staffing ratio (target: 1:100 to 1:150)</Typography>
          <Box component="pre" sx={{ ...codeBlockStyles, mt: 2 }}>
{`Scoring Formula:
if lower_bound <= current_value <= upper_bound:
    score = 100
else:
    distance = min(|current - lower_bound|, |current - upper_bound|)
    range_size = upper_bound - lower_bound
    score = max(0, 100 - (distance / range_size) * 100)

Example:
  Metric: Security Budget Variance
  Current: +8%
  Target Range: -5% to +5%
  Distance from range: 3%
  Score: 100 - (3 / 10) * 100 = 70%`}
          </Box>
        </SubSection>

        <SubSection title="Binary">
          <Typography variant="body2"><strong>Definition:</strong> Pass/fail metrics with only two states</Typography>
          <Typography variant="body2"><strong>Examples:</strong> Annual penetration test completed, DR plan documented, CISO reports to board</Typography>
          <Box component="pre" sx={{ ...codeBlockStyles, mt: 2 }}>
{`Scoring Formula:
if current_value == target_value:
    score = 100
else:
    score = 0`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Weighted Aggregation">
        <SubSection title="Priority Weights">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Priority</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Weight</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Rationale</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>High</strong></td><td>1.0</td><td>Critical security controls</td></tr>
              <tr><td><strong>Medium</strong></td><td>0.6</td><td>Important but not critical</td></tr>
              <tr><td><strong>Low</strong></td><td>0.3</td><td>Nice-to-have or supporting</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="Weighted Average Formula">
          <Box component="pre" sx={codeBlockStyles}>
{`weighted_score = Σ(score_i × weight_i) / Σ(weight_i)

Where:
  score_i = individual metric score
  weight_i = priority weight for metric i`}
          </Box>
        </SubSection>

        <SubSection title="Example Calculation">
          <Box component="pre" sx={codeBlockStyles}>
{`Category: PR.AA (Access Control)
Metrics:
  - MFA Adoption:     Score 89%, Priority High (1.0)
  - SSO Coverage:     Score 75%, Priority Medium (0.6)
  - Password Policy:  Score 95%, Priority Low (0.3)

Weighted Sum = (89 × 1.0) + (75 × 0.6) + (95 × 0.3)
             = 89 + 45 + 28.5 = 162.5

Weight Sum = 1.0 + 0.6 + 0.3 = 1.9

Category Score = 162.5 / 1.9 = 85.5%`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Category & Function Level Scoring">
        <SubSection title="Category-Level Aggregation">
          <Box component="pre" sx={codeBlockStyles}>
{`CSF Category Score = weighted_average(all metrics in category)

Function: PROTECT (PR)
├── PR.AA - Access Control           85.5%  ████████░░
├── PR.AT - Awareness & Training     72.0%  ███████░░░
├── PR.DS - Data Security            91.2%  █████████░
├── PR.IP - Information Protection   68.4%  ██████░░░░
├── PR.MA - Maintenance              78.9%  ███████░░░
├── PR.PS - Protective Technology    82.1%  ████████░░
└── PR.PT - Platform Security        76.5%  ███████░░░`}
          </Box>
        </SubSection>

        <SubSection title="Function-Level Aggregation">
          <Box component="pre" sx={codeBlockStyles}>
{`CSF Function Score = weighted_average(all categories in function)

Function: PROTECT (PR)
Categories:
  PR.AA: 85.5%, PR.AT: 72.0%, PR.DS: 91.2%,
  PR.IP: 68.4%, PR.MA: 78.9%, PR.PS: 82.1%, PR.PT: 76.5%

Function Score = (85.5 + 72.0 + 91.2 + 68.4 + 78.9 + 82.1 + 76.5) / 7
               = 554.6 / 7 = 79.2%`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Risk Rating System">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Score Range</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Rating</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Color</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Interpretation</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>90-100%</td><td>Very Low</td><td>Dark Green</td><td>Exceeding security targets</td></tr>
            <tr><td>75-89%</td><td>Low</td><td>Green</td><td>Meeting most targets</td></tr>
            <tr><td>60-74%</td><td>Moderate</td><td>Yellow</td><td>Approaching targets</td></tr>
            <tr><td>40-59%</td><td>Elevated</td><td>Orange</td><td>Below targets</td></tr>
            <tr><td>0-39%</td><td>High</td><td>Red</td><td>Significantly below targets</td></tr>
          </tbody>
        </Box>

        <SubSection title="Visual Representation">
          <Box component="pre" sx={codeBlockStyles}>
{`Score Card Display:

┌─────────────────┐
│    PROTECT      │
│      79%        │
│ ████████░░░░░░░ │
│      LOW        │
└─────────────────┘

Progress Bar:
  - Filled portion = score percentage
  - Color = risk rating color`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Configurable Thresholds">
        <Typography variant="body2" paragraph>Customize rating thresholds in <code>backend/.env</code>:</Typography>
        <Box component="pre" sx={codeBlockStyles}>
{`# Score thresholds (percentages)
SCORE_VERY_LOW_THRESHOLD=90
SCORE_LOW_THRESHOLD=75
SCORE_MODERATE_THRESHOLD=60
SCORE_ELEVATED_THRESHOLD=40
# Below ELEVATED is "High Risk"

# For a more conservative organization:
SCORE_VERY_LOW_THRESHOLD=95
SCORE_LOW_THRESHOLD=85
SCORE_MODERATE_THRESHOLD=70
SCORE_ELEVATED_THRESHOLD=50`}
        </Box>
      </Section>

      <Section title="Catalog-Aware Scoring">
        <Typography variant="body2" paragraph>When a custom catalog is active:</Typography>
        <Box component="ol" sx={{ pl: 3 }}>
          <li>Scoring uses catalog metrics instead of defaults</li>
          <li>CSF mappings from catalog determine aggregation</li>
          <li>Custom priorities are respected</li>
        </Box>

        <SubSection title="Cross-Catalog Comparison">
          <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────┐
│  CATALOG COMPARISON: PROTECT Function                    │
├─────────────────────────────────────────────────────────┤
│  Default Catalog (356 metrics)           79.2%          │
│  ████████████████░░░░                    LOW            │
│                                                          │
│  Q4 Security Catalog (45 metrics)        72.8%          │
│  ██████████████░░░░░░                    MODERATE       │
│                                                          │
│  Compliance Catalog (128 metrics)        81.5%          │
│  █████████████████░░░                    LOW            │
└─────────────────────────────────────────────────────────┘`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Trend Indicators">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Indicator</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Meaning</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>↑</td><td>Score increased from previous period</td></tr>
            <tr><td>↓</td><td>Score decreased from previous period</td></tr>
            <tr><td>→</td><td>Score unchanged</td></tr>
            <tr><td>⚠</td><td>Significant change (greater than 5 points)</td></tr>
          </tbody>
        </Box>
      </Section>
    </Box>
  );
}

function FrameworksReferenceContent() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Frameworks Reference</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        MetricFrame supports multiple security and AI governance frameworks. This reference covers the structure, functions, and relationships of each supported framework.
      </Typography>

      {/* Sub-tabs for navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              minWidth: 'auto',
              px: 2,
            },
          }}
        >
          <Tab label="Overview" />
          <Tab label="NIST CSF 2.0" />
          <Tab label="NIST AI RMF" />
          <Tab label="Cyber AI Profile" />
          <Tab label="Cross-Framework" />
          <Tab label="Resources" />
        </Tabs>
      </Paper>

      {/* Tab 0: Overview */}
      {activeTab === 0 && (
        <>
      <Section title="Supported Frameworks Overview">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Framework</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Version</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Focus</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Functions</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Metrics</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>NIST CSF</strong></td><td>2.0</td><td>Cybersecurity risk management</td><td>6</td><td>276</td></tr>
            <tr><td><strong>NIST AI RMF</strong></td><td>1.0</td><td>AI system risk management</td><td>4</td><td>80</td></tr>
            <tr><td><strong>Cyber AI Profile</strong></td><td>1.0</td><td>AI-enhanced cybersecurity</td><td>6 (extended)</td><td>TBD</td></tr>
          </tbody>
        </Box>

        <SubSection title="Framework Comparison">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Aspect</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>NIST CSF 2.0</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>AI RMF 1.0</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Primary Use</strong></td><td>General cybersecurity</td><td>AI systems</td></tr>
              <tr><td><strong>Scope</strong></td><td>Organization-wide IT systems</td><td>AI lifecycle management</td></tr>
              <tr><td><strong>Structure</strong></td><td>Functions → Categories → Subcategories</td><td>Functions → Categories → Trustworthiness</td></tr>
              <tr><td><strong>Metrics in App</strong></td><td>276</td><td>80</td></tr>
              <tr><td><strong>Maturity</strong></td><td>Established (since 2014)</td><td>Newer (2023)</td></tr>
              <tr><td><strong>Mandatory For</strong></td><td>US Federal agencies</td><td>Voluntary</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="Why Use Multiple Frameworks?">
          <Typography variant="body2" paragraph>
            Organizations increasingly need both frameworks:
          </Typography>
          <ul style={{ marginTop: 0 }}>
            <li><Typography variant="body2"><strong>CSF 2.0</strong> secures IT infrastructure, networks, and data</Typography></li>
            <li><Typography variant="body2"><strong>AI RMF</strong> ensures AI systems are trustworthy and don't cause harm</Typography></li>
            <li><Typography variant="body2">Together, they provide comprehensive risk coverage for modern digital environments</Typography></li>
          </ul>
        </SubSection>
      </Section>
        </>
      )}

      {/* Tab 1: NIST CSF 2.0 */}
      {activeTab === 1 && (
        <>
      <Section title="NIST Cybersecurity Framework 2.0">
        <Typography variant="body2" paragraph>
          The NIST Cybersecurity Framework provides a policy framework for organizations to assess and improve their ability to prevent, detect, and respond to cyber attacks.
        </Typography>
        <Typography variant="body2"><strong>Key Characteristics:</strong> Voluntary framework, Risk-based approach, Industry-agnostic, Outcome-focused</Typography>

        <SubSection title="CSF 2.0 Hierarchy">
          <Box component="pre" sx={codeBlockStyles}>
{`Framework
└── Functions (6)
    └── Categories (23)
        └── Subcategories (108)
            └── Metrics (276 in app)`}
          </Box>
        </SubSection>

        <SubSection title="6 Core Functions">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Metrics</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>GV</strong></td><td>GOVERN</td><td>Establish cybersecurity governance</td><td>35</td></tr>
              <tr><td><strong>ID</strong></td><td>IDENTIFY</td><td>Understand organizational risks</td><td>34</td></tr>
              <tr><td><strong>PR</strong></td><td>PROTECT</td><td>Implement safeguards</td><td>44</td></tr>
              <tr><td><strong>DE</strong></td><td>DETECT</td><td>Discover cybersecurity events</td><td>30</td></tr>
              <tr><td><strong>RS</strong></td><td>RESPOND</td><td>Take action on incidents</td><td>28</td></tr>
              <tr><td><strong>RC</strong></td><td>RECOVER</td><td>Restore capabilities</td><td>28</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="GOVERN (GV) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>GV.OC</td><td>Organizational Context</td><td>Understanding organizational mission and stakeholders</td></tr>
              <tr><td>GV.RM</td><td>Risk Management Strategy</td><td>Priorities, constraints, and risk tolerance</td></tr>
              <tr><td>GV.RR</td><td>Roles & Responsibilities</td><td>Cybersecurity roles established</td></tr>
              <tr><td>GV.PO</td><td>Policy</td><td>Organizational cybersecurity policy</td></tr>
              <tr><td>GV.OV</td><td>Oversight</td><td>Results of risk management activities reviewed</td></tr>
              <tr><td>GV.SC</td><td>Supply Chain</td><td>Supply chain risk management</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="IDENTIFY (ID) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>ID.AM</td><td>Asset Management</td><td>Hardware, software, data, and systems inventoried</td></tr>
              <tr><td>ID.RA</td><td>Risk Assessment</td><td>Cybersecurity risk to the organization understood</td></tr>
              <tr><td>ID.IM</td><td>Improvement</td><td>Improvements to organizational cybersecurity identified</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="PROTECT (PR) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>PR.AA</td><td>Identity Management, Authentication & Access Control</td><td>Access to assets managed through credentials and authentication</td></tr>
              <tr><td>PR.AT</td><td>Awareness & Training</td><td>Personnel are trained and aware of security responsibilities</td></tr>
              <tr><td>PR.DS</td><td>Data Security</td><td>Data is managed consistent with risk strategy to protect confidentiality, integrity, and availability</td></tr>
              <tr><td>PR.PS</td><td>Platform Security</td><td>Hardware, software, and services managed consistent with risk strategy</td></tr>
              <tr><td>PR.IR</td><td>Technology Infrastructure Resilience</td><td>Security architecture managed with the organization's risk strategy</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="DETECT (DE) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>DE.CM</td><td>Continuous Monitoring</td><td>Assets are monitored to find anomalies, indicators of compromise, and other potentially adverse events</td></tr>
              <tr><td>DE.AE</td><td>Adverse Event Analysis</td><td>Anomalies, indicators of compromise, and other potentially adverse events are analyzed</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="RESPOND (RS) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>RS.MA</td><td>Incident Management</td><td>Responses to detected cybersecurity incidents are managed</td></tr>
              <tr><td>RS.AN</td><td>Incident Analysis</td><td>Investigations are conducted to ensure effective response and support forensics/recovery</td></tr>
              <tr><td>RS.CO</td><td>Incident Response Reporting & Communication</td><td>Response activities are coordinated with internal and external stakeholders</td></tr>
              <tr><td>RS.MI</td><td>Incident Mitigation</td><td>Activities performed to prevent expansion of an event and mitigate its effects</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="RECOVER (RC) Categories">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Category</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>RC.RP</td><td>Incident Recovery Plan Execution</td><td>Restoration activities are performed to ensure operational availability</td></tr>
              <tr><td>RC.CO</td><td>Incident Recovery Communication</td><td>Restoration activities are coordinated with internal and external parties</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>
        </>
      )}

      {/* Tab 2: NIST AI RMF */}
      {activeTab === 2 && (
        <>
      <Section title="NIST AI Risk Management Framework 1.0">
        <Typography variant="body2" paragraph>
          The <strong>NIST AI Risk Management Framework (AI RMF)</strong> is a voluntary framework released in January 2023 to help organizations design, develop, deploy, and use AI systems responsibly. It addresses the unique risks posed by artificial intelligence that traditional cybersecurity frameworks don't fully cover.
        </Typography>
        <Typography variant="body2"><strong>Key Characteristics:</strong> Voluntary framework, Applies to AI developers/deployers/users, Risk-based and outcome-focused, Lifecycle approach from design through decommissioning</Typography>

        <SubSection title="Why AI Needs Its Own Framework">
          <Typography variant="body2" paragraph>AI systems present unique challenges not addressed by traditional cybersecurity:</Typography>
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Challenge</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Example</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Opacity</strong></td><td>AI decisions can be difficult to explain</td><td>Why did the model deny this loan?</td></tr>
              <tr><td><strong>Bias</strong></td><td>AI can perpetuate societal biases</td><td>Hiring algorithm favoring demographics</td></tr>
              <tr><td><strong>Emergent Behavior</strong></td><td>AI may behave unexpectedly</td><td>Chatbot producing harmful content</td></tr>
              <tr><td><strong>Data Dependency</strong></td><td>AI quality depends on training data</td><td>Model trained on biased data</td></tr>
              <tr><td><strong>Societal Impact</strong></td><td>AI affects employment, justice, healthcare</td><td>Automated parole recommendations</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="4 Core Functions">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Metrics</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>GOVERN</strong></td><td>Cultivate culture of risk management; establish policies and accountability</td><td>4</td></tr>
              <tr><td><strong>MAP</strong></td><td>Context and risk framing; document AI purposes and impacts</td><td>3</td></tr>
              <tr><td><strong>MEASURE</strong></td><td>Analyze and track AI risks; test for bias, accuracy, security</td><td>6</td></tr>
              <tr><td><strong>MANAGE</strong></td><td>Prioritize and respond to risks; incident management</td><td>5</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="AI RMF Function Details">
          <Typography variant="body2" sx={{ mt: 2 }}><strong>GOVERN</strong> - Establish AI governance and risk culture</Typography>
          <Box component="table" sx={{ ...tableStyles, mt: 1 }}>
            <tbody>
              <tr><td>GOVERN-1</td><td>Legal & Regulatory</td><td>Compliance with AI laws and regulations</td></tr>
              <tr><td>GOVERN-2</td><td>Accountability</td><td>Clear roles, responsibilities, and authority</td></tr>
              <tr><td>GOVERN-3</td><td>Workforce</td><td>Diverse teams with AI skills and training</td></tr>
              <tr><td>GOVERN-4</td><td>Organizational Commitments</td><td>Responsible AI principles and values</td></tr>
              <tr><td>GOVERN-5</td><td>Processes & Procedures</td><td>Policies for AI risk management</td></tr>
              <tr><td>GOVERN-6</td><td>Oversight & Documentation</td><td>Monitoring and record-keeping</td></tr>
            </tbody>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}><strong>MAP</strong> - Establish context and identify risks</Typography>
          <Box component="table" sx={{ ...tableStyles, mt: 1 }}>
            <tbody>
              <tr><td>MAP-1</td><td>Context & Purpose</td><td>Document intended use and deployment context</td></tr>
              <tr><td>MAP-2</td><td>Categorization</td><td>Classify AI systems by risk level</td></tr>
              <tr><td>MAP-3</td><td>Capabilities & Limitations</td><td>Understand what AI can and cannot do</td></tr>
              <tr><td>MAP-4</td><td>Risk Identification</td><td>Identify potential risks and benefits</td></tr>
              <tr><td>MAP-5</td><td>Impact Assessment</td><td>Assess impacts on individuals and groups</td></tr>
            </tbody>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}><strong>MEASURE</strong> - Analyze and track AI risks</Typography>
          <Box component="table" sx={{ ...tableStyles, mt: 1 }}>
            <tbody>
              <tr><td>MEASURE-1</td><td>Risk Measurement</td><td>Approaches for quantifying AI risks</td></tr>
              <tr><td>MEASURE-2</td><td>Evaluation</td><td>Test performance, bias, security, drift</td></tr>
              <tr><td>MEASURE-3</td><td>Risk Tracking</td><td>Monitor risks over time</td></tr>
              <tr><td>MEASURE-4</td><td>Feedback Integration</td><td>Incorporate stakeholder feedback</td></tr>
            </tbody>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}><strong>MANAGE</strong> - Respond to AI risks</Typography>
          <Box component="table" sx={{ ...tableStyles, mt: 1 }}>
            <tbody>
              <tr><td>MANAGE-1</td><td>Risk Prioritization</td><td>Rank and prioritize identified risks</td></tr>
              <tr><td>MANAGE-2</td><td>Treatment</td><td>Risk response strategies (mitigate, transfer, accept)</td></tr>
              <tr><td>MANAGE-3</td><td>Third-Party</td><td>Vendor and supply chain AI risk management</td></tr>
              <tr><td>MANAGE-4</td><td>Response</td><td>Incident management and decommissioning</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="AI Trustworthiness Characteristics">
          <Typography variant="body2" paragraph>
            AI RMF defines seven characteristics that make AI systems worthy of trust. Each metric in the app is tagged with its primary trustworthiness characteristic, displayed as a <strong style={{ color: '#1565c0' }}>blue chip</strong> in the Metrics Grid.
          </Typography>
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Characteristic</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>What It Means</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Valid & Reliable</strong></td><td>valid_reliable</td><td>The AI does what it's supposed to do, reliably</td></tr>
              <tr><td><strong>Safe</strong></td><td>safe</td><td>The AI won't hurt people, property, or environment</td></tr>
              <tr><td><strong>Secure & Resilient</strong></td><td>secure_resilient</td><td>The AI can't be easily hacked or manipulated</td></tr>
              <tr><td><strong>Accountable & Transparent</strong></td><td>accountable_transparent</td><td>Someone is responsible; decisions are traceable</td></tr>
              <tr><td><strong>Explainable & Interpretable</strong></td><td>explainable_interpretable</td><td>Users can understand why the AI made a decision</td></tr>
              <tr><td><strong>Privacy-Enhanced</strong></td><td>privacy_enhanced</td><td>The AI respects privacy and data protection laws</td></tr>
              <tr><td><strong>Fair</strong></td><td>fair</td><td>The AI doesn't discriminate or show bias</td></tr>
            </tbody>
          </Box>
        </SubSection>

        <SubSection title="Example AI RMF Metrics in App">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Metric</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Current → Target</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Trustworthiness</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>AI Systems Inventory Completeness</td><td>GOVERN</td><td>75% → 100%</td><td>Accountable</td></tr>
              <tr><td>AI Model Accuracy</td><td>MEASURE</td><td>89% → 95%</td><td>Valid & Reliable</td></tr>
              <tr><td>AI Bias Detection Rate</td><td>MEASURE</td><td>55% → 100%</td><td>Fair</td></tr>
              <tr><td>AI Incident Response Time</td><td>MANAGE</td><td>6.5 hrs → 2 hrs</td><td>Accountable</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>
        </>
      )}

      {/* Tab 3: Cyber AI Profile */}
      {activeTab === 3 && (
        <>
      <Section title="Cyber AI Profile">
        <Typography variant="body2" paragraph>
          The Cyber AI Profile extends NIST CSF 2.0 to address the unique risks and controls associated with AI systems used in cybersecurity contexts.
        </Typography>
        <Typography variant="body2"><strong>Key Characteristics:</strong> Builds on CSF 2.0 foundation, Adds AI-specific subcategories, Bridges cybersecurity and AI governance</Typography>

        <SubSection title="How It Extends CSF 2.0">
          <Box component="pre" sx={codeBlockStyles}>
{`Standard CSF 2.0              Cyber AI Profile
┌─────────────────┐          ┌─────────────────────────────┐
│    PROTECT      │          │    PROTECT                  │
│    ├── PR.AA    │    →     │    ├── PR.AA               │
│    ├── PR.AT    │          │    ├── PR.AT               │
│    ├── PR.DS    │          │    ├── PR.DS               │
│    └── ...      │          │    ├── PR.AI (AI-specific) │
└─────────────────┘          │    └── ...                  │
                             └─────────────────────────────┘`}
          </Box>
        </SubSection>

        <SubSection title="AI-Specific Extensions">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Function</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Addition</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>GOVERN</td><td>GV.AI-OC, GV.AI-RM, GV.AI-PO</td><td>AI organizational context, risk management, policies</td></tr>
              <tr><td>IDENTIFY</td><td>ID.AI-AM, ID.AI-RA, ID.AI-VL</td><td>AI asset inventory, risk assessment, vulnerability mgmt</td></tr>
              <tr><td>PROTECT</td><td>PR.AI-AA, PR.AI-DS, PR.AI-ML</td><td>AI access controls, data protection, model security</td></tr>
              <tr><td>DETECT</td><td>DE.AI-CM, DE.AI-AE, DE.AI-AD</td><td>AI system monitoring, anomaly detection, adversarial detection</td></tr>
              <tr><td>RESPOND</td><td>RS.AI-MA, RS.AI-AN, RS.AI-MT</td><td>AI incident management, analysis, model threat response</td></tr>
              <tr><td>RECOVER</td><td>RC.AI-RP, RC.AI-RL</td><td>AI system recovery, model retraining procedures</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>
        </>
      )}

      {/* Tab 4: Cross-Framework */}
      {activeTab === 4 && (
        <>
      <Section title="Cross-Framework Mapping">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>CSF Function</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Related AI RMF</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>GOVERN</td><td>GOVERN</td></tr>
            <tr><td>IDENTIFY</td><td>MAP</td></tr>
            <tr><td>PROTECT</td><td>MANAGE</td></tr>
            <tr><td>DETECT</td><td>MEASURE</td></tr>
            <tr><td>RESPOND</td><td>MANAGE</td></tr>
            <tr><td>RECOVER</td><td>MANAGE</td></tr>
          </tbody>
        </Box>

        <SubSection title="Multi-Framework Metric Example">
          <Box component="pre" sx={codeBlockStyles}>
{`Metric: AI Model Version Control
├── CSF 2.0: PR.PS (Platform Security)
├── AI RMF: MANAGE (Documentation)
└── Cyber AI: PR.AI-ML (Model Security)`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Selecting a Framework">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Use Case</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Recommended Framework</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>General cybersecurity program management</td><td>NIST CSF 2.0</td></tr>
            <tr><td>Compliance with federal requirements</td><td>NIST CSF 2.0</td></tr>
            <tr><td>Managing AI system development</td><td>NIST AI RMF</td></tr>
            <tr><td>AI vendor risk assessment</td><td>NIST AI RMF</td></tr>
            <tr><td>Security operations using AI/ML</td><td>Cyber AI Profile</td></tr>
            <tr><td>AI-enhanced threat detection</td><td>Cyber AI Profile</td></tr>
            <tr><td>Combined cyber/AI risk management</td><td>Cyber AI Profile</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Getting Started with Frameworks">
        <Typography variant="body2" paragraph><strong>For Organizations New to These Frameworks:</strong></Typography>
        <ol style={{ marginTop: 0 }}>
          <li><Typography variant="body2"><strong>Assess Your Needs:</strong> Do you have AI systems? → Use AI RMF. Do you have IT systems? → Use CSF 2.0. Most organizations need both.</Typography></li>
          <li><Typography variant="body2"><strong>Start with Governance:</strong> Both frameworks emphasize governance as foundational. Establish policies, roles, and accountability first.</Typography></li>
          <li><Typography variant="body2"><strong>Identify Your Assets:</strong> CSF: IT assets, networks, data. AI RMF: AI systems, models, training data.</Typography></li>
          <li><Typography variant="body2"><strong>Implement Metrics:</strong> Use this dashboard to track key risk indicators. Start with high-priority metrics first.</Typography></li>
          <li><Typography variant="body2"><strong>Iterate and Improve:</strong> Review scores regularly. Adjust targets as maturity improves.</Typography></li>
        </ol>

        <SubSection title="Framework Selection Tips">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>If You...</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Start With...</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>Are new to cybersecurity frameworks</td><td>CSF 2.0</td></tr>
              <tr><td>Already have a security program</td><td>Add AI RMF for AI systems</td></tr>
              <tr><td>Are deploying AI systems</td><td>AI RMF + relevant CSF controls</td></tr>
              <tr><td>Need regulatory compliance</td><td>Check which framework applies</td></tr>
              <tr><td>Want comprehensive coverage</td><td>Both frameworks together</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>
        </>
      )}

      {/* Tab 5: Resources */}
      {activeTab === 5 && (
        <>
      <Section title="Additional Resources">
        <SubSection title="Official NIST Resources">
          <Typography variant="body2"><strong>NIST CSF 2.0:</strong></Typography>
          <ul style={{ marginTop: 4 }}>
            <li><Typography variant="body2">NIST CSF 2.0 Official Document - nist.gov/cyberframework</Typography></li>
            <li><Typography variant="body2">CSF 2.0 Quick Start Guides - nist.gov/cyberframework/getting-started</Typography></li>
          </ul>
          <Typography variant="body2" sx={{ mt: 2 }}><strong>NIST AI RMF 1.0:</strong></Typography>
          <ul style={{ marginTop: 4 }}>
            <li><Typography variant="body2">AI RMF Official Document - nist.gov/itl/ai-risk-management-framework</Typography></li>
            <li><Typography variant="body2">AI RMF Playbook - airc.nist.gov/AI_RMF_Knowledge_Base/Playbook</Typography></li>
          </ul>
        </SubSection>

        <SubSection title="Related Standards">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Standard</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Focus</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Relationship</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>ISO/IEC 27001</td><td>Information Security Management</td><td>Maps to CSF</td></tr>
              <tr><td>ISO/IEC 42001</td><td>AI Management System</td><td>Maps to AI RMF</td></tr>
              <tr><td>NIST SP 800-53</td><td>Security Controls</td><td>Detailed controls for CSF</td></tr>
              <tr><td>EU AI Act</td><td>AI Regulation</td><td>AI RMF helps compliance</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>
        </>
      )}
    </Box>
  );
}

function APIReferenceContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>API Reference</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Complete REST API documentation for MetricFrame backend services.
      </Typography>

      <Section title="Base URL & Authentication">
        <Box component="pre" sx={codeBlockStyles}>
{`Base URL: http://localhost:8002/api/v1

Authentication (optional):
Authorization: Bearer <api_key>`}
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>For local development, authentication may be disabled.</Typography>
      </Section>

      <Section title="Response Format">
        <SubSection title="Success Response">
          <Box component="pre" sx={codeBlockStyles}>
{`{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}`}
          </Box>
        </SubSection>

        <SubSection title="Error Response">
          <Box component="pre" sx={codeBlockStyles}>
{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of error",
    "details": { ... }
  }
}`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Metrics Router (/api/v1/metrics)">
        <SubSection title="List Metrics">
          <Box component="pre" sx={codeBlockStyles}>
{`GET /metrics

Query Parameters:
  function  - Filter by CSF function (GV, ID, PR, DE, RS, RC)
  category  - Filter by CSF category (e.g., PR.AA)
  priority  - Filter by priority (High, Medium, Low)
  search    - Search in name/description
  page      - Page number (default: 1)
  page_size - Items per page (default: 25, max: 100)`}
          </Box>
        </SubSection>

        <SubSection title="Get Single Metric">
          <Box component="pre" sx={codeBlockStyles}>{`GET /metrics/{metric_id}`}</Box>
        </SubSection>

        <SubSection title="Create Metric">
          <Box component="pre" sx={codeBlockStyles}>
{`POST /metrics
Content-Type: application/json

{
  "name": "New Security Metric",
  "description": "Description of the metric",
  "current_value": 75,
  "target_value": 90,
  "unit": "%",
  "direction": "higher_is_better",
  "csf_function": "PROTECT",
  "csf_category": "PR.AA",
  "priority": "High"
}`}
          </Box>
        </SubSection>

        <SubSection title="Update / Delete Metric">
          <Box component="pre" sx={codeBlockStyles}>
{`PATCH /metrics/{metric_id}  - Partial update
DELETE /metrics/{metric_id} - Delete metric

GET /metrics/export         - Export to CSV`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Scores Router (/api/v1/scores)">
        <SubSection title="Get Score Overview">
          <Box component="pre" sx={codeBlockStyles}>
{`GET /scores/overview

Response:
{
  "data": {
    "overall_score": 72.5,
    "overall_rating": "Moderate",
    "functions": [
      {
        "code": "GV",
        "name": "GOVERN",
        "score": 78.0,
        "rating": "Low",
        "metric_count": 35,
        "trend": "up"
      }
    ],
    "catalog": {
      "id": "uuid",
      "name": "Default Catalog",
      "metric_count": 356
    }
  }
}`}
          </Box>
        </SubSection>

        <SubSection title="Get Function Score Detail">
          <Box component="pre" sx={codeBlockStyles}>
{`GET /scores/functions/{function_code}
GET /scores/categories`}
          </Box>
        </SubSection>
      </Section>

      <Section title="AI Router (/api/v1/ai)">
        <SubSection title="Chat with AI">
          <Box component="pre" sx={codeBlockStyles}>
{`POST /ai/chat
Content-Type: application/json

{
  "mode": "metrics",  // metrics, explain, report, recommendations, enhance
  "prompt": "Create a metric for tracking patch compliance",
  "context": {
    "function": "PROTECT",
    "user_id": "uuid"
  }
}`}
          </Box>
        </SubSection>

        <SubSection title="Enhance Metrics">
          <Box component="pre" sx={codeBlockStyles}>
{`POST /ai/enhance

{
  "catalog_items": [
    {"name": "patch compliance", "description": "patches", "target_value": 100}
  ],
  "enhancement_types": ["clarity", "targets", "priority"]
}`}
          </Box>
        </SubSection>

        <SubSection title="Get AI Change Log">
          <Box component="pre" sx={codeBlockStyles}>{`GET /ai/changelog`}</Box>
        </SubSection>
      </Section>

      <Section title="Catalogs Router (/api/v1/catalogs)">
        <SubSection title="Catalog Operations">
          <Box component="pre" sx={codeBlockStyles}>
{`GET    /catalogs              - List catalogs
POST   /catalogs              - Create catalog
GET    /catalogs/{id}         - Get catalog
PATCH  /catalogs/{id}         - Update catalog
DELETE /catalogs/{id}         - Delete catalog
POST   /catalogs/{id}/activate - Activate catalog
GET    /catalogs/active/metrics - Get active catalog metrics
POST   /catalogs/{id}/import   - Import catalog items (CSV)`}
          </Box>
        </SubSection>
      </Section>

      <Section title="CSF Router (/api/v1/csf)">
        <Box component="pre" sx={codeBlockStyles}>
{`GET  /csf/functions      - Get CSF functions
GET  /csf/categories      - Get CSF categories (filter by function)
GET  /csf/subcategories   - Get CSF subcategories (filter by category)
POST /csf/validate        - Validate CSF mapping`}
        </Box>
      </Section>

      <Section title="Frameworks Router (/api/v1/frameworks)">
        <Box component="pre" sx={codeBlockStyles}>
{`GET /frameworks                          - List frameworks
GET /frameworks/{id}                     - Get framework
GET /frameworks/{id}/functions           - Get framework functions
GET /frameworks/{id}/functions/{code}/categories - Get categories`}
        </Box>
      </Section>

      <Section title="Error Codes">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Code</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>HTTP Status</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>VALIDATION_ERROR</code></td><td>400</td><td>Invalid request data</td></tr>
            <tr><td><code>NOT_FOUND</code></td><td>404</td><td>Resource not found</td></tr>
            <tr><td><code>UNAUTHORIZED</code></td><td>401</td><td>Missing/invalid authentication</td></tr>
            <tr><td><code>FORBIDDEN</code></td><td>403</td><td>Insufficient permissions</td></tr>
            <tr><td><code>CONFLICT</code></td><td>409</td><td>Resource conflict (e.g., duplicate)</td></tr>
            <tr><td><code>RATE_LIMITED</code></td><td>429</td><td>Too many requests</td></tr>
            <tr><td><code>AI_ERROR</code></td><td>502</td><td>AI service error</td></tr>
            <tr><td><code>INTERNAL_ERROR</code></td><td>500</td><td>Unexpected server error</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Rate Limiting">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Endpoint Type</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Limit</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Standard endpoints</td><td>100 req/min</td></tr>
            <tr><td>AI endpoints</td><td>20 req/min</td></tr>
            <tr><td>Export endpoints</td><td>10 req/min</td></tr>
          </tbody>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          For full interactive API documentation, visit <a href="http://localhost:8002/docs" target="_blank" rel="noopener noreferrer">http://localhost:8002/docs</a> (Swagger UI)
        </Typography>
      </Section>
    </Box>
  );
}

function DatabaseSchemaContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Database Schema</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Documentation of the PostgreSQL database schema, models, relationships, and migrations for MetricFrame.
      </Typography>

      <Section title="Entity Relationship Diagram">
        <Box component="pre" sx={codeBlockStyles}>
{`┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRAMEWORK HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  frameworks ──< framework_functions ──< framework_categories                │
│                                             └──< framework_subcategories    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              METRICS SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  metrics ──< metric_history                                                  │
│     └─────────> metric_catalogs <───── users (active_catalog_id)            │
│                      └──< metric_catalog_items                              │
│                               └──< metric_catalog_framework_mappings        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPPORTING TABLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ai_change_log    |    function_scores    |    framework_scores             │
└─────────────────────────────────────────────────────────────────────────────┘`}
        </Box>
      </Section>

      <Section title="Metrics Table">
        <Typography variant="body2" paragraph>Core table storing all security metrics.</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Column</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Type</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>id</code></td><td>UUID</td><td>Primary key</td></tr>
            <tr><td><code>metric_number</code></td><td>VARCHAR(20)</td><td>Display number (PR-001)</td></tr>
            <tr><td><code>name</code></td><td>VARCHAR(200)</td><td>Metric name</td></tr>
            <tr><td><code>description</code></td><td>TEXT</td><td>Detailed description</td></tr>
            <tr><td><code>current_value</code></td><td>DECIMAL(15,4)</td><td>Current measured value</td></tr>
            <tr><td><code>target_value</code></td><td>DECIMAL(15,4)</td><td>Target/goal value</td></tr>
            <tr><td><code>target_lower</code></td><td>DECIMAL(15,4)</td><td>Lower bound (for ranges)</td></tr>
            <tr><td><code>target_upper</code></td><td>DECIMAL(15,4)</td><td>Upper bound (for ranges)</td></tr>
            <tr><td><code>unit</code></td><td>VARCHAR(50)</td><td>Unit of measurement</td></tr>
            <tr><td><code>direction</code></td><td>ENUM</td><td>higher_is_better, lower_is_better, target_range, binary</td></tr>
            <tr><td><code>csf_function</code></td><td>VARCHAR(10)</td><td>CSF function code (indexed)</td></tr>
            <tr><td><code>csf_category</code></td><td>VARCHAR(20)</td><td>CSF category code (indexed)</td></tr>
            <tr><td><code>priority</code></td><td>ENUM</td><td>High, Medium, Low</td></tr>
            <tr><td><code>is_locked</code></td><td>BOOLEAN</td><td>Prevent edits</td></tr>
            <tr><td><code>catalog_id</code></td><td>UUID (FK)</td><td>FK to metric_catalogs</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Metric Catalogs Table">
        <Typography variant="body2" paragraph>Custom metric catalog definitions.</Typography>
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Column</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Type</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>id</code></td><td>UUID</td><td>Primary key</td></tr>
            <tr><td><code>name</code></td><td>VARCHAR(200)</td><td>Catalog name</td></tr>
            <tr><td><code>description</code></td><td>TEXT</td><td>Catalog description</td></tr>
            <tr><td><code>owner_id</code></td><td>UUID (FK)</td><td>FK to users</td></tr>
            <tr><td><code>is_active</code></td><td>BOOLEAN</td><td>Currently active for owner</td></tr>
            <tr><td><code>source_file</code></td><td>VARCHAR(500)</td><td>Original import filename</td></tr>
            <tr><td><code>import_metadata</code></td><td>JSONB</td><td>Import details</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Framework Tables">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Table</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Key Columns</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>frameworks</code></td><td>id, name, version, description, is_active</td><td>Supported security frameworks</td></tr>
            <tr><td><code>framework_functions</code></td><td>id, framework_id, code, name, sort_order</td><td>Functions within frameworks</td></tr>
            <tr><td><code>framework_categories</code></td><td>id, function_id, code, name, sort_order</td><td>Categories within functions</td></tr>
            <tr><td><code>framework_subcategories</code></td><td>id, category_id, code, description</td><td>Subcategories within categories</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Supporting Tables">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Table</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>metric_history</code></td><td>Time series data: metric_id, value, recorded_at, note</td></tr>
            <tr><td><code>metric_catalog_items</code></td><td>Individual metrics within catalogs with original_data (JSONB)</td></tr>
            <tr><td><code>metric_catalog_framework_mappings</code></td><td>Framework mappings for catalog items with confidence scores</td></tr>
            <tr><td><code>users</code></td><td>User accounts: username, email, active_catalog_id, preferences</td></tr>
            <tr><td><code>ai_change_log</code></td><td>Audit trail: timestamp, action, prompt, result, ai_provider, tokens_used</td></tr>
            <tr><td><code>function_scores</code></td><td>Cached function scores with calculated_at timestamp</td></tr>
            <tr><td><code>framework_scores</code></td><td>Overall framework scores with function breakdown (JSONB)</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Key Indices">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Table</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Index</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Purpose</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>metrics</td><td>idx_metrics_function</td><td>Filter by function</td></tr>
            <tr><td>metrics</td><td>idx_metrics_category</td><td>Filter by category</td></tr>
            <tr><td>metrics</td><td>idx_metrics_catalog</td><td>Catalog filtering</td></tr>
            <tr><td>metric_history</td><td>idx_history_metric_date</td><td>Time series queries</td></tr>
            <tr><td>ai_change_log</td><td>idx_changelog_date</td><td>Audit queries</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Migrations (Alembic)">
        <Box component="pre" sx={codeBlockStyles}>
{`# Generate new migration from model changes
cd backend
alembic revision --autogenerate -m "Description of change"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history`}
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}><strong>Best Practices:</strong></Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>Always generate from models using <code>--autogenerate</code></li>
          <li>Review generated migrations before applying</li>
          <li>Test rollback - ensure <code>downgrade()</code> works</li>
          <li>Keep migrations small - one logical change per migration</li>
          <li>Never edit applied migrations - create new ones instead</li>
        </Box>
      </Section>
    </Box>
  );
}

function DevelopmentGuideContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Development Guide</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Complete guide for setting up a development environment and contributing to MetricFrame.
      </Typography>

      <Section title="Prerequisites">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Tool</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Version</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Notes</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Docker</td><td>24.x+</td><td>Required for containerized setup</td></tr>
            <tr><td>Docker Compose</td><td>2.x+</td><td>Included with Docker Desktop</td></tr>
            <tr><td>Node.js</td><td>20.x+</td><td>Optional for frontend dev</td></tr>
            <tr><td>Python</td><td>3.11+</td><td>Optional for backend dev</td></tr>
            <tr><td>Poetry</td><td>1.x+</td><td>Python dependency management</td></tr>
            <tr><td>Git</td><td>2.30+</td><td>Version control</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Quick Setup (Docker)">
        <Box component="pre" sx={codeBlockStyles}>
{`# Clone repository
git clone https://github.com/automationacct01/metric_frame.git
cd metric_frame

# Copy environment file
cp backend/.env.example backend/.env

# Start all services
./dev.sh`}
        </Box>
      </Section>

      <Section title="Local Development (Without Docker)">
        <SubSection title="Backend Setup">
          <Box component="pre" sx={codeBlockStyles}>
{`cd backend

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
uvicorn src.main:app --reload --port 8002`}
          </Box>
        </SubSection>

        <SubSection title="Frontend Setup">
          <Box component="pre" sx={codeBlockStyles}>
{`cd frontend

# Install dependencies
npm install

# Start development server
npm run dev`}
          </Box>
        </SubSection>

        <SubSection title="Database Setup">
          <Box component="pre" sx={codeBlockStyles}>
{`# Start PostgreSQL (Docker)
docker run -d \\
  --name metricframe_db \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=postgres \\
  -e POSTGRES_DB=metricframe \\
  -p 5432:5432 \\
  postgres:15`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Project Structure">
        <Box component="pre" sx={codeBlockStyles}>
{`metric_frame/
├── backend/
│   ├── src/
│   │   ├── main.py           # FastAPI application entry
│   │   ├── config.py         # Configuration management
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── schemas.py        # Pydantic validation schemas
│   │   ├── database.py       # Database connection
│   │   ├── routers/
│   │   │   ├── metrics.py    # Metrics CRUD endpoints
│   │   │   ├── scores.py     # Score calculation endpoints
│   │   │   ├── ai.py         # AI assistant endpoints
│   │   │   ├── catalogs.py   # Catalog management
│   │   │   └── frameworks.py # Multi-framework support
│   │   ├── services/
│   │   │   ├── scoring.py    # Score calculation logic
│   │   │   ├── ai_client.py  # AI provider integration
│   │   │   └── csf_reference.py
│   │   └── seeds/
│   │       └── seed_metrics.py
│   ├── alembic/              # Migration files
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Root component
│   │   ├── components/       # UI components
│   │   ├── api/              # API client
│   │   ├── types/            # TypeScript definitions
│   │   └── hooks/
├── docker/
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── wiki/                     # Documentation
└── dev.sh                    # Development startup script`}
        </Box>
      </Section>

      <Section title="Adding New Features">
        <SubSection title="Backend Feature Workflow">
          <Box component="ol" sx={{ pl: 3 }}>
            <li><strong>Define schema</strong> in <code>schemas.py</code></li>
            <li><strong>Create/update model</strong> in <code>models.py</code></li>
            <li><strong>Generate migration:</strong> <code>alembic revision --autogenerate -m "description"</code></li>
            <li><strong>Apply migration:</strong> <code>alembic upgrade head</code></li>
            <li><strong>Implement service</strong> logic in <code>services/</code></li>
            <li><strong>Create router</strong> endpoints in <code>routers/</code></li>
            <li><strong>Register router</strong> in <code>main.py</code></li>
            <li><strong>Write tests</strong> in <code>tests/</code></li>
          </Box>
        </SubSection>

        <SubSection title="Frontend Feature Workflow">
          <Box component="ol" sx={{ pl: 3 }}>
            <li><strong>Define types</strong> in <code>types/</code></li>
            <li><strong>Extend API client</strong> if new endpoints</li>
            <li><strong>Create/update hook</strong> for data fetching</li>
            <li><strong>Build component</strong> in <code>components/</code></li>
            <li><strong>Add to routing</strong> if new page</li>
            <li><strong>Write tests</strong> with React Testing Library</li>
          </Box>
        </SubSection>
      </Section>

      <Section title="Testing">
        <SubSection title="Backend Tests">
          <Box component="pre" sx={codeBlockStyles}>
{`cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_scoring.py

# Run specific test
pytest tests/test_scoring.py::test_higher_is_better`}
          </Box>
        </SubSection>

        <SubSection title="Frontend Tests">
          <Box component="pre" sx={codeBlockStyles}>
{`cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Debugging Tips">
        <SubSection title="Backend Debugging">
          <Box component="pre" sx={codeBlockStyles}>
{`# Run with auto-reload and debug logging
uvicorn src.main:app --reload --log-level debug

# Add debug logging in code
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Processing metric: {metric.id}")`}
          </Box>
        </SubSection>

        <SubSection title="Database Debugging">
          <Box component="pre" sx={codeBlockStyles}>
{`# Connect to PostgreSQL
docker exec -it metricframe_db psql -U postgres -d metricframe

# Useful queries
SELECT * FROM metrics LIMIT 10;
SELECT csf_function, COUNT(*) FROM metrics GROUP BY csf_function;`}
          </Box>
        </SubSection>
      </Section>
    </Box>
  );
}

function TroubleshootingContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>Troubleshooting</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Solutions to common issues and problems when using MetricFrame.
      </Typography>

      <Section title="Connection Issues">
        <SubSection title="Backend Not Starting">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> API returns connection refused, Port 8002 not responding</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# Check Docker containers
docker compose ps
# Verify 'api' container is running

# Check logs
docker compose logs api

# Verify port availability
lsof -i :8002
# Kill any conflicting process

# Restart backend
docker compose restart api`}
          </Box>
        </SubSection>

        <SubSection title="Frontend Not Loading">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> Blank page at localhost:5175, Vite errors in console</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# Check container
docker compose logs web

# Verify npm dependencies
cd frontend
rm -rf node_modules
npm install

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
# Or clear site data in DevTools`}
          </Box>
        </SubSection>

        <SubSection title="Database Connection Failed">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> "Connection refused" errors, "Database does not exist" errors</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# Check database container
docker compose ps db
docker compose logs db

# Verify connection string in backend/.env
DATABASE_URL=postgresql://postgres:postgres@db:5432/metricframe

# Recreate database
docker compose down -v
docker compose up -d db
# Wait for db to start
docker compose up -d api

# Test connection
docker exec -it metricframe_db psql -U postgres -d metricframe -c "SELECT 1"`}
          </Box>
        </SubSection>
      </Section>

      <Section title="AI Integration Issues">
        <SubSection title="AI Assistant Not Responding">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> AI chat returns errors, Timeout messages, Empty responses</Typography>
          <Typography variant="body2" paragraph><strong>Solutions:</strong></Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <li><strong>Verify AI configuration:</strong> Go to Settings → AI Configuration, ensure a provider is configured and activated, click "Validate" to test credentials</li>
            <li><strong>Check provider status:</strong> Look for green "Validated" badge, ensure provider shows as "Active"</li>
            <li><strong>Check rate limits:</strong> Wait if rate limited, check your provider's dashboard for usage</li>
            <li><strong>Increase timeout:</strong> Set <code>AI_TIMEOUT=60</code> in backend/.env</li>
          </Box>
        </SubSection>

        <SubSection title="AI Mapping Errors">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> CSF mapping suggestions fail, Enhancement endpoint returns errors</Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <li>Check request format - ensure metrics have name field</li>
            <li>Reduce batch size - process fewer metrics at once (max 50 per request)</li>
            <li>Check logs: <code>docker compose logs api | grep -i "ai"</code></li>
          </Box>
        </SubSection>
      </Section>

      <Section title="Database Issues">
        <SubSection title="Migration Failures">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> "Target database is not up to date" errors, "Can't locate revision" errors</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`cd backend

# Check current state
alembic current

# View history
alembic history

# Force upgrade
alembic stamp head
alembic upgrade head

# Reset migrations (development only)
docker compose down -v
docker compose up -d db
alembic upgrade head`}
          </Box>
        </SubSection>

        <SubSection title="Seeding Failures">
          <Typography variant="body2" paragraph><strong>Symptoms:</strong> "Relation does not exist" errors, Missing metrics after startup</Typography>
          <Box component="pre" sx={codeBlockStyles}>
{`# Run migrations first
alembic upgrade head

# Re-run seed
python -m src.seeds.seed_metrics

# Check for existing data
docker exec -it metricframe_db psql -U postgres -d metricframe \\
  -c "SELECT COUNT(*) FROM metrics"`}
          </Box>
        </SubSection>
      </Section>

      <Section title="Common Error Messages">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Error</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Cause & Solution</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>"Metric not found"</td><td>Metric deleted or non-existent - verify metric ID exists, refresh metrics list</td></tr>
            <tr><td>"Catalog activation failed"</td><td>Ensure catalog has at least one metric, check user permissions</td></tr>
            <tr><td>"Invalid CSF mapping"</td><td>Function/category combination doesn't exist - use CSF validation endpoint first</td></tr>
            <tr><td>"Score calculation failed"</td><td>Missing current_value or target_value, check direction type is valid</td></tr>
            <tr><td>"Import validation error"</td><td>Check CSV encoding (use UTF-8), verify required columns, remove special characters</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Diagnostic Commands">
        <Box component="pre" sx={codeBlockStyles}>
{`# Full system status
docker compose ps
docker compose logs --tail=50

# Backend health
curl http://localhost:8002/health

# Database connectivity
docker exec metricframe_db pg_isready

# Container resource usage
docker stats --no-stream`}
        </Box>
      </Section>

      <Section title="Getting Help">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Resource</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Location</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>This Documentation</td><td>In-app documentation viewer</td></tr>
            <tr><td>API Docs</td><td><a href="http://localhost:8002/docs" target="_blank" rel="noopener noreferrer">http://localhost:8002/docs</a></td></tr>
            <tr><td>GitHub Wiki</td><td>wiki/ directory in repository</td></tr>
          </tbody>
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}><strong>When reporting issues, include:</strong></Typography>
        <Box component="ol" sx={{ pl: 3 }}>
          <li>Environment: Operating system, Docker version, Browser</li>
          <li>Steps to reproduce: Exact sequence of actions</li>
          <li>Logs: <code>docker compose logs &gt; logs.txt</code></li>
          <li>Screenshots of error messages or unexpected UI states</li>
        </Box>
      </Section>
    </Box>
  );
}

function UserManagementContent() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>User Management & Authentication</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        MetricFrame includes a complete role-based access control (RBAC) system for managing users and permissions.
        This guide covers user roles, authentication, password recovery, and administrative functions.
      </Typography>

      <Section title="User Roles">
        <Typography variant="body1" paragraph>
          The system supports three user roles with different permission levels:
        </Typography>

        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Role</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Description</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Access Level</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Admin</strong></td><td>Full system access</td><td>Manage users, all Editor capabilities</td></tr>
            <tr><td><strong>Editor</strong></td><td>Read/write access</td><td>Edit metrics, manage catalogs, use AI</td></tr>
            <tr><td><strong>Viewer</strong></td><td>Read-only access</td><td>View dashboards and metrics</td></tr>
          </tbody>
        </Box>

        <SubSection title="Permissions Matrix">
          <Box component="table" sx={tableStyles}>
            <thead>
              <tr>
                <Box component="th" sx={{ fontWeight: 600 }}>Feature</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Admin</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Editor</Box>
                <Box component="th" sx={{ fontWeight: 600 }}>Viewer</Box>
              </tr>
            </thead>
            <tbody>
              <tr><td>View Dashboard</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>View Metrics</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Export Data</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>Edit Metrics</td><td>Yes</td><td>Yes</td><td>No</td></tr>
              <tr><td>Manage Catalogs</td><td>Yes</td><td>Yes</td><td>No</td></tr>
              <tr><td>Use AI Features</td><td>Yes</td><td>Yes</td><td>No</td></tr>
              <tr><td>Invite Users</td><td>Yes</td><td>No</td><td>No</td></tr>
              <tr><td>Manage Roles</td><td>Yes</td><td>No</td><td>No</td></tr>
              <tr><td>Reset Passwords</td><td>Yes</td><td>No</td><td>No</td></tr>
              <tr><td>Delete Users</td><td>Yes</td><td>No</td><td>No</td></tr>
            </tbody>
          </Box>
        </SubSection>
      </Section>

      <Section title="First-Time Setup">
        <Typography variant="body1" paragraph>
          When no users exist, the first visitor sees a registration form. The first user automatically becomes an Admin.
        </Typography>

        <SubSection title="Register First Admin">
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Navigate to the application</li>
            <li>Fill in the registration form:
              <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                <li><strong>Name</strong>: Your display name</li>
                <li><strong>Email</strong>: Your email address</li>
                <li><strong>Password</strong>: Create a strong password</li>
                <li><strong>Security Questions</strong>: Select and answer 2 questions</li>
              </Box>
            </li>
            <li>Click <strong>Register</strong></li>
            <li><strong>Save Your Recovery Key</strong>: A 24-character key is displayed (format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)</li>
          </Box>

          <Box sx={{ bgcolor: '#fff3cd', border: '1px solid #ffc107', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#333' }}>
              <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>IMPORTANT:</Box> Save your recovery key immediately - it is only shown once!
              This key can be used for password recovery if you forget your security question answers.
            </Typography>
          </Box>
        </SubSection>
      </Section>

      <Section title="Inviting Users">
        <Typography variant="body1" paragraph>
          Only Admins can invite new users to the system.
        </Typography>

        <SubSection title="Send an Invitation">
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Navigate to <strong>Settings &gt; User Management</strong></li>
            <li>Click <strong>Invite User</strong></li>
            <li>Enter the user's email address</li>
            <li>Select their role:
              <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                <li><strong>Viewer</strong> - for stakeholders who only need to view dashboards</li>
                <li><strong>Editor</strong> - for team members who manage metrics</li>
                <li><strong>Admin</strong> - for other administrators</li>
              </Box>
            </li>
            <li>Click <strong>Send Invitation</strong></li>
          </Box>
        </SubSection>

        <SubSection title="Accepting an Invitation">
          <Typography variant="body1" paragraph>
            When an invited user visits the app, they see a registration form with their email pre-filled.
            They set their name and password, then gain access with their assigned role.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Note: Invited users do not set security questions - only the first admin does.
          </Typography>
        </SubSection>
      </Section>

      <Section title="Managing Users">
        <Typography variant="body1" paragraph>
          Navigate to <strong>Settings &gt; User Management</strong> to manage users.
        </Typography>

        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Action</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Steps</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Change User Role</td><td>Click the Role dropdown, select new role, confirm</td></tr>
            <tr><td>Deactivate User</td><td>Toggle the Active switch to Off (user can no longer log in)</td></tr>
            <tr><td>Reactivate User</td><td>Toggle the Active switch back to On</td></tr>
            <tr><td>Delete User</td><td>Click Delete button, confirm (permanent)</td></tr>
            <tr><td>Reset Password</td><td>Click Reset Password, enter temporary password</td></tr>
          </tbody>
        </Box>
      </Section>

      <Section title="Password Recovery">
        <Typography variant="body1" paragraph>
          Two methods are available for password recovery:
        </Typography>

        <SubSection title="Method 1: Recovery Key">
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Click <strong>Forgot Password</strong> on the login page</li>
            <li>Select the <strong>Recovery Key</strong> tab</li>
            <li>Enter your email address</li>
            <li>Enter your 24-character recovery key</li>
            <li>Set a new password</li>
          </Box>
        </SubSection>

        <SubSection title="Method 2: Security Questions">
          <Box component="ol" sx={{ pl: 3 }}>
            <li>Click <strong>Forgot Password</strong> on the login page</li>
            <li>Select the <strong>Security Questions</strong> tab</li>
            <li>Enter your email address</li>
            <li>Answer your two security questions</li>
            <li>Set a new password</li>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Note: Answers are case-insensitive.
          </Typography>
        </SubSection>
      </Section>

      <Section title="Changing Your Password">
        <Box component="ol" sx={{ pl: 3 }}>
          <li>Navigate to <strong>Settings &gt; Account</strong></li>
          <li>Enter your current password</li>
          <li>Enter your new password</li>
          <li>Confirm the new password</li>
          <li>Click <strong>Update Password</strong></li>
        </Box>
      </Section>

      <Section title="Security Best Practices">
        <Box component="ul" sx={{ pl: 3 }}>
          <li><strong>Save your recovery key</strong> in a secure location</li>
          <li><strong>Choose strong passwords</strong> (mix of letters, numbers, symbols)</li>
          <li><strong>Use unique passwords</strong> for this application</li>
          <li><strong>Don't share credentials</strong> - invite additional users instead</li>
          <li><strong>Review user list regularly</strong> and remove unused accounts</li>
          <li><strong>Use minimal permissions</strong> - assign Viewer unless Edit access is needed</li>
        </Box>
      </Section>

      <Section title="Troubleshooting">
        <Box component="table" sx={tableStyles}>
          <thead>
            <tr>
              <Box component="th" sx={{ fontWeight: 600 }}>Issue</Box>
              <Box component="th" sx={{ fontWeight: 600 }}>Solution</Box>
            </tr>
          </thead>
          <tbody>
            <tr><td>Can't log in</td><td>Verify email, check if account is active, try password recovery</td></tr>
            <tr><td>Recovery key not working</td><td>Ensure all 24 characters entered, check for typos (0 vs O)</td></tr>
            <tr><td>Security questions not accepted</td><td>Answers are case-insensitive, check for extra spaces</td></tr>
            <tr><td>Locked out completely</td><td>Another Admin can reset your password or delete/re-invite your account</td></tr>
          </tbody>
        </Box>
      </Section>
    </Box>
  );
}
