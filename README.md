# EscaShop Optical Queue Management System Product Requirements Document (v3.0)

[![Architecture](https://img.shields.io/badge/Architecture-Documentation-blue.svg)](docs/architecture.md)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/escashop/queue-system/actions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v3.1.0-blue.svg)](CHANGELOG.md)

## 📋 Quick Links

- **[🏗️ Architecture Documentation](docs/architecture.md)** - Complete system architecture, diagrams, and code structure
- **[🚀 Getting Started](#development-setup)** - Setup and installation guide
- **[🔄 Blue/Green Deployment Strategy](#blue-green-deployment-strategy)** - Zero-downtime deployment details
- **[📊 Features Overview](#key-features)** - Core system capabilities
- **[🔒 Security Guide](SECURITY_HARDENING_GUIDE.md)** - Security implementation details
- **[📈 Reports & Analytics](#transaction-log)** - Financial reporting features

## 1. Introduction
This document outlines the **Product Requirements** for the **EscaShop Optical Queue Management System**, an internal-use software application designed to streamline customer service operations at EscaShop Optical. The system enables queue management, customer registration, notifications via SMS, and financial reporting.

The purpose of this PRD is to provide a clear and comprehensive understanding of the product vision, features, technical requirements, and user interactions necessary for successful development and implementation.

---

## 2. Product Overview
### 2.1 Product Name
EscaShop Optical Queue Management System

### 2.2 Product Description
An integrated queue management system tailored for internal use by EscaShop Optical staff. The system enables efficient customer registration, prioritization, notification, and reporting. It includes modules for administration, display monitoring, notifications, transactions, and activity logging.

### 2.3 Key Features
- Role-based access control (Admin, Sales Employee, Cashier)
- Dynamic User Management by Admin
- Customer registration with detailed prescription and payment information
- Priority queue management for Senior Citizens, Pregnant individuals, and PWDs
- Receipt & Token Printing
- SMS notifications with configurable templates
- Real-time display monitor with configurable counters and sound alerts
- Transaction logs and daily financial reports
- Google Sheets integration for exporting data
- Immutable activity log for auditing

---

## Blue/Green Deployment Strategy

Our deployment process employs a **Blue/Green Deployment** model to ensure zero-downtime updates.

### Process

- **Database Migrations**: Apply schema changes in advance.
- **Deploy:**
  - **Blue Environment** (Current Production):
    - Run production workloads.
  - **Green Environment** (Staging):
    - Deploy updates, run acceptance tests.
  - Swap environments for production cut-over.

### Rollback Plan
- Maintain compatibility with previous enum values.
- Hide UI features if a rollback is needed, ensuring backward compatibility.

---

## 3. Goals and Objectives
| Objective | Description |
|----------|-------------|
| Improve Operational Efficiency | Reduce wait times through intelligent queue prioritization and automation. |
| Enhance Customer Experience | Provide timely updates via SMS and minimize delays. |
| Streamline Financial Reporting | Automate transaction summaries and petty cash reconciliation. |
| Ensure Data Integrity | Maintain secure, auditable records accessible only to authorized users. |
| Support Remote Reporting | Enable real-time export of customer data to Google Sheets. |

---

## 4. Target Audience
| User Type | Description |
|-----------|-------------|
| Admin | Full access to all system functions. Responsible for system configuration (managing user accounts, counter names, dropdown options), viewing all financial reports, and auditing the system via the Activity Log. |
| Sales Employees | Responsible for customer registration and managing prescriptions. Can view their own performance data but cannot access system-wide financial reports or configurations. The Admin dashboard and its configuration modules are hidden from this role. |
| Cashiers | Handle payments and view daily financial transaction reports for reconciliation. Cannot create or edit customer/prescription data. Has read-only access to transaction logs. The Admin dashboard and its configuration modules are hidden from this role. |

---

## 5. Features and Requirements

### 5.1 Authentication & Authorization
| Feature ID | Description |
|------------|-------------|
| ST-101 | Users must authenticate using role-specific login screens. |
| ST-102 | Password reset functionality available via email verification. Reset link sent to the user's registered email must be single-use and expire after 1 hour. |
| ST-103 | Role-based access control (RBAC) is enforced, with a clear hierarchy: Admin > Sales > Cashier. User accounts are managed by the Admin (see Section 5.9). |
| ST-104 | The Activity Log is accessible in read-only mode *exclusively* by the Admin role for security and audit purposes. |

### 5.2 Customer Registration
| Feature ID | Description |
|------------|-------------|
| ST-201 | Required fields: Name, Contact Number, Email, Age, Address. |
| ST-202 | Optional field: Occupation. |
| ST-203 | Distribution Information: Dropdown (Lalamove, LBC, Pick Up). |
| ST-204 | Sales Agent auto-assigned based on the logged-in user. |
| ST-205 | Prescription fields: OD, OS, OU, PD, ADD. Input must be alphanumeric. Max 50 characters. Allowed special characters: `+`, `-`, `.`, `/`, `(`, `)`. Backend validation is mandatory. |
| ST-206 | Grade Type dropdown. Options are dynamically populated from a list managed by the Admin (see ST-902). |
| ST-207 | Lens Type dropdown. Options are dynamically populated from a list managed by the Admin (see ST-902). |
| ST-208 | Frame Code: Alphanumeric input with special characters. Max 100 characters. |
| ST-209 | Estimated Time: Numeric value in minutes for order completion. |
| ST-210 | Payment Info: Mode of Payment (Gcash, Maya, Bank Transfer, Credit Card), Pesos Sign with Amount (numeric). |
| ST-211 | Remarks: Optional text field (Max 500 characters). |
| ST-212 | Priority Queue checkbox: Senior Citizen, Pregnant, PWD. |
| ST-213 | An auto-generated, unique OR (Official Receipt) number is assigned upon successful submission. Format: `YYYYMMDD-NNN` (e.g., `20231027-001`), where `NNN` resets daily. |
| ST-214 | A "Print Token" button becomes available after successful registration. The system should support printing to a standard thermal receipt printer. |

### 5.3 Queue Management
| Feature ID | Description |
|------------|-------------|
| ST-301 | Real-time display of Customer Waiting, Currently Serving, and Priority Customers. Updates must be pushed to all clients instantly via WebSockets. |
| ST-302 | Average Wait Time is calculated and displayed dynamically. |
| ST-303 | Priority logic is automatically applied (see 5.3.1). |
| ST-304 | Manual override capability for Admin to re-order any customer in the queue via drag-and-drop. |

#### 5.3.1 Priority Queue Logic
1.  Customers flagged as Priority (Senior, Pregnant, PWD) are automatically moved to the top of the "Waiting" queue.
2.  If multiple priority customers are present, they are ordered amongst themselves on a first-come, first-served basis.
3.  This automatic ordering can be manually superseded by an Admin at any time (per ST-304).

### 5.4 Notification System
| Feature ID | Description |
|------------|-------------|
| ST-401 | Admin can send SMS to selected customers from the queue. |
| ST-402 | Notifications include customer name and token number. |
| ST-403 | A distinct sound effect plays on the Display Monitor when a customer is called. |
| ST-404 | A Notification Log tracks SMS delivery status (e.g., Sent, Delivered, Failed) and total SMS count for the day. |
| ST-405 | **SMS Template Management:** The Admin can view and edit the default SMS message template. The template must support dynamic variables like `[CustomerName]` and `[TokenNumber]`. _Default Template: "Hi [CustomerName], your order with token #[TokenNumber] at EscaShop Optical is now ready. Please proceed to the designated counter."_ |

### 5.5 Display Monitor
| Feature ID | Description |
|------------|-------------|
| ST-501 | Grid layout with counters. Counter names (e.g., "JA," "Jil") and the number of counters are configured by the Admin in the dashboard (see ST-903). |
| ST-502 | Displays the currently serving token number and customer name for each active counter. |
| ST-503 | Plays sound effect when a new customer is called to a counter. |

### 5.6 Transaction Log
| Feature ID | Description |
|------------|-------------|
| ST-601 | Daily summary: Total Cash, Gcash, Maya, Credit Card, Bank Transfer, PettyCash,  Total Revenue |
| ST-602 | Weekly and Monthly rollups are available with date range filters. |
| ST-603 | Table displays each transaction individually (OR #, Customer, Amount, Payment Mode, Agent). |
| ST-604 | Export options: Excel, PDF, Google Sheets. |
| ST-605 | Petty Cash Start / End fields for daily reconciliation. |
| ST-606 | Add multiple custom Funds with fields for `Description` and `Amount`. | Add all Funds to PettyCash Total |
| ST-607 | Add multiple custom expenses with fields for `Description` and `Amount`. |
| ST-608 | Financial Summary includes a Cash Turnover calculation. |
| ST-609 | Cash Turnover Formula: `(PettyCashStart + Cash + Gcash + Maya + Credit Card + Funds(Change Funds) + BankTransfer) - Expenses - PettyCashEnd`. |

### 5.7 Activity Log
| Feature ID | Description |
|------------|-------------|
| ST-701 | Logs all key system activities (e.g., user login, customer creation, queue modification, report export). |
| ST-702 | Log entries are immutable (non-editable and non-deletable). |
| ST-703 | Accessible in read-only mode *only* by users with the Admin role. |

### 5.8 Export System
| Feature ID | Description |
|------------|-------------|
| ST-801 | Export individual rows from Registered Customers table. |
| ST-802 | Bulk export all customer records. |
| ST-803 | Export formats: Excel, PDF, Google Sheets. |
| ST-804 | Google Sheets integration via Google Apps Script web app. |

### 5.9 Admin & System Management
This module is accessible only to the Admin role and allows for dynamic system configuration without code changes.

| Feature ID | Description |
|------------|-------------|
| ST-901 | **User Management Module:** The Admin has exclusive control over managing user accounts. This is broken down as follows: |
| ST-901.1 | **Add User Account:** The Admin can add new user accounts for **Sales Employees** and **Cashiers**. The creation form will require: Full Name, Email, and Role. An initial, system-generated temporary password will be sent to the user's email. |
| ST-901.2 | **View User Accounts:** The Admin can view a complete list of all non-Admin users in a table displaying Full Name, Email, Role, and current Status (e.g., Active/Inactive). |
| ST-901.3 | **Edit User Account:** The Admin can edit an existing user's `Full Name` and `Role`. The `Email` (login ID) cannot be changed after creation. |
| ST-901.4 | **Manage User Status (Deactivation):** The Admin can change a user's status between 'Active' and 'Inactive'. An 'Inactive' user cannot log in, preserving their historical data. |
| ST-901.5 | **Manual Password Reset:** The Admin can trigger a password reset link to be sent to a user's registered email. |
| ST-902 | **Dropdown Management:** Admin can add, edit, or remove options from the `Grade Type` and `Lens Type` dropdown lists. |
| ST-903 | **Counter Management:** Admin can define the names and number of service counters that appear on the Display Monitor. |

---

## 6. User Stories and Acceptance Criteria
| Requirement ID | As a... | I want to... | So that... | Acceptance Criteria |
|----------------|---------|--------------|------------|---------------------|
| ST-101 | Staff member | Log in securely | I can access only permitted areas of the system. | Valid credentials are required; session times out after 10 minutes of inactivity. |
| ST-201 | Sales agent | Register a new customer with all their details | I can begin the dispensing process efficiently. | All required fields must be validated before the submission is successful. |
| ST-214 | Sales agent | Print a physical token number for the customer | I can give them a physical confirmation of their place in the queue. | The "Print Token" button becomes active only after a successful registration. |
| ST-301 | Admin | View a real-time list of all waiting customers | I can manage the flow of people in the shop efficiently. | The queue display updates instantly, without a page refresh, as customers are added or served. |
| ST-303 | Admin | Prioritize certain customers automatically | We can serve vulnerable groups faster. | Customers marked as Senior, Pregnant, or PWD are automatically placed at the front of the queue. |
| ST-601 | Cashier | View a summary of the day's transactions | I can reconcile my sales at the end of the day. | The dashboard shows accurate totals for each payment type (Cash, Gcash, etc.). |
| ST-901 | Admin | Add, view, and manage staff user accounts | I can control who has access to the system as staff join or leave. | 1. I can access a "User Management" page from the Admin dashboard.<br>2. The page displays a table of all non-Admin users.<br>3. An "Add New User" button opens a form to create a new Sales or Cashier account.<br>4. I can deactivate an employee's account, which immediately revokes their login access. |
| ST-803 | Admin | Export reports to Google Sheets | I can share live data with management without manual copy-pasting. | Data is submitted directly to the designated Google Sheet with a single click. |

---

## 7. Technical Requirements & Stack

### 7.1 Recommended Stack
| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | **React.js with TypeScript & Tailwind CSS** | Industry standard for modular UIs. TypeScript ensures data integrity. Tailwind CSS provides rapid, utility-first styling. |
| **Backend** | **Node.js (with Express.js & TypeScript)** | Creates a single-language stack for maximum efficiency. Excellent for real-time communication via WebSockets. |
| **Database** | **PostgreSQL** | Powerful, reliable, and scalable relational database perfect for the structured data of this application. |

### 7.2 Backend Details
- **Framework**: Node.js with Express.js (or NestJS) in TypeScript
- **Authentication**: JWT (with short-lived access tokens and longer-lived refresh tokens).
- **Real-time Communication**: WebSockets for queue and display monitor updates.
- **Cloud Functions**: Google Apps Script for Sheets integration.

### 7.3 Frontend Details
- **Framework**: **React.js** with **Vite**
- **Language**: **TypeScript**
- **Styling**: **Tailwind CSS** for utility-first styling. This allows for rapid development of custom, responsive designs without writing custom CSS files. It can be paired with a component library like **Material-UI (MUI)** for complex components (like data tables and date pickers) or **Headless UI** for fully accessible, unstyled components.
- **State Management**: Redux Toolkit or Zustand
- **Printing**: A technical spike is required to determine the best approach (Browser Print API vs. Thermal Printer SDK).

### 7.4 Third-party Integrations
- **SMS Gateway**: Clicksend API or Twilio API
- **Google Sheets API**: For direct data submission.

### 7.5 Hosting & Deployment
- **Frontend**: Vercel or Netlify
- **Backend**: Heroku, DigitalOcean App Platform, or AWS EC2
- **Database**: Managed DBaaS (e.g., AWS RDS, DigitalOcean Managed PostgreSQL)

---

## 8. Design and User Interface
### 8.1 General UI Guidelines
- Clean, modern, and intuitive design built with a utility-first approach.
- The UI must be responsive and functional on desktop, tablet, and mobile browsers.
- Components and navigation links must be conditionally rendered based on the logged-in user's role.

### 8.2 Admin Dashboard Layout
- Modern navigation menu with clear separation of sections.
- Main content area with:
  - Queue Management Panel
  - Customer Registration Form
  - Registered Customers Table
  - **System Management Section**: A primary navigation item leading to sub-sections for **User Management**, **Dropdown Management**, and **Counter Management**.
  - Transaction Reports & Activity Log

### 8.3 Display Monitor UI
- Large font size for visibility from a distance.
- Color-coded indicators for priority status.
- Counter layout arranged in a configurable grid.
- Sound alert triggered via browser audio API.

#### 8.3.1 Recommended External Monitors for Display Monitor
For optimal customer visibility and proper display of the complete interface including the waiting queue section, the following monitor specifications are recommended:

**Minimum Requirements:**
- **Resolution**: 1920×1080 (Full HD) or higher
- **Screen Size**: 24" minimum, 27"-32" preferred
- **Aspect Ratio**: 16:9 or 16:10
- **Orientation**: Landscape (horizontal)

**Recommended Monitor Models:**

**Budget-Friendly Options ($200-400):**
- **ASUS VA24EHE** (24", 1920×1080, IPS) - Great for small to medium spaces
- **LG 24MK430H-B** (24", 1920×1080, IPS) - Excellent color accuracy
- **Samsung F24T450FQN** (24", 1920×1080, IPS) - Good build quality

**Professional Options ($400-800):**
- **Dell P2723DE** (27", 2560×1440, USB-C) - Higher resolution for crisp text
- **LG 27UP850-W** (27", 4K UHD, USB-C) - Premium choice with 4K clarity
- **ASUS ProArt PA278QV** (27", 2560×1440, IPS) - Professional grade

**Large Display Options ($500-1200):**
- **Samsung M7 32"** (32", 4K UHD, Smart Hub) - Large format for bigger waiting areas
- **LG 32UN650-W** (32", 4K UHD, HDR10) - Excellent for lobby displays
- **Dell S3221QS** (32", 4K UHD, Curved) - Immersive viewing experience

**TV Display Options (For Wall Mounting):**
- **Samsung TU7000 43"** (43", 4K UHD) - Perfect for large waiting areas
- **LG UP7000 50"** (50", 4K UHD) - Maximum visibility
- **TCL 4-Series 43"** (43", 4K UHD) - Budget-friendly large display

**Key Features to Look For:**
- ✅ **IPS Panel**: Better viewing angles for customers seated at different positions
- ✅ **1920×1080 minimum**: Ensures all interface elements are visible
- ✅ **VESA Mount Compatible**: For wall mounting in customer areas
- ✅ **Multiple Inputs**: HDMI, USB-C, or DisplayPort for easy connection
- ✅ **Built-in Speakers**: For notification sounds (optional)
- ✅ **Anti-glare Coating**: Reduces reflections in bright environments

**Setup Recommendations:**
- **Mounting Height**: 5-6 feet from floor for optimal viewing
- **Viewing Distance**: 6-12 feet for comfortable reading
- **Browser Zoom**: Set to 100% or 110% for optimal text size
- **Window Size**: Use "New Window" feature for dedicated display
- **Power Management**: Disable sleep mode for continuous operation

### 8.4 Customer Registration Form
- Must be implemented as a multi-step form with a progress indicator to improve usability, especially on mobile devices.
- Inline validation messages for all inputs.
- Dropdowns populated via API calls.

---

## 9. Non-Functional Requirements (NFRs)
| Category | Requirement |
|----------|-------------|
| **Performance** | - API response times for standard GET requests should be under 500ms. <br> - The system should support up to 20 concurrent active users without degradation. <br> - The frontend application should achieve a Lighthouse performance score of 85+ on desktop. |
| **Security** | - All data transmission must be encrypted via HTTPS/TLS. <br> - Passwords must be hashed using a strong, salted algorithm (e.g., Argon2, bcrypt). <br> - All user-generated input must be sanitized on the backend to prevent XSS and SQL Injection attacks. |
| **Reliability** | - The system should target a 99.5% uptime. <br> - The database must be backed up automatically on a daily basis, with a retention period of at least 14 days. |
| **Usability** | - The system must be intuitive enough for a new employee to learn the core functions (registration, payment) within a 30-minute training session. |

---

## 10. Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd escashop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
   - Configure your database connection and other settings

4. **Start development servers**
   ```bash
   npm run dev
   ```
   
   This command launches both the backend API (port 5000) and frontend React app (port 3000) concurrently with separated logs.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | **Primary development command** - Runs both backend and frontend servers concurrently |
| `npm run dev:backend` | Runs only the backend server in development mode |
| `npm run dev:frontend` | Runs only the frontend React development server |
| `npm run build` | Builds both backend and frontend for production |
| `npm start` | Starts the production backend server |

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs (if available)

### Troubleshooting

**Login Issues:**
- Ensure both servers are running (`npm run dev`)
- Check that the backend is accessible at http://localhost:5000
- Verify database connection in backend logs
- Check browser console for network errors
- Default admin credentials should be available in your database setup

**Port Conflicts:**
- Backend uses port 5000, frontend uses port 3000
- If ports are in use, update the configuration in the respective `.env` files

**Database Issues:**
- Ensure PostgreSQL is running and accessible
- Check database connection string in `backend/.env`
- Run database migrations if needed

### RBAC & Permission Issues

**INSUFFICIENT_PERMISSIONS Errors:**
1. **Check User Role**: Verify the logged-in user has the required role
   ```bash
   # Use debug endpoint to check token info
   GET /api/debug/token-info
   Authorization: Bearer <your-token>
   ```

2. **Debug Token Contents**: Use JWT debugging tools
   ```bash
   # Test specific role permissions
   POST /api/debug/test-permissions
   {
     "test_role": "admin",
     "required_roles": ["admin", "super_admin"]
   }
   ```

3. **Check Server Logs**: Look for detailed access denied messages
   ```
   Access denied for user john@example.com (cashier) to /api/admin/users.
   Required roles: admin, super_admin
   ```

4. **Role Hierarchy**: Ensure you understand the role hierarchy
   - SUPER_ADMIN (Level 4) - Highest privileges
   - ADMIN (Level 3) - Administrative functions  
   - SALES (Level 2) - Sales operations
   - CASHIER (Level 1) - Basic cashier operations

**Missing SUPER_ADMIN Role:**
- Update database constraints to allow SUPER_ADMIN role:
  ```sql
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'admin', 'sales', 'cashier'));
  ```

### WebSocket Connection Issues

**Connection Failures:**
1. **Check WebSocket URL**: Ensure correct WebSocket endpoint
   ```javascript
   const socket = io('ws://localhost:5000', {
     auth: { token: 'your-jwt-token' }
   });
   ```

2. **Authentication Issues**: Verify JWT token is valid and included
   ```javascript
   // Check token in browser storage
   const token = localStorage.getItem('accessToken');
   console.log('Token:', token);
   ```

3. **Network Tab Debugging**: Check browser DevTools → Network tab
   - Look for WebSocket connection attempts
   - Check for 401/403 authentication errors
   - Verify WebSocket upgrade headers

**Payment Status Update Issues:**
1. **Subscription Problems**: Ensure proper subscription to payment events
   ```javascript
   socket.emit('subscribe:payment_status');
   
   socket.on('payment_status_updated', (data) => {
     console.log('Payment update:', data);
   });
   ```

2. **Role-Based Access**: Verify user role allows payment subscriptions
   - Admin: Full access to all payment updates
   - Cashier: Updates for transactions they handle
   - Sales: Updates for transactions they created

3. **Event Structure**: Check received event payload format
   ```javascript
   {
     transactionId: number,
     payment_status: string,      // 'unpaid', 'partial', 'paid'
     balance_amount: number,      // Remaining balance
     paid_amount: number,         // Amount already paid
     customer_id: number,
     or_number: string,
     updatedBy: string,
     timestamp: Date
   }
   ```

**Settlement Processing Issues:**
1. **Database Deadlocks**: If experiencing concurrent settlement issues
   - Avoid rapid successive settlement requests
   - Check server logs for deadlock error messages
   - Implement client-side rate limiting

2. **Processing Loops**: Signs of recursive status recalculation
   ```
   # Look for these patterns in logs:
   Multiple concurrent INSERT operations
   UPDATE transactions stuck in loops
   WebSocket event multiplication
   ```

3. **Lock Contention**: Database connection issues during settlements
   - Monitor PostgreSQL connections: `SELECT * FROM pg_stat_activity;`
   - Check for idle in transaction states
   - Restart application if persistent deadlocks occur

### Contributing

For new contributors:
1. Follow the development setup above
2. Run `npm run dev` to start both servers
3. Frontend will be available at http://localhost:3000
4. Backend API will be available at http://localhost:5000
5. Make your changes and test thoroughly
6. Submit a pull request with a clear description of changes

### CI/CD Pipeline

The project includes GitHub Actions workflows that automatically:

**Build and Test Workflow** (`.github/workflows/build-and-test.yml`):
- Runs on every push to `main`/`develop` branches and pull requests
- Installs dependencies with `npm ci`
- Builds backend with `npm run build --workspace=backend`
- Runs backend tests with `npm test --workspace=backend`
- Builds frontend with `npm run build --workspace=frontend`
- Runs frontend tests with `npm test --workspace=frontend`
- Verifies backend can start successfully

**Security Workflows**:
- Comprehensive security scanning including SAST, DAST, and dependency checks
- Runs on push, PR, and daily schedules
- Generates security dashboards and alerts

**Why CI Matters**:
- **Prevents 404 errors** by ensuring builds complete successfully
- **Catches regressions** before they reach production
- **Maintains code quality** through automated testing
- **Ensures server startup** to prevent deployment failures

**Branch Protection**:
It's recommended to enable branch protection rules requiring:
- CI checks to pass before merging
- At least one code review
- Up-to-date branches before merging
