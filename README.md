# 🚀 Full-Stack CRM Sales Management System (Backend API)

A modern, full-stack Customer Relationship Management (CRM) API built with **Node.js, Express, MongoDB, and Mongoose**. Designed for multi-tiered sales teams with role-based access control (RBAC), interactive deal pipelines, real-time activity tracking, and executive analytics.

---

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **MongoDB** (Local instance or MongoDB Atlas connection string)

---

### Backend Setup (`crm-backend`)

```bash
# Install dependencies
npm install

# Create environment file (.env)
# Populate .env with:
# PORT=5000
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/crm
# JWT_ACCESS_SECRET=your_jwt_access_secret_key_123
# JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_456
# CLIENT_URL=http://localhost:5173
# NODE_ENV=development

# Seed database with initial demo users, leads, customers, and deals
npm run seed

# Start development server
npm run dev
```
> The API server will start on `http://localhost:5000`. Swagger API docs available at `http://localhost:5000/api-docs`.

---

## 🌐 Live Hosted API
- **Backend Base URL**: `https://crm-b-3yhj.onrender.com/api`
- **Swagger Documentation**: `https://crm-b-3yhj.onrender.com/api-docs`

---

## 💻 Technologies Used

### Backend Stack
- **Runtime & Framework**: Node.js, Express.js
- **Database & ORM**: MongoDB, Mongoose ORM
- **Authentication**: JWT (Short-lived Access Tokens + httpOnly Refresh Cookies)
- **API Documentation**: Swagger UI Express, OpenAPI 3.0
- **Scheduled Tasks**: Node-Cron (automated reminder/overdue activities processing)
- **Security**: BcryptJS, CORS, Express rate limiting concepts

### Frontend Stack
- **Core Framework**: React 18, Vite
- **State Management**: Redux Toolkit, RTK Query
- **Styling**: Tailwind CSS
- **Forms & Validation**: React Hook Form, Zod Schema Validation

---

## 🧪 Testing Steps & Demo Accounts

### Pre-configured Demo Accounts

| Role | Name | Email | Password | Access Scope |
|---|---|---|---|---|
| **Admin** | System Admin | `admin@crm.com` | `Admin@12345` | Full system access to all entities & team metrics |
| **Sales Manager** | Manager Bob | `manager1@crm.com` | `Manager@12345` | Access to own data + team members (Alice & Charlie) |
| **Sales Executive 1** | Alice | `exec1@crm.com` | `Exec@12345` | Access to self-assigned leads, deals & activities |
| **Sales Executive 2** | Charlie | `exec2@crm.com` | `Exec@12345` | Access to self-assigned leads, deals & activities |

---

## 📋 Assumptions Made

1. **Currency**: All commercial monetary values are formatted in **Indian Rupees (`₹` / INR)**.
2. **Role Hierarchy Rules**:
   - `admin`: Can view, assign, and edit across all users and departments.
   - `sales_manager`: Can manage and view records assigned to themselves or subordinates (`managerId`).
   - `sales_executive`: Scoped strictly to records where `assignedTo === userId`.
3. **Strict Stage Validation**: Deal stages are restricted to `qualification`, `discovery`, `proposal`, `negotiation`, `won`, and `lost`. Setting a stage to `lost` strictly mandates a non-empty `lostReason`.

---

## ⚠️ Known Limitations

1. **Render Free Tier Cold Start**:
   - The hosted backend on Render sleeps after 15 minutes of inactivity. Initial request wakeup can take **30 to 60 seconds**.
2. **Cross-Site Cookies on Localhost**:
   - Browsers restrict cross-site `httpOnly` cookies when mixing `http://localhost` with `https://crm-b-3yhj.onrender.com`. A token header fallback (`x-refresh-token`) is enabled.

---

## ⏱️ Approximate Time Taken

- **Total Development Time**: **~13 Hours**
  - **Architecture & DB Schema Design**: 2 Hours
  - **Backend REST API, Validation & RBAC Scoping**: 3.5 Hours
  - **Frontend Design System, Components & Layouts**: 3.5 Hours
  - **Deals Pipeline Integration, Stage Handlers & RTK Query**: 3 Hours
  - **Testing, Deployments & Documentation**: 1 Hour
