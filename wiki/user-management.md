# User Management & Authentication

> **Last Updated:** February 2026
> **Status:** Active Development

---

MetricFrame includes a complete role-based access control (RBAC) system for managing users and permissions.

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full system access | Manage users, all Editor capabilities |
| **Editor** | Read/write access | Edit metrics, manage catalogs, use AI |
| **Viewer** | Read-only access | View dashboards and metrics |

### Permissions Matrix

| Feature | Admin | Editor | Viewer |
|---------|:-----:|:------:|:------:|
| View Dashboard | ✅ | ✅ | ✅ |
| View Metrics | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ |
| Edit Metrics | ✅ | ✅ | ❌ |
| Manage Catalogs | ✅ | ✅ | ❌ |
| Use AI Features | ✅ | ✅ | ❌ |
| Invite Users | ✅ | ❌ | ❌ |
| Manage Roles | ✅ | ❌ | ❌ |
| Reset Passwords | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ |

## First-Time Setup

When no users exist, the first visitor sees a registration form.

### Register First Admin

1. Navigate to the application
2. Fill in the registration form:
   - **Name**: Your display name
   - **Email**: Your email address
   - **Password**: Create a strong password
   - **Security Questions**: Select and answer 2 questions

3. Click **Register**

4. **Save Your Recovery Key**

   A 24-character recovery key is displayed:
   ```
   XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
   ```

   **Important:** Save this key immediately - it is only shown once!

## Inviting Users

Only Admins can invite new users.

### Send an Invitation

1. Navigate to **Settings > User Management**
2. Click **Invite User**
3. Enter the user's email address
4. Select their role:
   - **Viewer** - for stakeholders who only need to view dashboards
   - **Editor** - for team members who manage metrics
   - **Admin** - for other administrators

5. Click **Send Invitation**

### Accepting an Invitation

When an invited user visits the app:

1. They see a registration form (pre-filled email)
2. They set their name and password
3. They gain access with their assigned role

**Note:** Invited users do not set security questions - only the first admin does.

## Managing Users

### View All Users

Navigate to **Settings > User Management** to see:
- User name and email
- Assigned role
- Account status (Active/Inactive)
- Last login timestamp

### Change User Role

1. Find the user in the list
2. Click the **Role** dropdown
3. Select the new role
4. Confirm the change

### Deactivate a User

1. Find the user in the list
2. Toggle the **Active** switch to Off
3. User can no longer log in

Deactivated users:
- Cannot log in
- Existing sessions are invalidated
- Can be reactivated later

### Delete a User

1. Find the user in the list
2. Click the **Delete** button
3. Confirm deletion

**Warning:** This permanently removes the user account.

### Reset User Password

Admins can reset another user's password:

1. Find the user in the list
2. Click **Reset Password**
3. Enter a temporary password
4. Share the temporary password with the user securely

The user should change this password after logging in.

## Password Recovery

Two methods are available for password recovery:

### Method 1: Recovery Key

If you saved your recovery key during registration:

1. Click **Forgot Password** on the login page
2. Select the **Recovery Key** tab
3. Enter your email address
4. Enter your 24-character recovery key
5. Set a new password

### Method 2: Security Questions

If you set up security questions (first admin only):

1. Click **Forgot Password** on the login page
2. Select the **Security Questions** tab
3. Enter your email address
4. Answer your two security questions
5. Set a new password

**Note:** Answers are case-insensitive.

## Changing Your Password

To change your own password:

1. Navigate to **Settings > Account**
2. Enter your current password
3. Enter your new password
4. Confirm the new password
5. Click **Update Password**

## Session Management

- Sessions persist until you log out
- Logging in from a new device doesn't end other sessions
- Password changes invalidate all existing sessions
- Account deactivation immediately ends all sessions

## Troubleshooting

### Can't Log In

1. Verify your email address is correct
2. Check if your account is active (ask an Admin)
3. Try password recovery if you forgot your password

### Recovery Key Not Working

1. Ensure all 24 characters are entered
2. Check for typos (0 vs O, 1 vs I)
3. Recovery keys are case-insensitive

### Security Questions Not Accepted

1. Answers are case-insensitive
2. Extra whitespace is ignored
3. Make sure you're answering the correct questions

### Locked Out Completely

If you're the only Admin and lost all recovery options:

1. Contact your database administrator
2. They can reset your password directly in the database

For multi-admin setups:
1. Another Admin can reset your password
2. Or delete and re-invite your account

## Security Best Practices

1. **Save your recovery key** in a secure location
2. **Choose strong passwords** (mix of letters, numbers, symbols)
3. **Use unique passwords** for this application
4. **Don't share credentials** - invite additional users instead
5. **Review user list regularly** and remove unused accounts
6. **Use minimal permissions** - assign Viewer unless Edit access is needed

## API Reference

For programmatic user management, see the [API Reference](api-reference#authentication-endpoints).

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Authenticate user |
| `/auth/logout` | POST | End session |
| `/auth/register` | POST | Register new user |
| `/auth/status` | GET | Check if users exist |
| `/auth/validate` | GET | Validate session token |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/invite` | POST | Invite new user |
| `/auth/users` | GET | List all users |
| `/auth/users/{id}/role` | PUT | Update user role |
| `/auth/users/{id}/active` | PUT | Toggle user status |
| `/auth/users/{id}` | DELETE | Delete user |

---

**Need Help?** See [Troubleshooting Guide](troubleshooting) or [API Reference](api-reference).
