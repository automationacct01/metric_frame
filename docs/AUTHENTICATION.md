# Authentication & User Management

This document describes the Identity and Access Management (IAM) system for the NIST Cybersecurity Metrics Dashboard.

## Overview

The application uses a role-based access control (RBAC) system with three user roles, token-based authentication, and multiple password recovery options. The system is designed to work offline (no external auth providers required).

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Auth Router    │────▶│    Database     │
│  (AuthContext)  │     │  /api/v1/auth/*  │     │   (users table) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │               ┌──────────────────┐
        └──────────────▶│  Role Middleware │
                        │ (X-User-Email)   │
                        └──────────────────┘
```

## User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Admin** | Full system access | Invite users, manage roles, reset passwords, deactivate accounts, all Editor capabilities |
| **Editor** | Read/write access | Create/edit metrics, manage catalogs, use AI features, all Viewer capabilities |
| **Viewer** | Read-only access | View dashboards, view metrics, export data |

### Role Permissions Matrix

| Feature | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Metrics | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ |
| Edit Metrics | ✅ | ✅ | ❌ |
| Create Metrics | ✅ | ✅ | ❌ |
| Manage Catalogs | ✅ | ✅ | ❌ |
| Use AI Features | ✅ | ✅ | ❌ |
| Invite Users | ✅ | ❌ | ❌ |
| Manage User Roles | ✅ | ❌ | ❌ |
| Reset User Passwords | ✅ | ❌ | ❌ |
| Deactivate Users | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ |

## First-Time Setup

### Initial Admin Registration

1. When no users exist, the first visitor sees a registration form
2. First user is automatically assigned the **Admin** role
3. Registration requires:
   - Name
   - Email address
   - Password (minimum requirements apply)
   - Two security questions with answers (for password recovery)

4. Upon successful registration:
   - A **Recovery Key** is displayed (24-character format: `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`)
   - **IMPORTANT**: Save this key immediately - it is only shown once
   - This key can be used for password recovery if security questions are forgotten

### Inviting Additional Users

Only Admins can invite new users:

1. Navigate to **Settings > User Management**
2. Click **Invite User**
3. Enter the user's email address
4. Select their role (Viewer, Editor, or Admin)
5. User receives an invitation (must complete registration at the app)

When invited users register:
- Their email is pre-verified (matches invitation)
- They set their own password
- They do NOT need to set security questions (only first admin requires this)

## Authentication Flow

### Login

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (200 OK):**
```json
{
  "token": "MJtjcKOkB6MGISPxTzqt_mLJwMHHAgavEDA39BoklOI",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Session Management

- Tokens are URL-safe random 32-byte strings
- Sessions are stored in-memory (cleared on server restart)
- Include token in subsequent requests via `Authorization` header or query parameter

### Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

## Password Recovery

Two methods are available for password recovery:

### Method 1: Recovery Key

Use the recovery key that was displayed during initial registration.

```
POST /api/v1/auth/recover-with-key
Content-Type: application/json

{
  "email": "user@example.com",
  "recovery_key": "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
  "new_password": "newpassword123"
}
```

### Method 2: Security Questions

Answer the security questions set during registration.

1. First, get the questions:
```
GET /api/v1/auth/recovery-questions/user@example.com
```

**Response:**
```json
{
  "question_1": "What was the name of your first pet?",
  "question_2": "In what city were you born?"
}
```

2. Then submit answers with new password:
```
POST /api/v1/auth/recover-with-questions
Content-Type: application/json

{
  "email": "user@example.com",
  "answer_1": "Fluffy",
  "answer_2": "New York",
  "new_password": "newpassword123"
}
```

**Note:** Answers are case-insensitive and whitespace is trimmed.

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/status` | Check if any users exist | No |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Authenticate user | No |
| POST | `/auth/logout` | End session | Yes |
| GET | `/auth/validate` | Validate token | Yes |
| POST | `/auth/change-password` | Change own password | Yes |
| GET | `/auth/recovery-questions/{email}` | Get security questions | No |
| POST | `/auth/recover-with-key` | Reset password with key | No |
| POST | `/auth/recover-with-questions` | Reset password with questions | No |

### Admin-Only Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/invite` | Invite new user |
| GET | `/auth/users` | List all users |
| PUT | `/auth/users/{id}/role` | Update user role |
| PUT | `/auth/users/{id}/active` | Activate/deactivate user |
| DELETE | `/auth/users/{id}` | Delete user |
| POST | `/auth/reset-password/{id}` | Admin reset user password |

## Security Considerations

### Password Storage
- Passwords are hashed using SHA-256
- Designed for local/offline deployment (not cloud-scale security)

### Session Security
- Sessions stored in-memory (stateless design)
- Sessions invalidated on: logout, password change, account deactivation
- No automatic session expiration (manual logout required)

### Email Validation
- Syntax-only validation (no DNS/SMTP verification)
- Allows the app to work fully offline
- Uses `email-validator` library with `check_deliverability=False`

### Recovery Key
- 24-character cryptographically random hex string
- Formatted as 6 groups of 4 characters for readability
- Only displayed once at registration - must be saved immediately
- Hashed before storage (cannot be retrieved)

### Request Authentication
- API uses `X-User-Email` header for user context in protected endpoints
- Frontend stores token in localStorage
- Token validated server-side on each request

## Troubleshooting

### "Invalid email or password" on login
- Verify email address is correct
- Check if account has been deactivated by admin
- Try password recovery if password forgotten

### Recovery key not working
- Ensure all 24 characters are entered correctly
- Check for typos (0 vs O, 1 vs I)
- Recovery keys are case-insensitive

### Security question answers not accepted
- Answers are case-insensitive
- Extra whitespace is trimmed
- Ensure you're answering the exact questions shown

### Account locked/deactivated
- Contact an Admin user to reactivate your account
- Admins can reactivate via **Settings > User Management**

### Lost recovery key AND forgot security answers
- An Admin must reset your password via **Settings > User Management**
- If you are the only Admin, database access is required to reset

### First Admin lost all recovery options
For development/local deployments, you can reset via database:

```sql
-- Clear password to allow re-registration
UPDATE users SET password_hash = NULL WHERE role = 'admin' LIMIT 1;
```

## Frontend Integration

### AuthContext

The frontend uses React Context for authentication state:

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAdmin, isEditor, login, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div>
      Welcome, {user.name}!
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

### Protected Routes

Routes are protected based on authentication status and role:

```tsx
// Only authenticated users
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

// Only admins
<Route path="/settings/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
```

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | User's display name |
| email | VARCHAR | Unique email address |
| password_hash | VARCHAR | Hashed password |
| role | ENUM | admin, editor, viewer |
| active | BOOLEAN | Account active status |
| last_login_at | TIMESTAMP | Last successful login |
| recovery_key_hash | VARCHAR | Hashed recovery key |
| security_question_1 | VARCHAR | First security question |
| security_question_2 | VARCHAR | Second security question |
| security_answer_1_hash | VARCHAR | Hashed answer 1 |
| security_answer_2_hash | VARCHAR | Hashed answer 2 |
| selected_framework_id | UUID | User's preferred framework |
| onboarding_completed | BOOLEAN | Onboarding status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last modification time |

## Best Practices

1. **Save your recovery key** immediately after first registration
2. **Choose memorable security questions** with answers only you know
3. **Use unique passwords** for this application
4. **Invite users with minimal required permissions** (principle of least privilege)
5. **Regularly review user list** and deactivate unused accounts
6. **Don't share admin credentials** - invite additional admins instead
