# 🛡️ Zido HACCP Application - Source & VPS Deployment Guide

Welcome to the complete source codebase for **Zido HACCP**, a modern web application for Food Safety Management, Hygiene Compliance, Temperature Monitoring, Cleaning Plans, and Audit Reporting.

---

## 🚀 1-Click Automatic VPS Deployment (Recommended)

To deploy this application on your Linux VPS (Ubuntu / Debian):

1. **Upload and extract the ZIP archive** on your VPS:
   ```bash
   unzip haccp-app-final-delivery.zip -d /var/www/haccp
   cd /var/www/haccp
   ```

2. **Make `deploy.sh` executable and run it with your domain name**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh your-domain.com
   ```

### What `deploy.sh` automatically does on your VPS:
- ✅ Installs Docker, Docker Compose, Nginx, and Certbot.
- ✅ Launches PostgreSQL (port 5432) & NestJS Backend API (port 3000) via Docker.
- ✅ Runs Prisma database migrations and seeds initial admin accounts.
- ✅ Configures Nginx reverse proxy serving React frontend under `/` and API under `/api`.
- ✅ Reloads Nginx and provides SSL Certbot HTTPS activation commands.

---

## 🌐 Enabling Free HTTPS SSL Certificate

After running `./deploy.sh your-domain.com`, secure your domain with Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🛠️ Local Development & Testing

### Prerequisites
- **Node.js** v20+
- **Docker Desktop** & **Docker Compose**

### Running Local Backend & Database
```bash
docker-compose up --build -d
```

### Running Local Frontend
```bash
# Serve Web App on Port 5173
npx serve web -s -l 5173

# Serve Marketing Site on Port 5174
npx serve website -s -l 5174
```

Access Points:
- 🌐 **Web App**: [http://localhost:5173](http://localhost:5173)
- 📖 **Marketing Site**: [http://localhost:5174](http://localhost:5174)
- ⚡ **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 🔑 Demo & Test Accounts

Use these pre-seeded credentials to test all roles:

| Role | Email | Password | Subscription Status |
| :--- | :--- | :--- | :--- |
| **OWNER** (Establishment Owner) | `admin@haccp.local` | `Admin123!` | Active (Sérénité Plan) |
| **PLATFORM ADMIN** | `shiftup01@gmail.com` | `Lesucre3107(` | Active |

---

## ✨ Features & Implemented Fixes

### 1. 🌡️ Equipment & Temperature Monitoring (`/equipment`, `/temperatures`)
- **Unblocked Temperature Input**: Unchecked "Aucune limite" enables text input fields immediately without HTML `disabled` attributes.
- **High-Temperature Support (> 73°C)**: Full support for hot holding units, bain-maries, ovens, and fryers (up to 100°C - 200°C).
- **Incident Detection**: Automated alert generation for out-of-range temperature readings.

### 2. 🧹 Cleaning Plan & Subsectors (`/cleaning`)
- **Full 4-Level Hierarchy**: Sectors ➔ Sub-sectors ➔ Equipment ➔ Tasks.
- **Inline React Subsector Modifier**: Explicit `✏️ Modifier` button to rename sub-sectors directly in the page without browser prompt popups.
- **Subsector Equipment Selector**: `📋 Mes Équipements` dropdown menu to select pre-registered equipment when configuring cleaning sub-sectors.

### 3. 🧪 Oil Management (`/oil`)
- Polar test tracking, TPM ratios, and fryer oil drain log history.

### 4. 📦 Product Traceability & Goods Reception (`/traceability`, `/reception`)
- Batch number tracking, DLC expiration alerts, and multi-temperature goods reception logs (Fresh, Dry, Frozen).

### 5. 📄 Reports & PDF Exports (`/exports`)
- One-click PDF export generation for HACCP compliance audits.

---

## 📁 Architecture Overview

```
haccp/
├── deploy.sh               # 🚀 Automatic 1-Click VPS Deployment Script
├── src/                    # NestJS Backend API Source Code
│   ├── auth/               # JWT Authentication & Authorization Guards
│   ├── cleaning/           # Cleaning Sectors, Subsectors & Tasks Controller/Service
│   ├── equipment/          # Equipment & Temperature Log Management
│   ├── oil/                # Fryer Oil Control Management
│   ├── traceability/       # DLC & Batch Tracking
│   └── main.ts             # Application Entry Point & CORS Whitelist
├── prisma/
│   └── schema.prisma       # Database Schema & Models
├── web/                    # Production React SPA Build Assets
├── website/                # Marketing Website Build Assets
├── docker-compose.yml      # Docker Orchestration Manifest
├── Dockerfile              # Production Node 20 Docker Build
└── .env                    # Environment Configuration File
```

---
*Zido HACCP App — Delivery Ready 🚀*
