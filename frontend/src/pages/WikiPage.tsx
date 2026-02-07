import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Button,
  Divider,
  alpha,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
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
  Security as SecurityIcon,
  Code as DevIcon,
  BugReport as TroubleshootIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

// Load all wiki markdown files at build time
// Files are copied from repo root wiki/ into src/wiki-md/ by the prebuild script
const wikiModules = import.meta.glob('../wiki-md/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// Build lookup: page id → markdown content
const wikiContent: Record<string, string> = {};
for (const [path, content] of Object.entries(wikiModules)) {
  // path is like "../wiki-md/getting-started.md" → extract "getting-started"
  const match = path.match(/\/([^/]+)\.md$/);
  if (match) {
    wikiContent[match[1]] = content;
  }
}

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
  anchor?: string;
}

interface NavCategory {
  name: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    name: 'Getting Started',
    items: [
      { id: 'getting-started', title: 'Quick Setup', icon: StartIcon },
      { id: 'how-it-works', title: 'How It Works', icon: ArchitectureIcon },
    ],
  },
  {
    name: 'User Guide',
    items: [
      { id: 'dashboard', title: 'Dashboard', icon: DashboardIcon },
      { id: 'metrics-management', title: 'Metrics Management', icon: MetricsIcon },
      { id: 'user-management', title: 'User Management', icon: UserManagementIcon },
      { id: 'ai-assistant', title: 'AI Assistant', icon: AIIcon },
    ],
  },
  {
    name: 'Reference',
    items: [
      { id: 'security', title: 'Security', icon: SecurityIcon },
      { id: 'scoring-methodology', title: 'Scoring Methodology', icon: ScoringIcon },
      { id: 'frameworks-reference', title: 'Frameworks Reference', icon: FrameworkIcon },
      { id: 'api-reference', title: 'API Reference', icon: ApiIcon },
      { id: 'database-schema', title: 'Database Schema', icon: DatabaseIcon },
    ],
  },
  {
    name: 'Development',
    items: [
      { id: 'development-guide', title: 'Development Guide', icon: DevIcon },
      { id: 'troubleshooting', title: 'Troubleshooting', icon: TroubleshootIcon },
    ],
  },
];

