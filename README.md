# MITS College, Gwalior – Library Management System (LMS)
## Enterprise Multi-Role LMS (Admin Panel + Student/Faculty Portal)

A professional, modern, fully functional Library Management System developed for **Madhav Institute of Technology & Science (MITS), Gwalior**.

Built using **React + Vite.js**, **Tailwind CSS**, **Lucide Icons**, and an **ACID-compliant reactive synchronization database engine**.

---

### Developed By
- **Ankush Sharma** – IT Department (2025–2029)
- **Deepesh Kushwah** – IT Department (2025–2029)

---

## 🚀 Live Demo & How to Run

1. **Development Server is already running on:**
   - **Local URL:** `http://localhost:5173`
   - **Network URL:** `http://10.228.233.9:5173`

2. **To start the server anytime in the future:**
   - Double-click `start-dev.bat`, OR
   - Run in PowerShell:
     ```powershell
     .\node-env\node.exe .\node_modules\vite\bin\vite.js --host
     ```

---

## 🔑 Demo Login Credentials

### 1. Admin Login (Full Superuser Access)
- **Email:** `admin@mitsgwalior.in`
- **Password:** `admin123`
- *Or select Dr. R. K. Singh from the "Sign in with Google" simulator.*

### 2. Student Login
- **Enrollment Number:** `0901IT251014` (Ankush Sharma) or `0901IT251028` (Deepesh Kushwah)
- **Email:** `ankush.it25@mitsgwl.ac.in` / `deepesh.it25@mitsgwl.ac.in`

### 3. Faculty Login
- **Email:** `rajeev.singh@mitsgwalior.in` (Dr. Rajeev Kumar Singh) or `r.verma@mitsgwalior.in`

---

## 🌟 Implemented Features & Architecture

### 1. Authentication & Security
- **Strict Role-Based Access Control (RBAC):** Admin Dashboard routes are isolated and protected. Non-administrators cannot access administrative controls.
- **Institute Domain Enforcement:**
  - `@mitsgwalior.in` for Faculty
  - `@mitsgwl.ac.in` for Students
- **Interactive Google Single Sign-On (SSO):** Quick institutional account picker with realistic profile avatars.
- **Direct Role / Admin Login Fallback:** Allows manual email/password login with input validation.

### 2. Admin Executive Dashboard (The 7 Horizontal Information Boxes)
- **Box 1: Number of Students**:
  - Live calculated count of registered students and active status badge.
  - Clicking opens the **Student Management Panel** with search, department filtering, currently issued books ledger, and account suspension/reactivation actions.
- **Box 2: Number of Books**:
  - Displays total catalog count and real-time available copies.
  - Complete collection management: Add new books, Edit details, Delete books, upload cover images, barcode numbers, ISBN, and stock control.
- **Box 3: Total Book Activity**:
  - Complete historical count of all books issued (returned + active).
  - Clicking opens the full transaction audit ledger.
- **Box 4: Currently Issued Books & Return Desk**:
  - Displays unreturned books count and live overdue alerts.
  - "Acknowledge Return" action automatically increases library shelf stock by 1 copy and clears student loan status.
- **Box 5: Automated Email & Fine Dispatcher**:
  - Automated background scheduler:
    - **1st Reminder:** Dispatched 7 days before due date.
    - **2nd Reminder:** Dispatched 1 day before due date.
    - **Overdue Penalty Notice:** Dispatched immediately upon overdue with late-return fine calculation (₹10/day).
    - **Account Suspension:** Disciplinary hold applied if fines exceed threshold or return delay exceeds 30 days.
  - Live dispatch log table with recipient, action, and "Delivered" status.
  - SMTP configuration modal with live handshake diagnostics.
- **Box 6: Smart Book Issuing Hub**:
  - **Method 1: Physical Barcode Camera Scanner**:
    - Step 1: Scan Book Barcode (or manual input/USB scanner).
    - Step 2: Scan Student Library Card Barcode.
    - Step 3: Verify stock & borrowing limits, calculate return due date, and confirm issuance.
  - **Method 2: Online Student Request Queue**:
    - Students reserve/request books online.
    - Librarian can **Accept Request** (issues book, deducts stock, sets due date) or **Reject Request** (logs reason).
- **Box 7: Complete Transaction History**:
  - Filterable by book name, barcode, student name, enrollment, issue method, and status.
  - Downloadable CSV reports.

### 3. Student & Faculty Dashboard
- Modern dark-themed reading interface inspired by modern college libraries.
- "Previous Reading" / Currently Issued Books carousel with days remaining countdown.
- Subjects section: Science, Design, Arts, Commerce, Cooking, Others.
- Live book details modal with instant "Request Book Issue" button.
- Digital Library Card with personalized barcode for quick counter checkouts.

### 4. Database & Synchronization Architecture
- Central reactive database with LocalStorage persistence.
- Concurrency locks preventing negative inventory counts.
- Cross-tab and cross-component instant synchronization.
