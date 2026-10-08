# 🚀 Anurag Space Research Center (ASRC)
### Interdisciplinary Space Science & Engineering Operations Portal
**Anurag University** · *Collaborate · Build · Innovate · Launch*

🌐 **Live Production Portal**: [https://anuragspaceresearchcenter.web.app](https://anuragspaceresearchcenter.web.app)

---

## 📌 Executive Overview

The **Anurag Space Research Center (ASRC)** portal is an enterprise-grade, cloud-native research workspace built to coordinate aerospace engineering projects, student-led space missions, telemetry benchmarks, and institutional scientific dispatches at Anurag University.

The system features real-time cloud data synchronization, Google Workspace institutional authentication, division-level task tracking, budget management, and a technical learning hub.

---

## 🛠️ Technology Stack & Architecture

### **Frontend Infrastructure**
* **Framework**: React 18 (TypeScript) with Vite
* **Styling**: Tailwind CSS with custom theme design system & Google Fonts (*Plus Jakarta Sans* & *Inter*)
* **Routing**: React Router 7 (Single Page Application architecture with rewrite rules)
* **Icons**: Lucide React

### **Cloud & Database Services**
* **Authentication**: Firebase Auth (Google Workspace SSO & Institutional Email Integration)
* **Database**: Cloud Firestore (Real-time NoSQL document database for accounts, tasks, announcements, budget entries, and team memberships)
* **Hosting**: Firebase Hosting (Global CDN Edge Network)

### **Backend Microservice**
* **Framework**: Java 17 + Spring Boot 3
* **Security**: Spring Security + OAuth2 / JWT verification
* **Data Layer**: JDBC / PostgreSQL / MySQL parameter support

---

## ⚡ Key System Features

### 1. 🔐 Cloud Authentication & Role-Based Access Control
* **Google Workspace SSO**: Instant sign-in using institutional credentials (`@anurag.edu.in`).
* **Automatic Role Delegation**:
  * **Developer**: Full system administration, access invite management, and platform analytics.
  * **Admin / Faculty**: Announcement dispatches, task assignment, and budget allocations.
  * **Student Researcher**: Division participation, task execution, and learning hub access.

### 2. 📡 Research & Engineering Divisions
* **CANSAT**: Micro-satellite telemetry & flight hardware.
* **CUBESAT**: Nanosatellite structural & orbital design.
* **ROCKET**: High-altitude propulsion & recovery avionics.
* **ROVER**: Autonomous planetary traversal & mobility.
* **ASTRONOMY**: Observational astrophysics & payload optics.

### 3. 📋 Mission Operations Console
* **Task Assignment**: Admins can delegate specific milestones to registered researchers.
* **Task Execution**: Interactive progress toggles with real-time status updates stored in Cloud Firestore.
* **Division Membership**: Student researchers can submit join requests for active engineering divisions.

### 4. 📢 Institutional Dispatches & Event Scheduling
* **Announcements**: Category-filtered dispatches (Symposiums, Hackathons, Design Reviews, News).
* **Calendar Integration**: One-click **ICS calendar file generation** (`.ics`) for syncing milestones with Google Calendar / Apple Calendar.

### 5. 💰 Financial & Budget Management
* **Budget Tracking**: Division fund allocation vs. recorded expenses.
* **CSV Export**: Automated report generation and expense ledger downloads.

### 6. 📚 Student Learning Hub
* Self-paced academic modules, flight system documentation, and reference links to NASA, ISRO, ESA, and MIT OpenCourseWare.

---

## 📂 Project Directory Structure

```
project/
├── firebase.json               # Firebase Hosting & Firestore configuration
├── firestore.rules             # Cloud Firestore security rules
├── firestore.indexes.json      # Cloud Firestore indexes
├── README.md                   # System documentation
├── frontend/                   # Standalone Frontend React + TypeScript application
│   ├── index.html              # HTML entry point with Google Fonts preloads
│   ├── package.json            # Frontend dependencies and scripts
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vite.config.ts          # Vite build configuration
│   └── src/                    # Modular React / TypeScript source code
│       ├── main.tsx            # Application bootstrap
│       ├── App.tsx             # Core router & navigation controller
│       ├── firebase.ts         # Firebase Web SDK initialization
│       ├── firestoreService.ts # Firestore API integration service
│       ├── api.ts              # Backend discovery & API client
│       ├── Resources.tsx       # Technical learning hub view
│       ├── GoogleSignIn.tsx    # Institutional sign-in component
│       ├── types/              # Workspace types
│       ├── constants/          # Constants & dataset
│       ├── utils/              # Formatters & utilities
│       └── components/         # Reusable UI & workspace components
└── backend/                    # Standalone Spring Boot 3 Java backend service
    ├── pom.xml                 # Maven build manifest
    ├── Dockerfile              # Container deployment file
    └── src/main/java/org/anurag/research/ # Spring Boot controllers & security filters
```

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* **Java SDK** (v17 or higher, for backend development)
* **Maven** (optional, included wrapper)

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:8443` or `http://localhost:5173`.

### 2. Backend Setup (Optional Spring Boot Service)
```bash
cd backend

# Compile and run Spring Boot backend
mvn spring-boot:run
```
The backend REST API will run on `http://localhost:8080`.

---

## ☁️ Deployment & Production Build

### Building for Production
```bash
npm run build
```
This compiles the TypeScript code and places the optimized static assets into the `dist/` directory.

### Deploying to Firebase Cloud
```bash
npx firebase-tools deploy --only hosting --project figma-make-app-2026
```

---

## 📄 License & Institutional Rights

© 2026 **Anurag Space Research Center · Anurag University**. All Rights Reserved.
