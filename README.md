# VEYRA — Credit Card Fraud Detection System

> **VEYRA** is the application brand for the **Credit Card Fraud Detection System** — an end-to-end fraud-screening platform that combines machine learning, explainable AI, deterministic risk rules, and a full-stack analyst workspace.
>
> **Tagline:** *Intelligent transaction screening, explanation, and risk analysis.*

---

## Table of Contents

* [Overview](#overview)
* [What the Project Does](#what-the-project-does)
* [What Was Worked On](#what-was-worked-on)
* [Features](#features)
* [Application Workflow](#application-workflow)
* [Architecture](#architecture)
* [Technology Stack](#technology-stack)
* [Project Folder Structure](#project-folder-structure)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Running the Project Locally](#running-the-project-locally)
* [Database Setup](#database-setup)
* [Demo Accounts](#demo-accounts)
* [Configuration](#configuration)
* [Using the Application](#using-the-application)
* [Batch CSV Format](#batch-csv-format)
* [Machine Learning Pipeline](#machine-learning-pipeline)
* [Training the Model](#training-the-model)
* [Model Artifacts](#model-artifacts)
* [Dataset](#dataset)
* [API Reference](#api-reference)
* [Testing](#testing)
* [Docker Compose](#docker-compose)
* [Background Video](#background-video)
* [Security](#security)
* [Responsible AI and Limitations](#responsible-ai-and-limitations)
* [Development Workflow](#development-workflow)
* [Contributing](#contributing)
* [License](#license)

---

# Overview

**VEYRA** is a full-stack AI-powered credit-card fraud-screening system developed as an educational, engineering, and portfolio project.

The system combines:

* Machine-learning fraud detection.
* XGBoost classification.
* SHAP explainability.
* Deterministic rule-based signals.
* JWT authentication.
* Transaction history.
* High-risk alerts.
* CSV batch screening.
* Model-performance monitoring.
* Analyst-oriented dashboards.
* Responsive React frontend.
* FastAPI backend.
* Database persistence.
* Automated testing.

The primary purpose is to answer two questions:

> **Is this transaction suspicious?**

and:

> **Why did the system produce this result?**

The application generates **LOW**, **MEDIUM**, or **HIGH** risk screening signals. These results are designed for analyst review and are **not automated banking decisions**.

---

# What the Project Does

Credit-card fraud detection is a challenging machine-learning problem because fraudulent transactions are extremely rare compared with legitimate transactions.

VEYRA addresses this challenge through a multi-layered screening process.

## 1. Machine Learning

The system uses an **XGBoost classification model** to estimate the probability that a transaction is fraudulent.

The model works with anonymized transaction features such as:

```text
Time
V1
V2
V3
...
V28
Amount
```

The result is converted into a screening risk level:

```text
LOW
MEDIUM
HIGH
```

using the active model threshold.

---

## 2. Deterministic Rule Engine

In addition to the ML model, the application evaluates predefined deterministic rules.

These rules can identify suspicious transaction characteristics independently of the model.

For example:

```text
amount_anomaly
```

A rule signal provides an additional transparent explanation that an analyst can inspect.

---

## 3. Explainable AI with SHAP

The system uses **SHAP TreeExplainer** to explain how individual features influenced the model prediction.

Instead of returning only:

```text
Fraud probability: 99.4%
```

the system can provide information about:

```text
Why the model produced this score
Which features increased the score
Which features reduced the score
Which features had the strongest influence
```

This makes the application more useful for investigation and model governance.

---

## 4. Transaction Persistence

Each screening is stored in the application's database.

This enables:

* Transaction history.
* Activity tracking.
* Detailed transaction views.
* Local explanations.
* High-risk alerts.
* Dashboard statistics.

---

## 5. Batch Screening

The application also supports CSV uploads.

Instead of analyzing one transaction at a time, an analyst can upload a dataset containing many anonymized transactions.

The system validates the file and processes the batch asynchronously using the Celery/Redis architecture when configured.

---

# What Was Worked On

The project development covered both **software engineering** and **machine-learning engineering**.

## Backend Development

The FastAPI backend was developed with versioned API routes under:

```text
/api/v1
```

Major backend areas include:

* Authentication.
* Authorization.
* Transaction screening.
* Batch processing.
* Transaction storage.
* Alerts.
* Model information.
* Model metrics.
* Explainability.
* Health monitoring.

The backend also includes:

* Pydantic request/response validation.
* SQLAlchemy database models.
* Alembic migrations.
* JWT authentication.
* Password hashing.
* Rate limiting.
* Model artifact management.
* Audit-oriented storage.

---

## Machine-Learning Development

The ML pipeline was developed around the anonymized credit-card fraud dataset.

The work includes:

* Dataset loading.
* Exploratory data analysis.
* Feature preparation.
* Baseline Logistic Regression.
* XGBoost modeling.
* Model comparison.
* Hyperparameter tuning.
* Threshold optimization.
* Evaluation metrics.
* Confusion matrix analysis.
* SHAP explainability.
* Versioned model artifacts.

---

## Frontend Development

A complete React-based analyst workspace was developed.

The application includes screens for:

* Landing.
* Login.
* Registration.
* Overview.
* Transaction screening.
* Batch analysis.
* Activity.
* Alerts.
* Model performance.
* Explainability.
* About.

The frontend was designed around the **VEYRA** brand and a premium fintech interface.

---

## UI/UX Development

The interface was refined toward a:

* Minimal.
* Premium.
* Professional.
* Classic fintech.
* Analyst-oriented

visual style.

The major UI work included:

* Shared design system.
* Consistent typography.
* Solid premium panels.
* Risk badges.
* Tables.
* Charts.
* Forms.
* Responsive layouts.
* Loading states.
* Empty states.
* Error states.
* Screening result states.
* Background-video integration.
* Reduced-motion support.

The video is decorative and does not affect application functionality.

---

## Authentication and End-to-End Integration

The project also includes end-to-end authentication functionality:

```text
Register
   ↓
Login
   ↓
Access Token
   ↓
Protected Application
   ↓
Authenticated API Requests
   ↓
Logout / Token Revocation
```

The frontend communicates with the FastAPI backend through the API layer.

---

# Features

## Authentication

* User registration.
* Login.
* JWT access tokens.
* JWT refresh tokens.
* Token refresh.
* Logout.
* Token revocation.
* Current-user endpoint.
* Analyst role.
* Admin role.
* Login rate limiting.

---

## Transaction Screening

The core feature of VEYRA.

Users can provide:

* Transaction amount.
* Timestamp.
* Optional external reference.
* V1–V28 anonymized features.

The application then runs:

```text
Validation
    ↓
Feature preparation
    ↓
ML prediction
    ↓
Rule evaluation
    ↓
SHAP explanation
    ↓
Database persistence
    ↓
Risk classification
```

The resulting screen contains information such as:

* Fraud probability.
* Risk level.
* Model prediction.
* Threshold.
* Model version.
* Triggered rules.
* SHAP contribution.
* Human-readable explanation.
* Screening timestamp.

---

## Demo Transactions

The screening page includes sample inputs that allow the complete workflow to be tested without manually entering every feature.

These demo inputs are clearly intended for demonstration purposes.

The result still comes from the actual screening pipeline.

---

## Batch Analysis

Users can upload CSV files containing multiple transactions.

The batch workflow supports:

* File upload.
* Schema validation.
* Required-column validation.
* Upload-size restrictions.
* Row limits.
* Asynchronous processing.
* Job status.
* Progress information.
* Job history.
* Results download.

---

## Activity Ledger

The Activity page provides a persistent transaction ledger.

It supports information such as:

* Transaction reference.
* Date/time.
* Risk level.
* Prediction.
* Amount.
* Screening status.
* Transaction details.

Filtering and pagination are available through the API and frontend.

---

## Alerts

The Alerts page provides a review queue for recent high-risk transactions.

Analysts can inspect:

* Risk probability.
* Amount.
* Triggered rule.
* Detection time.
* Related transaction.
* Explanation.

---

## Model Performance

The Model Performance page provides model governance information.

It can display:

* Model version.
* Training metadata.
* Features.
* Dataset information.
* Precision.
* Recall.
* F1 score.
* PR-AUC.
* ROC-AUC.
* Confusion matrix.
* Threshold behavior.

---

## Explainability

VEYRA supports two types of explainability.

### Global Explainability

Shows which features are generally most important to the model.

### Local Explainability

Shows why a particular transaction received its score.

The local explanation can show:

```text
Positive contribution
Negative contribution
Feature name
Feature impact
Overall interpretation
```

---

## Responsive UI

The frontend is designed for:

* Desktop.
* Laptop.
* Tablet.
* Mobile.

The UI uses responsive layouts and avoids unnecessary horizontal overflow on smaller screens.

---

# Application Workflow

The overall analyst workflow is:

```text
           ┌───────────────┐
           │    ANALYZE    │
           │ Screen a txn  │
           └───────┬───────┘
                   ↓
           ┌───────────────┐
           │    EXPLAIN    │
           │ SHAP + Rules  │
           └───────┬───────┘
                   ↓
           ┌───────────────┐
           │    REVIEW     │
           │ Activity +    │
           │ Alerts        │
           └───────┬───────┘
                   ↓
           ┌───────────────┐
           │    MONITOR    │
           │ Dashboard +   │
           │ Model metrics │
           └───────────────┘
```

---

# Architecture

```text
┌─────────────────────────────── Browser ───────────────────────────────┐
│                                                                       │
│                  React 18 + TypeScript + Vite                         │
│                                                                       │
│  VEYRA Analyst Workspace                                              │
│                                                                       │
│  Overview · Screening · Batch · Activity · Alerts                    │
│  Model Performance · Explainability · About                          │
│                                                                       │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
                               │ HTTP / JSON
                               ▼
┌──────────────────────────── FastAPI ───────────────────────────────────┐
│                                                                       │
│                         /api/v1                                      │
│                                                                       │
│  Auth · Screening · Batch · Transactions · Model · Alerts            │
│                                                                       │
│  Services:                                                            │
│  ├── Model Registry                                                   │
│  ├── Model Service                                                    │
│  ├── Scoring                                                          │
│  ├── Rule Engine                                                      │
│  ├── Storage                                                           │
│  ├── Audit                                                             │
│  ├── Rate Limiting                                                     │
│  └── Token Store                                                       │
│                                                                       │
│  ML:                                                                  │
│  Features → XGBoost → SHAP                                            │
│                                                                       │
└───────────────┬──────────────────┬───────────────────┬─────────────────┘
                │                  │                   │
                ▼                  ▼                   ▼
        PostgreSQL / SQLite       Redis          Model Artifacts
        SQLAlchemy + Alembic     Celery          artifacts/models/
                │                  │
                └────────────┬─────┘
                             ▼
                      Celery Worker
                   Async Batch Processing
```

---

# Technology Stack

## Backend

| Area                | Technology       |
| ------------------- | ---------------- |
| API                 | FastAPI          |
| Server              | Uvicorn          |
| Validation          | Pydantic v2      |
| ORM                 | SQLAlchemy 2     |
| Migrations          | Alembic          |
| Authentication      | PyJWT            |
| Password hashing    | pwdlib / Argon2  |
| File handling       | python-multipart |
| Task queue          | Celery           |
| Broker              | Redis            |
| Local database      | SQLite supported |
| Production database | PostgreSQL       |

---

## Machine Learning

| Area                | Technology   |
| ------------------- | ------------ |
| Data processing     | Pandas       |
| Numerical computing | NumPy        |
| Baseline model      | scikit-learn |
| Main model          | XGBoost      |
| Explainability      | SHAP         |
| Model persistence   | Joblib       |
| Visualization       | Matplotlib   |

---

## Frontend

| Area         | Technology      |
| ------------ | --------------- |
| UI framework | React 18        |
| Language     | TypeScript      |
| Build tool   | Vite            |
| Routing      | React Router    |
| Server state | TanStack Query  |
| Client state | Zustand         |
| HTTP client  | Axios           |
| Forms        | React Hook Form |
| Validation   | Zod             |
| Styling      | Tailwind CSS    |
| Charts       | Recharts        |
| Icons        | lucide-react    |
| Animation    | Framer Motion   |

---

## Testing and DevOps

* Pytest.
* HTTPX.
* Vitest.
* React Testing Library.
* GitHub Actions.
* Docker.
* Docker Compose.
* Nginx.

---

# Project Folder Structure

```text
CREDIT CARD FRAUD DETECTION SYSTEM/
│
├── backend/
│   │
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── screening.py
│   │   │       ├── batch.py
│   │   │       ├── transactions.py
│   │   │       ├── model.py
│   │   │       ├── alerts.py
│   │   │       └── health.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── dependencies.py
│   │   │   └── logging.py
│   │   │
│   │   ├── db/
│   │   │   ├── models/
│   │   │   ├── session.py
│   │   │   └── seed.py
│   │   │
│   │   ├── schemas/
│   │   │   └── API request/response schemas
│   │   │
│   │   ├── services/
│   │   │   ├── model_registry
│   │   │   ├── model_service
│   │   │   ├── scoring
│   │   │   ├── rule_engine
│   │   │   ├── storage
│   │   │   ├── audit
│   │   │   ├── rate_limit
│   │   │   └── token_store
│   │   │
│   │   └── fraud_detector/
│   │       ├── data/
│   │       ├── features/
│   │       ├── models/
│   │       ├── evaluation/
│   │       └── explainability/
│   │
│   ├── alembic/
│   ├── tests/
│   ├── train_model.py
│   └── requirements.txt
│
├── frontend/
│   │
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HeroLanding
│   │   │   ├── Login
│   │   │   ├── Register
│   │   │   ├── Overview
│   │   │   ├── Screening
│   │   │   ├── BatchAnalysis
│   │   │   ├── Activity
│   │   │   ├── Alerts
│   │   │   ├── ModelPerformance
│   │   │   ├── Explainability
│   │   │   └── About
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── ui/
│   │   │   ├── charts/
│   │   │   ├── tables/
│   │   │   └── brand/
│   │   │
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── app/
│   │   ├── styles/
│   │   └── types/
│   │
│   └── public/
│       └── videos/
│           └── credit-card-fraud-background.mp4
│
├── data/
│   ├── README.md
│   ├── raw/
│   └── processed/
│
├── artifacts/
│   └── models/
│
├── results/
│
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_baseline_model.ipynb
│   └── 03_model_comparison.ipynb
│
├── redesign-shots/
│
├── docker-compose.yml
├── Makefile
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
│
└── README.md
```

---

# Prerequisites

Recommended environment:

| Tool       | Version                   |
| ---------- | ------------------------- |
| Python     | 3.11+                     |
| Node.js    | 20+                       |
| npm        | 9+                        |
| PostgreSQL | 16+ if PostgreSQL is used |
| Redis      | 7+ for Celery worker      |
| Docker     | Optional                  |

### For the simplest local setup

You only need:

* Python.
* Node.js.
* npm.

The current project can run locally using **SQLite**, so PostgreSQL is not required for the basic development workflow.

Redis is primarily required when running the asynchronous Celery batch-processing workflow.

---

# Installation

## 1. Clone the Repository

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd "CREDIT CARD FRAUD DETECTION SYSTEM"
```

---

## 2. Create Python Virtual Environment

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Install Backend Dependencies

```powershell
cd backend
pip install -r requirements.txt
cd ..
```

---

## 4. Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

---

# Running the Project Locally

The current local setup can be run using **two terminals**.

## Terminal 1 — Backend

From the project root:

```powershell
cd "C:\Users\varsh\Downloads\CREDIT CARD FRAUD DETECTION SYSTEM"
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="sqlite:///./dev.db"
cd backend
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

### Swagger API Documentation

```text
http://127.0.0.1:8000/docs
```

### OpenAPI Specification

```text
http://127.0.0.1:8000/api/v1/openapi.json
```

### Health Check

```text
http://127.0.0.1:8000/api/v1/health
```

---

## Terminal 2 — Frontend

```powershell
cd "C:\Users\varsh\Downloads\CREDIT CARD FRAUD DETECTION SYSTEM\frontend"
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# Database Setup

## SQLite — Recommended for Local Development

The easiest local configuration is:

```powershell
$env:DATABASE_URL="sqlite:///./dev.db"
```

Then run:

```powershell
cd backend
alembic upgrade head
python -m app.db.seed
```

This creates/applies the database schema and seeds the development accounts.

---

## PostgreSQL

PostgreSQL can be used instead when required.

Example:

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/fraud_detector
```

Then:

```bash
cd backend
alembic upgrade head
python -m app.db.seed
```

---

# Demo Accounts

The development seed provides:

| Email                 | Role    | Password       |
| --------------------- | ------- | -------------- |
| `analyst@example.com` | Analyst | `Password123!` |
| `admin@example.com`   | Admin   | `Password123!` |

These accounts are for local testing and demonstration only.

**Do not use these credentials in a production deployment.**

---

# Configuration

Configuration is managed through environment variables.

Example:

```env
APP_NAME=Credit Card Fraud Detection System

ENVIRONMENT=development
DEBUG=true

JWT_SECRET=change-me
JWT_ALGORITHM=HS256

JWT_ACCESS_TTL_MIN=30
JWT_REFRESH_TTL_DAYS=7

DATABASE_URL=sqlite:///./dev.db

REDIS_URL=redis://localhost:6379/0

CORS_ORIGINS=http://localhost:5173

VITE_API_BASE_URL=

FP_COST=1.0
FN_COST=5.0

MODEL_VERSION=

RATE_LIMIT_SCREEN_PER_MINUTE=60
RATE_LIMIT_LOGIN_PER_MINUTE=20

MAX_UPLOAD_MB=20
BATCH_CHUNK_SIZE=500
```

## Configuration Reference

| Variable                       | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `APP_NAME`                     | Application/API name                           |
| `ENVIRONMENT`                  | Current environment                            |
| `DEBUG`                        | Enables development debugging                  |
| `JWT_SECRET`                   | Secret used to sign JWTs                       |
| `JWT_ALGORITHM`                | JWT signing algorithm                          |
| `JWT_ACCESS_TTL_MIN`           | Access-token lifetime                          |
| `JWT_REFRESH_TTL_DAYS`         | Refresh-token lifetime                         |
| `DATABASE_URL`                 | Database connection                            |
| `REDIS_URL`                    | Redis connection                               |
| `CORS_ORIGINS`                 | Allowed frontend origins                       |
| `VITE_API_BASE_URL`            | Frontend API origin                            |
| `FP_COST`                      | False-positive cost for threshold optimization |
| `FN_COST`                      | False-negative cost for threshold optimization |
| `MODEL_VERSION`                | Optional model-artifact version                |
| `RATE_LIMIT_SCREEN_PER_MINUTE` | Screening request limit                        |
| `RATE_LIMIT_LOGIN_PER_MINUTE`  | Login request limit                            |
| `MAX_UPLOAD_MB`                | Maximum batch-upload size                      |
| `BATCH_CHUNK_SIZE`             | Batch processing chunk size                    |

For a stronger JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

# Using the Application

## 1. Open VEYRA

Navigate to:

```text
http://localhost:5173
```

---

## 2. Sign In

Use:

```text
Email:    analyst@example.com
Password: Password123!
```

---

## 3. Overview

The Overview dashboard provides a central view of:

* Screening activity.
* Risk distribution.
* Transaction statistics.
* Recent high-risk activity.
* Seven-day trends.

---

## 4. Screening

Navigate to **Screening**.

Enter transaction information or use a demo transaction.

Click:

```text
Run Screening
```

The system processes the transaction through the scoring workflow.

Example result presentation:

```text
Fraud Probability
99.4%

Risk Level
HIGH

Prediction
Fraud

Triggered Rules
amount_anomaly

Model Explanation
SHAP-based feature contributions
```

The exact result will vary according to the active model and input values.

---

## 5. Activity

The **Activity** page contains previously screened transactions.

Users can review transaction records and inspect individual details.

---

## 6. Alerts

The **Alerts** page provides high-risk transactions for analyst review.

An alert can lead to the complete transaction and explanation view.

---

## 7. Model Performance

The **Model Performance** page provides model-governance information including:

* Current model version.
* Evaluation metrics.
* Confusion matrix.
* Threshold information.
* Model metadata.

---

## 8. Explainability

The **Explainability** page provides:

### Global SHAP

Overall model feature importance.

### Local SHAP

Explanation for a specific stored transaction.

---

# Batch CSV Format

Batch screening accepts anonymized transactions.

## Required Columns

```text
Time
V1
V2
V3
...
V28
Amount
```

## Optional Columns

```text
Class
external_ref
occurred_at
```

Example:

```csv
Time,V1,V2,V3,V4,...,V28,Amount,Class
0.0,-1.3598,-0.0728,2.5363,1.3781,...,0.3677,248.90,1
5.0,1.1919,0.2661,0.1665,0.4482,...,-0.1990,88.99,0
```

## Batch Processing Flow

```text
Upload CSV
    ↓
Validate File
    ↓
Validate Columns
    ↓
Create Batch Job
    ↓
Queue Processing
    ↓
Process Transactions
    ↓
Update Progress
    ↓
Generate Results
    ↓
Download Results CSV
```

---

# Machine Learning Pipeline

VEYRA uses a structured machine-learning pipeline.

```text
Raw Dataset
     ↓
Data Validation
     ↓
EDA
     ↓
Feature Engineering
     ↓
Baseline Model
     ↓
XGBoost
     ↓
Threshold Optimization
     ↓
Model Evaluation
     ↓
SHAP Explainability
     ↓
Versioned Artifact
     ↓
API Inference
```

---

## Feature Engineering

Time can be transformed into cyclical features such as:

```text
Hour_sin
Hour_cos
```

Amount can also be transformed using:

```text
Amount_log1p
```

The important goal is that the same preprocessing logic is reused at inference time.

---

# Training the Model

Move into the backend:

```bash
cd backend
```

Run the complete training workflow:

```bash
python train_model.py
```

Fast training options:

```bash
python train_model.py --no-tuning
```

Skip SHAP:

```bash
python train_model.py --no-shap
```

Skip EDA:

```bash
python train_model.py --skip-eda
```

Use synthetic data for a smoke test:

```bash
python train_model.py --fake
```

Fast synthetic smoke test:

```bash
python train_model.py --fake --no-tuning
```

---

## Training Process

### Step 1 — Data Loading

Loads the credit-card fraud dataset.

### Step 2 — EDA

Analyzes:

* Class imbalance.
* Distribution of features.
* Transaction amounts.
* Time behavior.
* Data quality.

### Step 3 — Baseline

A Logistic Regression model is used as a baseline.

### Step 4 — XGBoost

XGBoost is trained as the primary model.

### Step 5 — Hyperparameter Optimization

The training workflow can use randomized parameter search.

### Step 6 — Threshold Optimization

The operating threshold can be optimized according to the configured strategy.

### Step 7 — Evaluation

The model is evaluated using:

* Precision.
* Recall.
* F1.
* PR-AUC.
* ROC-AUC.
* Confusion matrix.

### Step 8 — SHAP

SHAP TreeExplainer is used for model explanation.

### Step 9 — Artifact Creation

The trained model and supporting metadata are stored as a versioned artifact.

---

# Model Artifacts

Generated artifacts are stored under:

```text
artifacts/models/
```

A model artifact can contain:

```text
Model
Preprocessor
Threshold
Model version
Feature metadata
Evaluation metadata
```

Example structure:

```text
artifacts/
└── models/
    └── CCDFS-XGB-<timestamp>/
        ├── model
        ├── preprocessor
        ├── metadata
        └── threshold information
```

The API loads the newest artifact unless a specific `MODEL_VERSION` is configured.

---

# Dataset

The project uses the widely used anonymized credit-card fraud dataset associated with the **ULB Machine Learning Group / Kaggle**.

The dataset contains approximately:

```text
284,807 transactions
492 fraudulent transactions
~0.172% fraud
```

Main fields include:

```text
Time
V1 ... V28
Amount
Class
```

The `Class` column represents the fraud label during supervised training/evaluation.

---

## Privacy

The dataset is anonymized and PCA-transformed.

VEYRA is designed to operate on anonymized features rather than actual payment-card credentials.

Do not upload or store:

```text
Card numbers
CVVs
PINs
Payment credentials
Sensitive cardholder information
```

---

# API Reference

Base path:

```text
/api/v1
```

Interactive Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

OpenAPI specification:

```text
http://127.0.0.1:8000/api/v1/openapi.json
```

---

## Health

```http
GET /api/v1/health
```

Provides liveness/readiness information.

---

## Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/ping
```

---

## Single Screening

```http
POST /api/v1/screen
```

Screens one transaction using:

* ML model.
* Deterministic rules.
* SHAP explanation.

---

## Batch Screening

```http
POST /api/v1/screen/batch
POST /api/v1/batch
GET  /api/v1/batch
GET  /api/v1/batch/{job_id}
GET  /api/v1/batch/{job_id}/download
```

---

## Transactions

```http
GET /api/v1/transactions
GET /api/v1/transactions/summary
GET /api/v1/transactions/{transaction_id}
GET /api/v1/transactions/{transaction_id}/explanation
```

---

## Model

```http
GET  /api/v1/model/info
GET  /api/v1/model/metrics
GET  /api/v1/model/global-explanation
POST /api/v1/model/retrain
```

The retraining operation is intended for administrators.

---

## Alerts

```http
GET /api/v1/alerts
```

Returns recent high-risk alerts for review.

---

# Example API Request

After obtaining an access token:

```bash
curl -X POST "http://localhost:8000/api/v1/screen" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4200.00,
    "occurred_at": "2026-09-10T18:05:00+05:30",
    "features": {
      "V1": 0.001,
      "V2": 0.87,
      "V3": -1.2,
      "V4": 0,
      "V5": 0,
      "V6": 0,
      "V7": 0,
      "V8": 0,
      "V9": 0,
      "V10": 0,
      "V11": 0,
      "V12": 0,
      "V13": 0,
      "V14": 0,
      "V15": 0,
      "V16": 0,
      "V17": 0,
      "V18": 0,
      "V19": 0,
      "V20": 0,
      "V21": 0,
      "V22": 0,
      "V23": 0,
      "V24": 0,
      "V25": 0,
      "V26": 0,
      "V27": 0,
      "V28": 0
    }
  }'
```

For the exact request and response schema, use:

```text
http://127.0.0.1:8000/docs
```

---

# Testing

## Backend

```bash
cd backend
pytest -q
```

The backend tests cover areas including:

* Schema validation.
* Feature processing.
* Model behavior.
* Threshold logic.
* SHAP.
* Authentication.
* API endpoints.
* Batch functionality.

---

## Frontend

```bash
cd frontend
npm run test
```

---

## Type Checking

```bash
cd frontend
npm run typecheck
```

---

## Production Build

```bash
cd frontend
npm run build
```

---

## Complete Verification

```bash
cd backend
pytest -q

cd ../frontend
npm run test
npm run typecheck
npm run build
```

---

# Docker Compose

The repository also provides Docker-based infrastructure.

Typical services include:

```text
postgres
redis
api
worker
frontend
```

Start the stack:

```bash
docker compose up -d
```

or:

```bash
make docker-up
```

Typical ports:

| Service    |   Port |
| ---------- | -----: |
| PostgreSQL | `5432` |
| Redis      | `6379` |
| FastAPI    | `8000` |
| Frontend   | `8080` |

Docker is optional for basic local development because the application can run with SQLite.

---

# Background Video

VEYRA uses a decorative background video:

```text
frontend/public/videos/credit-card-fraud-background.mp4
```

The video is purely visual.

It is configured to be:

* Muted.
* Looping.
* Inline.
* Non-interactive.
* Behind the application UI.

The application does **not** depend on the video.

If the video is unavailable, the system should still operate normally.

The interface also supports reduced-motion behavior.

---

# Security

## Authentication

JWT authentication is used for protected API operations.

The system supports:

```text
Access Token
Refresh Token
Token Rotation
Token Revocation
```

---

## Password Security

Passwords are stored using secure password hashing through an Argon2-capable implementation.

---

## Role-Based Access

The system supports:

```text
analyst
admin
```

Administrative functionality, such as retraining, is restricted to authorized users.

---

## Rate Limiting

Rate limiting is supported for sensitive endpoints such as:

```text
Login
Screening
```

This helps reduce abuse and excessive requests.

---

## Environment Secrets

Secrets should never be committed directly to Git.

In particular:

```text
JWT_SECRET
DATABASE credentials
Redis credentials
API credentials
```

should be managed through environment configuration or deployment secret management.

---

# Responsible AI and Limitations

VEYRA is an **educational and prototype fraud-screening system**.

## Screening Is Not a Banking Decision

The output is intended to support human review.

The system does not independently:

* Approve payments.
* Decline payments.
* Freeze accounts.
* Block cards.
* Make final financial decisions.

---

## Historical Data

The model is trained using an anonymized historical dataset.

Fraud behavior changes over time, so historical evaluation results should not be interpreted as guaranteed performance against future real-world fraud.

---

## SHAP Does Not Explain Reality

SHAP explains the behavior of the trained model.

It does not prove that a feature is a real-world cause of fraud.

The PCA features also do not have direct business meanings.

---

## Threshold Trade-offs

Changing the fraud threshold affects the balance between:

```text
False Positives
```

and:

```text
False Negatives
```

A stricter threshold can reduce false alarms but potentially miss more fraud, while a more permissive threshold can detect more suspicious transactions at the cost of additional false positives.

---

## Synthetic Data

The synthetic-data training path exists for:

* Testing.
* Development.
* CI.
* Demonstrations.

It should not be treated as evidence of actual model performance.

---

# Development Workflow

A recommended local workflow is:

```text
1. Activate Python environment
2. Start FastAPI backend
3. Start Vite frontend
4. Sign in
5. Open Overview
6. Screen a transaction
7. Inspect the result
8. Review Activity
9. Review Alerts
10. Open Model Performance
11. Open Explainability
12. Run tests
13. Build frontend
```

For backend smoke testing:

```bash
cd backend
python train_model.py --fake --no-tuning
pytest -q
```

For frontend verification:

```bash
cd frontend
npm run test
npm run typecheck
npm run build
```

---

# Contributing

Contributions are welcome.

## 1. Fork the Repository

Create your own fork on GitHub.

## 2. Create a Feature Branch

```bash
git checkout -b feature/your-change
```

## 3. Make Your Changes

Keep related changes together and follow the existing project structure.

## 4. Update Tests

Backend changes should include appropriate tests under:

```text
backend/tests/
```

Frontend changes should include relevant tests under the frontend source tree.

## 5. Verify the Project

Run:

```bash
cd backend
pytest -q
```

and:

```bash
cd ../frontend
npm run test
npm run typecheck
npm run build
```

## 6. Commit

Use clear imperative commit messages.

Examples:

```text
add transaction explanation view
fix batch CSV validation
improve screening form
update model metrics page
```

## 7. Open a Pull Request

Describe:

* What changed.
* Why it changed.
* What was tested.
* Any configuration changes required.

---

# API Contract Guidelines

The backend and frontend depend on shared API contracts.

When changing a request or response schema, update the related layers together:

```text
Backend Pydantic schema
        ↓
API route/service
        ↓
Frontend TypeScript types
        ↓
API hooks
        ↓
UI components
        ↓
Tests
```

This helps prevent frontend/backend mismatches.

---

# Project Status

VEYRA currently represents a complete end-to-end software prototype containing:

```text
React Frontend
       +
FastAPI Backend
       +
Authentication
       +
Database
       +
Machine Learning
       +
XGBoost
       +
SHAP Explainability
       +
Rule Engine
       +
Transaction History
       +
Alerts
       +
Batch Processing
       +
Model Governance
       +
Automated Testing
```

The project demonstrates not only a fraud-classification model, but also how that model can be integrated into an explainable analyst workflow.

---

# License

This project is licensed under the **MIT License**.

See the repository's:

```text
LICENSE
```

file for the complete license text.

---

# Author

## Varshith Reddy

Developer of **VEYRA — Credit Card Fraud Detection System**.

The project was developed as a full-stack machine-learning application combining:

**AI + Machine Learning + Explainability + Backend Engineering + Frontend Engineering + Data Analytics**

---

## Final Project Summary

```text
VEYRA
│
├── Detect
│   └── XGBoost fraud prediction
│
├── Explain
│   ├── SHAP
│   └── Rule engine
│
├── Review
│   ├── Activity
│   └── Alerts
│
├── Monitor
│   ├── Dashboard
│   ├── Model Performance
│   └── Explainability
│
└── Operate
    ├── Authentication
    ├── Database
    ├── Batch Processing
    ├── APIs
    └── Testing
```

> **VEYRA — Intelligent transaction screening, explanation, and risk analysis.**
