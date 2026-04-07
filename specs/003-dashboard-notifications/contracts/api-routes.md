# API Routes: Dashboard & Notifications

**Date**: 2026-03-26
**Feature**: Dashboard & Notifications (Phase 2)

## Dashboard API

### `GET /api/dashboard`

Returns aggregated summary data for the dashboard page.

**Auth**: Required (JWT)
**RBAC**: All authenticated roles (response varies by role)

**Response**:
```typescript
{
  success: boolean;
  data: {
    faxes: {
      pendingCount: number;
      totalCount: number;
    };
    rollcall: {
      todaySubmitted: boolean;
      presentCount: number;
      absentCount: number;
      leaveCount: number;
      missionCount: number;
    };
    medical: {
      expiredCount: number;
      lowStockCount: number;
    };
    courses: {
      activeCount: number;
      upcomingCount: number;
    };
    students: {
      totalCount: number;
    };
  };
}
```

**Errors**:
- `401` — Not authenticated
- `500` — Database error (partial data returned per card with error flag)

---

## Notifications API

### `GET /api/notifications`

Returns paginated notifications for the authenticated user.

**Auth**: Required (JWT)
**RBAC**: Commander only

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `unreadOnly` (boolean, default: false)

**Response**:
```typescript
{
  success: boolean;
  data: {
    notifications: Array<{
      _id: string;
      type: "new_fax" | "rollcall_submitted" | "medicine_expiry";
      title: string;
      body: string;
      isRead: boolean;
      refId: string;
      refModel: string;
      createdAt: string;
    }>;
    unreadCount: number;
    total: number;
    page: number;
    totalPages: number;
  };
}
```

**Errors**:
- `401` — Not authenticated
- `403` — Not Commander role

---

### `PATCH /api/notifications`

Mark notifications as read.

**Auth**: Required (JWT)
**RBAC**: Commander only

**Request Body**:
```typescript
// Mark specific notifications
{
  action: "mark_read";
  notificationIds: string[];
}

// Mark all as read
{
  action: "mark_all_read";
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    modifiedCount: number;
  };
}
```

**Errors**:
- `401` — Not authenticated
- `403` — Not Commander role
- `400` — Invalid request body (Zod validation)

---

### `GET /api/notifications/stream`

Server-Sent Events endpoint for real-time notification delivery.

**Auth**: Required (JWT via cookie or query param for SSE)
**RBAC**: Commander only

**Event Format**:
```
event: notification
data: {"_id":"...","type":"new_fax","title":"فاكس جديد","body":"...","refId":"...","refModel":"Fax","createdAt":"..."}

event: connected
data: {"message":"connected","unreadCount":5}

event: heartbeat
data: {"timestamp":"..."}
```

**Behavior**:
- Sends `connected` event on initial connection with current unread count
- Sends `heartbeat` every 30 seconds to keep connection alive
- Sends `notification` event when a new notification is created for this user
- Client reconnects with exponential backoff on disconnect

**Errors**:
- `401` — Not authenticated
- `403` — Not Commander role

---

## Audit Log API

### `GET /api/audit`

Returns paginated, filterable audit log entries.

**Auth**: Required (JWT)
**RBAC**: Admin, Commander only

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `userId` (string, optional) — filter by user
- `action` (string, optional) — filter by action type
- `module` (string, optional) — filter by module
- `startDate` (string, optional) — ISO date, filter from
- `endDate` (string, optional) — ISO date, filter to

**Response**:
```typescript
{
  success: boolean;
  data: {
    entries: Array<{
      _id: string;
      userId: string;
      userName: string;
      action: "CREATE" | "UPDATE" | "DELETE" | "VIEW";
      module: string;
      targetId: string;
      description: string;
      ipAddress: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  };
}
```

**Errors**:
- `401` — Not authenticated
- `403` — Not Admin or Commander role
- `400` — Invalid filter parameters (Zod validation)
