# Security Architecture

> **Last Updated:** February 2026

---

## Overview

MetricFrame is designed with security as a core principle. This document explains the network architecture, data flow, and security measures that protect your data and API credentials.

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR COMPUTER (localhost)                                  │
│                                                             │
│  Browser ──HTTP──► Frontend ──HTTP──► Backend ──► Redis     │
│  (localhost:3000)   (nginx)          (FastAPI)   (sessions) │
│                                           │                 │
└───────────────────────────────────────────│─────────────────┘
                                            │
                                            ▼ HTTPS (TLS 1.3 encrypted)
                                    ┌───────────────────┐
                                    │   INTERNET        │
                                    │                   │
                                    │ api.openai.com    │
                                    │ api.anthropic.com │
                                    │ api.together.xyz  │
                                    │ (other AI APIs)   │
                                    └───────────────────┘
```

### Key Points

| Traffic Type | Protocol | Encrypted | Leaves Computer |
|--------------|----------|-----------|-----------------|
| Browser → Frontend | HTTP | No* | No |
| Frontend → Backend | HTTP | No* | No |
| Backend → Redis | TCP | No* | No |
| Backend → AI APIs | HTTPS | Yes (TLS 1.3) | Yes |

*Local HTTP/TCP traffic never leaves your machine - see explanation below.

## Why Local HTTP is Secure

### The Loopback Interface

When you access `localhost:3000`, your browser communicates with the app through your computer's **loopback interface** (127.0.0.1). This traffic:

1. **Never touches the network** - It stays entirely within your computer's memory
2. **Cannot be intercepted** - No external device can see loopback traffic
3. **Is isolated by design** - The operating system prevents loopback traffic from leaving the machine

This is fundamentally different from HTTP traffic over a network, which can be intercepted.

### Why TLS on Localhost is Unnecessary

Adding HTTPS/TLS for localhost would require:
- Self-signed certificates (causing browser warnings)
- Certificate management complexity
- No actual security benefit for local-only traffic

The security industry consensus is that localhost HTTP is acceptable for local development and self-hosted applications.

## Outbound API Calls (The Internet Connection)

The **only traffic that reaches the internet** is from the backend to AI provider APIs. This connection is:

### Always Encrypted

```python
# The Python SDK libraries enforce HTTPS
from anthropic import Anthropic
client = Anthropic(api_key="...")
# All requests go to https://api.anthropic.com (TLS encrypted)
```

The official Python SDKs for OpenAI, Anthropic, Together.ai, and other providers:
- Only accept HTTPS connections
- Verify SSL certificates by default
- Use TLS 1.3 when available
- Reject unencrypted connections

### What Gets Sent

When you use the AI Assistant, only the following leaves your computer:

| Data Sent | Encrypted |
|-----------|-----------|
| Your prompt/question | Yes (TLS) |
| Your API key (in header) | Yes (TLS) |
| Context from your metrics | Yes (TLS) |

### What Never Leaves

| Data | Reason |
|------|--------|
| Your database | Local PostgreSQL only |
| Your passwords | Stored locally with bcrypt |
| Full metrics catalog | Only relevant context sent to AI |
| User information | Never transmitted |

## API Key Security

### Storage

Your AI API keys are protected through multiple layers:

1. **Fernet Encryption**: Keys are encrypted before storage using the `cryptography` library
2. **Master Key**: A unique master encryption key is generated for your deployment
3. **Local Storage**: Encrypted keys stored in PostgreSQL (never in plaintext)

```
User enters API key → Fernet encryption → Stored in database
                                              ↓
Database retrieval → Fernet decryption → Used for API call
                                              ↓
                                    Sent via HTTPS to API provider
```

### Key Handling Best Practices

| Practice | Implementation |
|----------|----------------|
| Encryption at rest | Fernet symmetric encryption |
| No logging | API keys excluded from logs |
| Memory handling | Keys cleared after use |
| HTTPS only | Keys only sent over TLS |

## Session Storage

MetricFrame uses Redis for session storage in production deployments, enabling multiple backend workers to share session state.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Production (4 uvicorn workers)                             │
│                                                             │
│  Worker 1 ─┐                                                │
│  Worker 2 ─┼──► Redis (6379) ◄── All sessions shared        │
│  Worker 3 ─┤                                                │
│  Worker 4 ─┘                                                │
└─────────────────────────────────────────────────────────────┘
```

### Session Data

| Field | Description |
|-------|-------------|
| `email` | User identifier |
| `created_at` | Session creation timestamp |
| `last_accessed` | Last activity (for TTL) |

### Security Features

