# Auth API Contracts

## POST /api/auth/login

Authenticate a user and return a session cookie.

### Request

```json
{
  "username": "string (3-50 chars)",
  "password": "string (min 6 chars)"
}
```

### Response — Success (200)

```json
{
  "success": true,
  "user": {
    "id": "string (ObjectId)",
    "username": "string",
    "fullName": "string",
    "role": "admin | commander | employee | viewer",
    "department": "string",
    "permissions": {
      "fax": "none | view | edit",
      "officers": "none | view | edit",
      "medical": "none | view | edit",
      "students": "none | view | edit",
      "education": "none | view | edit"
    }
  }
}
```

- Sets `HttpOnly` cookie: `token=<JWT>`
- JWT payload: `{ userId, role, iat, exp }`

### Response — Failure (401)

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Response — Locked (423)

```json
{
  "success": false,
  "error": "Account is locked. Contact an administrator."
}
```

### Response — Inactive (403)

```json
{
  "success": false,
  "error": "Account is deactivated"
}
```

### Validation (Zod)

- `username`: min 3, max 50, alphanumeric + underscore
- `password`: min 6

---

## POST /api/auth/logout

Invalidate the current session.

### Request

No body required. Reads JWT from cookie.

### Response (200)

```json
{
  "success": true,
  "message": "Logged out"
}
```

- Clears the `token` cookie

---

## GET /api/auth/me

Get the currently authenticated user's profile.

### Request

No body. Reads JWT from cookie.

### Response — Success (200)

```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "department": "string",
    "permissions": { ... },
    "isActive": true,
    "isLocked": false
  }
}
```

### Response — Unauthenticated (401)

```json
{
  "success": false,
  "error": "Not authenticated"
}
```

---

## GET /api/auth/users

List all users. Admin only.

### Request

Query params: `?role=admin&department=fax&isActive=true` (all optional filters)

### Response (200)

```json
{
  "success": true,
  "users": [
    {
      "id": "string",
      "username": "string",
      "fullName": "string",
      "role": "string",
      "department": "string",
      "isActive": true,
      "isLocked": false,
      "createdAt": "ISO date"
    }
  ],
  "total": 10
}
```

### Response — Forbidden (403)

```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

---

## POST /api/auth/users

Create a new user. Admin only.

### Request

```json
{
  "username": "string (3-50 chars)",
  "password": "string (min 6 chars)",
  "fullName": "string (2-100 chars)",
  "role": "admin | commander | employee | viewer",
  "department": "fax | officers | medical | students | education",
  "permissions": {
    "fax": "none | view | edit",
    "officers": "none | view | edit",
    "medical": "none | view | edit",
    "students": "none | view | edit",
    "education": "none | view | edit"
  }
}
```

### Response — Success (201)

```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "department": "string",
    "permissions": { ... }
  }
}
```

### Response — Duplicate (409)

```json
{
  "success": false,
  "error": "Username already exists"
}
```

### Response — Validation Error (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [ { "field": "username", "message": "Too short" } ]
}
```

---

## PATCH /api/auth/users/:id

Update an existing user. Admin only.

### Request

All fields optional (partial update):

```json
{
  "fullName": "string",
  "role": "string",
  "department": "string",
  "permissions": { ... },
  "isActive": true,
  "isLocked": false
}
```

### Response — Success (200)

```json
{
  "success": true,
  "user": { ... }
}
```

### Response — Self-deactivation blocked (400)

```json
{
  "success": false,
  "error": "Cannot deactivate your own account (you are the only active admin)"
}
```

### Response — Not Found (404)

```json
{
  "success": false,
  "error": "User not found"
}
```

---

## DELETE /api/auth/users/:id

Deactivate a user (soft delete). Admin only.

### Response — Success (200)

```json
{
  "success": true,
  "message": "User deactivated"
}
```

### Response — Self-deactivation blocked (400)

```json
{
  "success": false,
  "error": "Cannot deactivate your own account (you are the only active admin)"
}
```

---

## Zod Validation Schemas

```typescript
// Login
loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6)
})

// Create User
createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  role: z.enum(['admin', 'commander', 'employee', 'viewer']),
  department: z.enum(['fax', 'officers', 'medical', 'students', 'education']),
  permissions: z.object({
    fax: z.enum(['none', 'view', 'edit']),
    officers: z.enum(['none', 'view', 'edit']),
    medical: z.enum(['none', 'view', 'edit']),
    students: z.enum(['none', 'view', 'edit']),
    education: z.enum(['none', 'view', 'edit'])
  })
})

// Update User (all optional)
updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'commander', 'employee', 'viewer']).optional(),
  department: z.enum(['fax', 'officers', 'medical', 'students', 'education']).optional(),
  permissions: z.object({
    fax: z.enum(['none', 'view', 'edit']),
    officers: z.enum(['none', 'view', 'edit']),
    medical: z.enum(['none', 'view', 'edit']),
    students: z.enum(['none', 'view', 'edit']),
    education: z.enum(['none', 'view', 'edit'])
  }).optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional()
})
```
