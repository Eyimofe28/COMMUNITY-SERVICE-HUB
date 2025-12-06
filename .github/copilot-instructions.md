# Community Service Hub - Copilot Instructions

## Architecture Overview

**Full-stack MERN** with **role-based access control (RBAC)**. Three-tier separation:
- **Backend**: Express.js on port 5000, MySQL with JWT authentication
- **Frontend**: React (CRA) with Material-UI on port 3000
- **Database**: MySQL with role-based schema (Users, Faculty, Student, Opportunity, Registration)

### User Roles
- `student` & `faculty` → self-register via MVSU email verification
- `admin` → bootstrapped via `/api/admin/bootstrap` (once-only), can create other admins
- `approver` → faculty with `Approver=1` flag in Faculty table, approves opportunities

## Critical Data Flow

### Authentication Flow
1. User signs up with `email`, `password`, `firstName`, `lastName`, `role`
2. Backend validates **mvsu.edu domain only**, generates 6-digit code → stores in `verificationStore` Map (in-memory, 10-min TTL)
3. Code sent via Nodemailer (Gmail) to email
4. On verify: create Users record + role-specific table (Faculty/Student), issue JWT
5. Frontend: `localStorage` stores JWT, Axios interceptor auto-attaches as `Authorization: Bearer <token>`

### JWT Structure
- Token contains: `{ userId, role }`
- Backend middleware decodes → fetches full user record from Users table → attaches as `req.user`

### Opportunity Workflow
1. Faculty creates opportunity → `Approval_Status = 'Pending'`, `Approver_ID = NULL`
2. Approver reviews → calls `/patch /approve/:id` → updates status + sets `Approver_ID`
3. Students browse `/api/opportunity/approved` → register via `/post /register/:id`
4. Faculty submits attendance → `/post /:id/attendance`

## Key File Patterns

### Backend Auth
- `authController.js`: signup/verify/login logic, bcrypt hashing, in-memory verification store
- `authMiddleware.js`: JWT validation, fetches user record, attaches to `req.user`
- `roleMiddleware.js`: guards like `isStudent`, `isFaculty`, `isApprover`, `isRegularFaculty` (mutually exclusive with approver)

### Backend Routes Structure
- Each domain has dedicated route file: `authRoutes`, `opportunityRoutes`, `communicationRoutes`, `adminRoutes`
- Pattern: `router.post/get/patch(path, auth, roleCheck, controller.method)`
- All protected routes require `auth` middleware first

### Frontend Component Structure
- Dashboard entry points: `studentDashboard.jsx`, `FacultyDashboard.jsx`, `ApproverDashboard.jsx`
- Sidebar navigations: `StudentSidebar.jsx`, `FacultySidebar.jsx` (nested in dashboards)
- Feature pages: `StudentMessages.jsx`, `FacultyCreateOpportunity.jsx`, etc.
- Routes: defined in `App.js` with path pattern `/[role]/[feature]`

### Frontend API Client
- `src/api/axios.js`: single instance with baseURL `http://localhost:5000/api`
- Auto-injects JWT from localStorage as Bearer token
- All components use this shared instance for API calls

## Database Design Notes

### Table Relationships
- **Users** (base): `User_ID` (PK), `Email` (unique), `Role`, `First_Name`, `Last_Name`
- **Faculty**: `User_ID` (FK), `Approver` (boolean flag)
- **Student**: `User_ID` (FK)
- **Opportunity**: `Opportunity_ID`, `Faculty_ID` (FK to Users), `Approval_Status` (Pending/Approved), `Approver_ID` (FK to Users)
- **Registration**: `Student_ID`, `Opportunity_ID`, status tracking

### Query Patterns
- Faculty operations: use `req.user.userId` as `Faculty_ID` (stored in Users table)
- Always check `Approver=1` in Faculty table when enforcing approver access, not just role check
- User lookups: `SELECT * FROM Users WHERE User_ID = ?` to fetch full record after JWT decode

## Development Workflows

### Start Backend
```powershell
cd community-service-backend
node server.js  # Requires .env with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, EMAIL_USER, EMAIL_PASS
```

### Start Frontend
```powershell
cd community-service-frontend
npm start  # Starts on http://localhost:3000
```

### Environment Setup
Backend `.env` required variables:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=...
DB_NAME=community_service
JWT_SECRET=your-secret-key
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password  # Gmail app password, NOT account password
```

## Common Extension Points

### Adding a New Feature
1. Create route in `community-service-backend/routes/[feature]Routes.js`
2. Implement logic in `community-service-backend/controllers/[feature]Controller.js`
3. Register route in `server.js`: `app.use("/api/[feature]", [feature]Routes)`
4. Frontend: create page component in `src/pages/[role]/` or shared, import in `App.js`
5. Add route in `App.js` following `/[role]/[feature]` pattern
6. Use shared Axios instance from `src/api/axios.js` for API calls

### Adding Role-Based Access
- Guard routes in backend: `router.patch(path, auth, isApprover, controller)`
- Frontend: check `localStorage.getItem('token')` to verify auth state
- For conditional UI: parse JWT client-side or fetch role from user endpoint

### Database Updates
- Add migration or manual SQL script
- Update queries in controllers to use new columns
- If adding new role type: update `authController` validation, add new middleware guard, add new table if needed

## Testing Commands

- Frontend: `npm test` in `community-service-frontend/` (CRA test runner)
- Backend: no automated tests configured (add Jest/Mocha as needed)
- Manual: Use Postman/curl with Bearer token headers or test login flow end-to-end

## Common Pitfalls

- **JWT Expiry**: No refresh token mechanism currently; JWT never expires (consider adding if needed)
- **Verification Code**: In-memory store lost on server restart; use Redis or database for production
- **CORS**: Configured for all origins in `server.js` (`cors()` with no whitelist); restrict in production
- **Email Limits**: Gmail has rate limits; implement queue (Bull, RabbitMQ) for bulk emails
- **Faculty vs Approver**: `isFaculty` middleware checks role only; `isApprover` also verifies `Approver=1` flag
