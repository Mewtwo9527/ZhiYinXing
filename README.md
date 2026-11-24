# 🎓 ZhiYinXing (职引星)
### Blockchain-Empowered Intelligent Campus Recruitment & Credible Talent Evaluation System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.0-lightgrey.svg)](https://soliditylang.org/)

---

## 📌 Introduction

**ZhiYinXing (职引星)** is an enterprise-grade campus recruitment and talent assessment system. By combining **Artificial Intelligence (semantic resume parsing & intelligent job matching)** with **Blockchain technology (EVM smart contracts for credible evidence storage)**, the platform establishes a transparent, tamper-proof, and closed-loop recruitment ecosystem for **Students**, **Enterprises**, **Universities**, and **Administrators**.

---

## 🚀 Key Features

- **🤖 Intelligent Job-Talent Matching & Resume Parsing**:
  - Automatically parses PDF and Word (`.docx`) resumes into structured profiles.
  - Computes multi-dimensional matching scores between student skill profiles and job requirements.
  - Provides AI-powered resume diagnosis and competency radar visualizations.

- **⛓️ Blockchain-Backed Credible Evidence**:
  - Uses EVM smart contracts (`ResumeEvidence.sol`) to log job application hashes, academic credentials, and tamper-proof audit trails.
  - Eliminates resume embellishment and ensures verifiable trustworthiness across all stakeholders.

- **👥 Multi-Role Collaborative Portals**:
  - **Student**: Smart job search, resume diagnosis, one-click application, and blockchain verification.
  - **Enterprise**: Job postings, applicant tracking, candidate evaluation, and credible resume auditing.
  - **University**: Graduate employment statistics, student credential verification, and enterprise engagement.
  - **Administrator**: User permissions, system configuration, audit logs, and global analytics.

- **📊 Visual Analytics & Communication**:
  - Real-time in-app messaging and notification center.
  - Interactive charts (ECharts / Recharts) for recruitment funnels and employment statistics.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Ant Design (AntD), Tailwind CSS, Zustand, React Router, ECharts / Recharts, Axios
- **Backend**: Node.js, Express 5, Ethers.js, JWT, Multer, Mammoth, pdf-parse, Nodemailer
- **Blockchain**: Solidity (`^0.8.0`), EVM-Compatible Network (Ethereum / Sepolia)
- **Database**: MySQL 8.x (`mysql2`)

---

## 📂 Project Structure

```text
├── backend/                  # Express.js backend API server
│   ├── contracts/            # Solidity smart contracts (ResumeEvidence.sol)
│   ├── src/                  # Controllers, routes, middlewares, utils
│   ├── uploads/              # Local storage for uploaded files (.gitkeep)
│   ├── .env.example          # Template for backend environment variables
│   └── package.json
├── frontend/                 # React 19 + Vite frontend application
│   ├── src/                  # React components, pages, api services, store
│   └── package.json
├── database/                 # Database schema & initialization scripts
│   └── zhiyinxing.sql
├── .gitignore                # Git ignore configuration
└── README.md                 # Project documentation
```

---

## ⚡ Quick Start

### 1. Database Initialization
Create the database in MySQL and import the schema:
```bash
mysql -u root -p < database/zhiyinxing.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env    # Fill in your database credentials, RPC URL, and API keys
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