| Feature | Implementation |
|---------|----------------|
| **Token Generation** | `secrets.token_urlsafe(32)` - 256 bits of entropy |
| **Session TTL** | 24-hour sliding window (configurable) |
| **Automatic Expiration** | Redis native TTL handles cleanup |
| **Bulk Invalidation** | All user sessions revoked on password change/deactivation |
| **Graceful Fallback** | In-memory storage if Redis unavailable |

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | (none) | Redis connection URL. If not set, uses in-memory storage |
| `SESSION_TTL_HOURS` | 24 | Session expiration time in hours |

## Port Selection: Why 3000?

MetricFrame uses port 3000 for the web interface:

| Reason | Explanation |
|--------|-------------|
| **Non-privileged** | Ports above 1024 don't require root/admin access |
| **Industry standard** | React, Next.js, Node.js apps commonly use 3000 |
| **Not externally exposed** | By default, only accessible on localhost |
| **Memorable** | Easy to remember and type |

### Avoiding Common Ports

We deliberately avoid:
- **Port 80**: Privileged, associated with unencrypted web traffic
- **Port 443**: Requires TLS certificates
- **Port 8080**: Often used by proxies, may conflict

## Data Privacy

### 100% Local Deployment

MetricFrame runs entirely on your infrastructure:

- **No cloud dependencies** (except optional AI APIs you configure)
- **No phone home** - We don't receive any data from your installation
- **No telemetry** - No usage tracking, analytics, or monitoring
- **No accounts required** - No registration with us needed

### What We Never See

| Data | Status |
|------|--------|
| Your metrics | Never leaves your system |
| Your API keys | Encrypted locally, never transmitted to us |
| Your users | Managed entirely by you |
| Your usage | No tracking or analytics |
| Your IP address | No connections to our servers |

## Security Headers

The nginx configuration includes standard security headers:

```nginx
X-Frame-Options: SAMEORIGIN           # Prevents clickjacking
X-Content-Type-Options: nosniff       # Prevents MIME sniffing
X-XSS-Protection: 1; mode=block       # XSS filter
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: [configured for React app]
```

## Role-Based Access Control

MetricFrame implements role-based security:

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access, user management, system configuration |
| **Editor** | Create/modify metrics, use AI features |
| **Viewer** | Read-only access, AI explanations and reports only |

See [User Management](user-management.md) for details.

## Recommendations for Production Deployment

If deploying MetricFrame on a server accessible by multiple users:

### For Local Network (Intranet)

1. Keep using HTTP on port 3000
2. Ensure firewall blocks external access
3. Use network-level authentication if needed

### For Internet-Facing Deployment

1. Place behind a reverse proxy (nginx, Traefik, Caddy)
2. Configure HTTPS with proper certificates (Let's Encrypt)
3. Use a VPN or zero-trust network
4. Implement additional authentication layers

## Deployment-Specific Security

### Docker Deployment

Docker deployment is designed for multi-user team environments:

| Feature | Implementation |
|---------|----------------|
| **Session Storage** | Redis-backed for multi-worker consistency |
| **Database** | PostgreSQL with persistent volumes |
| **Workers** | 4 uvicorn workers behind nginx |
| **Port** | 3000 (configurable) |
| **Container Isolation** | Services run in isolated containers |

**Security Considerations:**
- Sessions persist across container restarts (Redis AOF persistence)
- All workers share session state via Redis
- Database credentials in environment variables (use secrets in production)
- Network isolation via Docker bridge network

### Desktop App

The desktop app is optimized for single-user local use:

| Feature | Implementation |
|---------|----------------|
| **Session Storage** | In-memory (single process) |
| **Database** | SQLite (local file) |
| **Workers** | Single uvicorn process |
| **Port** | Dynamic (Electron-managed) |
| **Isolation** | OS-level process isolation |

**Security Considerations:**
- No Redis required - sessions stored in process memory
- Database file stored in user's application data directory
- API keys encrypted in SQLite using same Fernet encryption
- No network exposure - Electron manages all connections
- Session persists only while app is running

### Comparison

| Aspect | Docker | Desktop |
|--------|--------|---------|
| Multi-user support | Yes | No (single user) |
| Session persistence | Redis (survives restarts) | Memory (cleared on close) |
| Database | PostgreSQL | SQLite |
| Network access | Configurable | Localhost only |
| AI API calls | HTTPS to providers | HTTPS to providers |
| API key storage | Encrypted in PostgreSQL | Encrypted in SQLite |

## Summary

| Component | Security Measure |
|-----------|-----------------|
| Local traffic | Isolated on loopback interface |
| AI API calls | TLS 1.3 encryption |
| API keys | Fernet encryption at rest |
| Passwords | bcrypt hashing |
| Sessions | Redis (Docker) / In-memory (Desktop) |
| Access control | Role-based permissions |
| Web security | Standard security headers |

---

**Questions?** See [Troubleshooting](troubleshooting.md) or open an issue on GitHub.