export default function WikiPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const currentPage = pageId || 'home';
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    navCategories.map((c) => c.name)
  );

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const navigateToPage = useCallback(
    (id: string) => {
      if (id === 'home') {
        navigate('/wiki');
      } else {
        navigate(`/wiki/${id}`);
      }
    },
    [navigate]
  );

  // Handle internal wiki links in markdown
  const handleLinkClick = useCallback(
    (href: string) => {
      if (!href) return false;
      // Handle relative wiki links like "getting-started.md" or "getting-started"
      const wikiLinkMatch = href.match(/^([a-z0-9-]+)(\.md)?(?:#(.+))?$/);
      if (wikiLinkMatch) {
        const [, pageName, , anchor] = wikiLinkMatch;
        if (wikiContent[pageName]) {
          if (anchor) {
            navigate(`/wiki/${pageName}#${anchor}`);
          } else {
            navigate(`/wiki/${pageName}`);
          }
          return true;
        }
      }
      return false;
    },
    [navigate]
  );

  const markdown = wikiContent[currentPage] || '# Page Not Found\n\nThe requested documentation page does not exist.';

  // Find current page title for breadcrumb
  const getCurrentPageTitle = () => {
    if (currentPage === 'home') return 'Home';
    for (const cat of navCategories) {
      const item = cat.items.find((i) => i.id === currentPage);
      if (item) return item.title;
    }
    return currentPage;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha('#0f172a', 0.97)} 0%, ${alpha('#1e3a5f', 0.97)} 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/download')}
            sx={{ color: 'white' }}
          >
            Back to Downloads
          </Button>
          <Typography variant="body2" color={alpha('#fff', 0.4)}>
            / Documentation / {getCurrentPageTitle()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Sidebar */}
          <Box
            sx={{
              width: 260,
              flexShrink: 0,
              position: 'sticky',
              top: 24,
              height: 'fit-content',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              background: alpha('#fff', 0.04),
              border: `1px solid ${alpha('#fff', 0.08)}`,
              borderRadius: 2,
              // Scrollbar styling
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha('#fff', 0.15),
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Typography variant="h6" fontWeight={600} color="white" fontSize="1rem">
                Documentation
              </Typography>
            </Box>
            <List dense>
              {/* Home */}
              <ListItem disablePadding>
                <ListItemButton
                  selected={currentPage === 'home'}
                  onClick={() => navigateToPage('home')}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: alpha('#0ea5e9', 0.15),
                      '&:hover': { backgroundColor: alpha('#0ea5e9', 0.2) },
                    },
                    '&:hover': { backgroundColor: alpha('#fff', 0.05) },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <HomeIcon fontSize="small" sx={{ color: alpha('#fff', 0.6) }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Home"
                    primaryTypographyProps={{
                      color: currentPage === 'home' ? '#0ea5e9' : alpha('#fff', 0.8),
                      fontSize: '0.875rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
              <Divider sx={{ borderColor: alpha('#fff', 0.06), my: 0.5 }} />

              {/* Categories */}
              {navCategories.map((category) => (
                <Box key={category.name}>
                  <ListItemButton
                    onClick={() => toggleCategory(category.name)}
                    sx={{ '&:hover': { backgroundColor: alpha('#fff', 0.03) } }}
                  >
                    <ListItemText
                      primary={category.name}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: alpha('#fff', 0.5),
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    />
                    {expandedCategories.includes(category.name) ? (
                      <ExpandLess sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} />
                    ) : (
                      <ExpandMore sx={{ color: alpha('#fff', 0.3), fontSize: 18 }} />
                    )}
                  </ListItemButton>
                  <Collapse in={expandedCategories.includes(category.name)} timeout="auto">
                    <List component="div" disablePadding dense>
                      {category.items.map((item) => (
                        <ListItem key={item.id} disablePadding>
                          <ListItemButton
                            selected={currentPage === item.id}
                            onClick={() => navigateToPage(item.id)}
                            sx={{
                              pl: 3,
                              '&.Mui-selected': {
                                backgroundColor: alpha('#0ea5e9', 0.15),
                                '&:hover': { backgroundColor: alpha('#0ea5e9', 0.2) },
                              },
                              '&:hover': { backgroundColor: alpha('#fff', 0.05) },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <item.icon
                                sx={{
                                  fontSize: 18,
                                  color: currentPage === item.id ? '#0ea5e9' : alpha('#fff', 0.4),
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.title}
                              primaryTypographyProps={{
                                fontSize: '0.85rem',
                                color: currentPage === item.id ? '#0ea5e9' : alpha('#fff', 0.75),
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              ))}
            </List>
          </Box>

          {/* Main Content */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              background: alpha('#fff', 0.04),
              border: `1px solid ${alpha('#fff', 0.08)}`,
              borderRadius: 2,
              p: { xs: 3, md: 5 },
              // Markdown styling
              '& h1': {
                color: 'white',
                fontWeight: 700,
                fontSize: '2rem',
                mb: 2,
                mt: 0,
                borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
                pb: 1,
              },
              '& h2': {
                color: 'white',
                fontWeight: 600,
                fontSize: '1.5rem',
                mt: 4,
                mb: 2,
                borderBottom: `1px solid ${alpha('#fff', 0.06)}`,
                pb: 0.5,
              },
              '& h3': {
                color: alpha('#fff', 0.9),
                fontWeight: 600,
                fontSize: '1.2rem',
                mt: 3,
                mb: 1.5,
              },
              '& h4': {
                color: alpha('#fff', 0.85),
                fontWeight: 600,
                fontSize: '1rem',
                mt: 2.5,
                mb: 1,
              },
              '& p': {
                color: alpha('#fff', 0.75),
                lineHeight: 1.7,
                mb: 2,
                fontSize: '0.95rem',
              },
              '& a': {
                color: '#0ea5e9',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              },
              '& ul, & ol': {
                color: alpha('#fff', 0.75),
                pl: 3,
                mb: 2,
                '& li': { mb: 0.5, lineHeight: 1.6 },
              },
              '& blockquote': {
                borderLeft: `3px solid ${alpha('#0ea5e9', 0.5)}`,
                pl: 2,
                ml: 0,
                my: 2,
                '& p': {
                  color: alpha('#fff', 0.6),
                  fontSize: '0.9rem',
                },
              },
              '& hr': {
                border: 'none',
                borderTop: `1px solid ${alpha('#fff', 0.1)}`,
                my: 3,
              },
              '& code': {
                fontFamily: '"SF Mono", "Fira Code", "Fira Mono", monospace',
                fontSize: '0.85em',
                backgroundColor: alpha('#000', 0.3),
                color: '#0ea5e9',
                px: 0.8,
                py: 0.2,
                borderRadius: 0.5,
              },
              '& pre': {
                backgroundColor: alpha('#000', 0.4),
                border: `1px solid ${alpha('#fff', 0.08)}`,
                borderRadius: 1.5,
                p: 2.5,
                overflow: 'auto',
                mb: 2,
                '& code': {
                  backgroundColor: 'transparent',
                  color: alpha('#fff', 0.85),
                  px: 0,
                  py: 0,
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                },
              },
              '& table': {
                width: '100%',
                borderCollapse: 'collapse',
                mb: 3,
                fontSize: '0.88rem',
              },
              '& thead': {
                '& th': {
                  backgroundColor: alpha('#fff', 0.06),
                  color: alpha('#fff', 0.85),
                  fontWeight: 600,
                  textAlign: 'left',
                  px: 2,
                  py: 1.2,
                  borderBottom: `2px solid ${alpha('#fff', 0.12)}`,
                  whiteSpace: 'nowrap',
                },
              },
              '& tbody': {
                '& td': {
                  color: alpha('#fff', 0.7),
                  px: 2,
                  py: 1,
                  borderBottom: `1px solid ${alpha('#fff', 0.06)}`,
                  verticalAlign: 'top',
                },
                '& tr:hover': {
                  backgroundColor: alpha('#fff', 0.02),
                },
              },
              '& strong': {
                color: alpha('#fff', 0.9),
                fontWeight: 600,
              },
              '& img': {
                maxWidth: '100%',
                borderRadius: 1,
              },
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Override links to handle internal wiki navigation
                a: ({ href, children, ...props }) => {
                  const handleClick = (e: React.MouseEvent) => {
                    if (href && handleLinkClick(href)) {
                      e.preventDefault();
                    }
                  };
                  return (
                    <a href={href} onClick={handleClick} {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {markdown}
            </ReactMarkdown>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
