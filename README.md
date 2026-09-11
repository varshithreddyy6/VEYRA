# VEYRA — AI Fraud Intelligence

> ***VEYRA is the product brand for the CREDIT CARD FRAUD DETECTION SYSTEM: an explainable, full-stack fraud-screening workspace that combines XGBoost machine learning, SHAP explanations, deterministic risk rules, authenticated analyst workflows, and asynchronous CSV batch analysis.***

VEYRA is designed to answer two practical questions:

1. **Is this transaction suspicious?**
2. **Why did the system produce that result?**

The system produces a screening signal for analyst review. It does not automatically approve, decline, freeze, or block a payment.

---

## Contents

* [**Project overview**](#project-overview)
* [**What was worked on**](#what-was-worked-on)
* [**Main features**](#main-features)
* [**Product experience**](#product-experience)
* [**Architecture**](#architecture)
* [**Technology stack**](#technology-stack)
* [**Repository structure**](#repository-structure)
* [**Prerequisites**](#prerequisites)
* [**Run locally**](#run-locally)
* [**Run with Docker Compose**](#run-with-docker-compose)
* [**Configuration**](#configuration)
* [**Using the application**](#using-the-application)
* [**Training the model**](#training-the-model)
* [**Dataset and artifacts**](#dataset-and-artifacts)
* [**API overview**](#api-overview)
* [**Testing and verification**](#testing-and-verification)
* [**Frontend redesign notes**](#frontend-redesign-notes)
* [**Responsible AI and limitations**](#responsible-ai-and-limitations)
* [**Contributing**](#contributing)
* [**License**](#license)

---

## Project overview

Credit-card fraud detection is a highly imbalanced classification problem: legitimate transactions significantly outnumber fraudulent ones, while both false positives and missed fraud have meaningful costs.

VEYRA combines three complementary layers:

1. **Machine-learning scoring** — an XGBoost classifier produces a fraud probability from anonymized transaction features.
2. **Deterministic rules** — a transparent rule engine identifies behavioural signals such as amount anomalies and exposes those signals separately from the model result.
3. **Explainability** — SHAP TreeExplainer attributes the model's result to individual features and provides a human-readable explanation for analyst review.

The application supports both individual investigation and operational review:

* Screen one transaction using **`Amount`**, **`Time`**, and **`V1`**–**`V28`** features.
* Upload a CSV for asynchronous batch analysis.
* Review persisted screening history.
* Investigate high-risk alerts.
* Inspect model metrics, thresholds, and feature importance.
* Open local explanations for stored transactions.
* Manage authenticated analyst and administrator accounts.

The backend is a FastAPI service backed by SQLAlchemy/PostgreSQL, Redis, Celery, and versioned model artifacts. The frontend is a React/TypeScript application branded as VEYRA.

---

## What was worked on

The project was developed as a complete ML product rather than only a notebook model. Major work included:

### Machine-learning pipeline

* Dataset loading and validation for anonymized credit-card transaction data.
* Reusable preprocessing and feature handling for both training and inference.
* Logistic-regression baseline comparison.
* XGBoost training and evaluation.
* Imbalanced-class metrics including precision, recall, F1, PR-AUC, and ROC-AUC.
* Threshold selection and business-cost configuration using false-positive and false-negative weights.
* Versioned model artifacts containing the model, metadata, metrics, thresholds, risk configuration, and global explanation data.

### Fraud scoring and explainability

* Real-time single-transaction scoring through the API.
* Deterministic rule signals alongside the model prediction.
* Risk bands: **`LOW`**, **`MEDIUM`**, and **`HIGH`**.
* SHAP global feature importance.
* SHAP local explanations for individual stored transactions.
* Human-readable explanation summaries for analyst review.

### Backend platform

* FastAPI application with versioned **`/api/v1`** routes.
* JWT access and refresh-token authentication.
* Password hashing and token revocation support.
* Analyst and administrator roles.
* SQLAlchemy models and Alembic migrations.
* PostgreSQL support with SQLite compatibility for tests and lightweight development.
* Redis-backed rate limiting and Celery job processing.
* Batch upload validation, job status, progress tracking, and result download.
* Activity persistence and high-risk alert creation.
* Health and readiness checks.

### Frontend redesign

The frontend was redesigned in place without rebuilding the backend or replacing existing API contracts. The new experience follows:

```text
Landing → Login/Register → Bento Home → Focused Feature Page → Back to Home
```

The redesign includes:

* A static black-and-gold landing experience with no landing-page video.
* A dedicated landing background asset at **`frontend/public/images/veyra-landing-background.png`**.
* A Bento-style authenticated Home page used as the only feature switcher.
* A reusable **`FeatureShell`** with VEYRA branding, page title, theme control, and Back to Home action.
* No sidebar, drawer, navigation rail, or bottom feature navigation on feature pages.
* Dynamic authenticated-user greetings and avatar initials.
* Centralized dark/light theme state with local-storage persistence.
* Responsive layout behavior for desktop, tablet, and mobile widths.
* Existing screening, SHAP, batch, activity, alerts, model, and authentication functionality preserved.

---

## Main features

### 1. Authentication and accounts

* User registration.
* Login and logout.
* Access-token and refresh-token flow.
* Current-user retrieval.
* Protected frontend routes.
* Analyst and admin roles.
* Password hashing.
* Token revocation.
* Rate limiting for login and screening endpoints.

Development seed accounts are available after running the seed command:

| **Email**                 | **Role** | **Password**       |
| ------------------------- | -------- | ------------------ |
| **`analyst@example.com`** | Analyst  | **`Password123!`** |
| **`admin@example.com`**   | Admin    | **`Password123!`** |

Change or remove development credentials before any non-local deployment.

### 2. Single-transaction screening

Screen an individual transaction using:

* Transaction amount.
* Timestamp.
* Optional external reference.
* **`V1`** through **`V28`** anonymized features.

The screening workflow returns or displays:

* Fraud probability.
* Prediction.
* Risk band.
* Active threshold.
* Model version.
* Triggered deterministic rules.
* SHAP feature contributions.
* Human-readable explanation.
* Persisted transaction history.

The frontend may provide sample/demo inputs for testing the workflow, but the result still comes from the real scoring path rather than fabricated UI data.

### 3. Batch CSV analysis

Upload a CSV containing anonymized transaction features. The required columns are:

```text
Time, V1, V2, ..., V28, Amount
```

Optional columns may include **`Class`**, **`external_ref`**, and **`occurred_at`** where supported by the backend contract.

The batch workflow provides:

* File validation.
* Size and row limits.
* Asynchronous Celery processing.
* Job status and progress.
* Error reporting.
* Downloadable result CSV.

Raw card numbers, CVVs, and other non-anonymized payment data are not part of the accepted schema.

### 4. Activity ledger

Review previously screened transactions with:

* Pagination.
* Search.
* Date and risk filters.
* Prediction filters.
* Sortable transaction information.
* Links to transaction details and explanations.

### 5. High-risk alerts

The Alerts workspace focuses on investigation of high-risk screenings. It can show:

* Transaction reference.
* Fraud probability.
* Amount.
* Risk level.
* Triggered rule signals.
* Detection timestamp.
* View/review action.

### 6. Model performance and governance

The Model Performance workspace exposes model-governance information such as:

* Active model version.
* Training metadata.
* Precision.
* Recall.
* F1 score.
* PR-AUC.
* ROC-AUC.
* Confusion matrix.
* Threshold information and trade-offs.
* Feature importance.

### 7. Explainability

Explainability is available at both global and local levels:

* Global feature importance from mean absolute SHAP values.
* Local SHAP contributions for a selected transaction.
* Positive and negative feature contributions.
* Fraud probability.
* Human-readable explanation.

SHAP values describe the behaviour of the trained model; they do not prove that a feature caused real-world fraud.

### 8. VEYRA frontend experience

The redesigned frontend contains the following user-facing areas:

* **Landing** — minimal brand introduction with a static black/gold background.
* **Login/Register** — quiet, focused authentication screens.
* **Home** — Bento feature launcher with dynamic user identity.
* **Overview** — system-level metrics and activity.
* **Screen Transaction** — one-transaction investigation workspace.
* **Batch Analysis** — CSV upload and job results.
* **Activity** — transaction ledger.
* **Alerts** — high-risk investigation queue.
* **Model Performance** — model governance and metrics.
* **Explainability** — SHAP-based model explanations.
* **About** — product, methodology, responsible-AI, and developer information.

Feature pages intentionally do not contain a sidebar. Users return to Home to change workspaces.

---

## Product experience

The final navigation structure is:

```text
/                   Public landing page
/login              Login
/register           Registration

/home               Protected Bento feature launcher
/overview           Protected system overview
/screening          Protected single-transaction screening
/batch              Protected CSV batch analysis
/activity           Protected transaction history
/alerts             Protected high-risk alerts
/model-performance  Protected model governance
/explainability     Protected SHAP explanations
/about              Protected product information
```

The authenticated Home page is the only feature-switching hub. Feature pages use a minimal shared header containing:

* VEYRA wordmark.
* Current page title.
* Theme toggle.
* **`← Back to Home`**.
* Optional authenticated-user initials.

There is no persistent feature sidebar, hidden feature drawer, mobile rail, or bottom navigation.

---

## Architecture

```text
┌────────────────────────────── Browser ──────────────────────────────┐
│ React 18 + TypeScript + Vite                                       │
│ VEYRA landing · auth · Bento Home · focused feature workspaces      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/JSON under /api/v1
                                ▼
┌──────────────────────────── FastAPI ────────────────────────────────┐
│ Auth · screening · batch · transactions · alerts · model · health  │
│ Scoring service · rule engine · model registry · storage · audit   │
└─────────────┬──────────────────────┬───────────────────┬────────────┘
              │                      │                   │
              ▼                      ▼                   ▼
       PostgreSQL / SQLite          Redis          Versioned artifacts
       SQLAlchemy + Alembic        rate limit      model + metadata
              │                      │
              └──────────────────────┴──────────────┐
                                                     ▼
                                              Celery worker
                                            asynchronous batches
```

Important engineering decisions:

* The preprocessing used during inference is shared with the training pipeline.
* Model artifacts are versioned and can be selected using **`MODEL_VERSION`**.
* Rules and ML predictions remain separate and visible to the analyst.
* Batch analysis is asynchronous when Redis and Celery are available.
* Backend API contracts remain under **`/api/v1`**.
* The frontend redesign changes presentation and navigation, not fraud-scoring intelligence.
* The landing page uses a static image; the previous video asset is not rendered by the active landing route.

---

## Technology stack

### Backend and ML

| **Area**       | **Technology**                                          |
| -------------- | ------------------------------------------------------- |
| API            | FastAPI, Uvicorn, Pydantic v2                           |
| Persistence    | SQLAlchemy 2, PostgreSQL 16, SQLite for tests/CI        |
| Migrations     | Alembic                                                 |
| Authentication | JWT, password hashing, refresh-token storage/revocation |
| Queue          | Celery and Redis                                        |
| ML             | scikit-learn, XGBoost, pandas, NumPy, joblib            |
| Explainability | SHAP TreeExplainer                                      |
| Testing        | pytest, httpx                                           |

### Frontend

| **Area**      | **Technology**                            |
| ------------- | ----------------------------------------- |
| UI            | React 18 and TypeScript                   |
| Build         | Vite 5                                    |
| Routing       | React Router 6                            |
| Data fetching | TanStack Query and Axios                  |
| Client state  | Zustand                                   |
| Forms         | react-hook-form and Zod                   |
| Styling       | Tailwind CSS and shared CSS design tokens |
| Charts        | Recharts                                  |
| Icons         | lucide-react                              |
| Testing       | Vitest and Testing Library                |

---

## Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application and lifespan setup
│   │   ├── api/routes/              # HTTP routes under /api/v1
│   │   ├── core/                    # Configuration, security, dependencies, logging
│   │   ├── db/                      # SQLAlchemy models, sessions, seed logic
│   │   ├── schemas/                 # Pydantic request and response contracts
│   │   ├── services/                # Scoring, model registry, storage, rules, audit
│   │   ├── fraud_detector/          # Data, features, models, evaluation, SHAP
│   │   └── workers/                 # Celery application and batch tasks
│   ├── alembic/                     # Database migration scripts
│   ├── tests/                       # Backend unit and integration tests
│   ├── train_model.py               # Training and artifact-generation CLI
│   ├── requirements.txt             # Python dependencies
│   └── Dockerfile                   # Backend container image
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── providers.tsx        # Query, toast, theme, router providers
│   │   │   ├── router.tsx           # Public/protected route architecture
│   │   │   └── theme.tsx            # Persistent dark/light theme state
│   │   ├── components/
│   │   │   ├── brand/               # VEYRA mark and wordmark
│   │   │   ├── layout/              # FeatureShell, headers, legacy layout utilities
│   │   │   ├── navigation/          # Theme toggle and navigation controls
│   │   │   ├── charts/              # SHAP and chart components
│   │   │   ├── tables/              # Transaction tables
│   │   │   └── ui/                  # Buttons, states, metrics, badges, gauges
│   │   ├── pages/
│   │   │   ├── HeroLanding.tsx      # Static black/gold public landing page
│   │   │   ├── Login.tsx            # Authentication
│   │   │   ├── Register.tsx         # Account creation
│   │   │   ├── Home.tsx             # Bento feature launcher
│   │   │   ├── Overview.tsx         # System overview
│   │   │   ├── Screening.tsx        # Single-transaction screening
│   │   │   ├── BatchAnalysis.tsx    # CSV batch workflow
│   │   │   ├── Activity.tsx         # Transaction ledger
│   │   │   ├── Alerts.tsx           # High-risk alerts
│   │   │   ├── ModelPerformance.tsx # Model governance
│   │   │   ├── Explainability.tsx   # SHAP explanations
│   │   │   └── About.tsx            # Product and methodology
│   │   ├── hooks/                   # Reusable data hooks
│   │   ├── lib/                     # API client, auth, formatters, validation
│   │   ├── styles/index.css         # Global tokens, shells, responsive styles
│   │   ├── types/                   # Shared frontend types
│   │   └── test/                    # Test setup and render helpers
│   ├── public/images/               # Static application imagery
│   │   └── veyra-landing-background.png
│   ├── public/videos/               # Retained legacy asset; not used on landing
│   ├── package.json                 # Frontend scripts and dependencies
│   └── Dockerfile                   # Vite build and Nginx image
│
├── data/                             # Dataset documentation and local data folders
├── artifacts/                        # Generated model artifacts; normally git-ignored
├── results/                          # Training/evaluation outputs
├── notebooks/                        # EDA, baseline, and model-comparison notebooks
├── redesign-shots/                   # UI reference and verification screenshots
├── .env.example                      # Environment configuration template
├── docker-compose.yml                # PostgreSQL, Redis, API, worker, frontend
├── Makefile                           # Common development commands
└── .github/workflows/ci.yml           # CI checks for backend, frontend, and Docker
```

Generated directories such as **`artifacts/`**, **`results/`**, Python caches, **`node_modules/`**, and frontend build output should not be committed unless a specific reproducibility requirement calls for them.

---

## Prerequisites

For local development:

* Python 3.11 or newer.
* Node.js 20 or newer.
* npm 9 or newer.
* Git.
* PostgreSQL 16 for the full database workflow, or SQLite for a lightweight local/test setup.
* Redis 7 for Celery batch processing and distributed rate limiting.
* Docker Desktop or Docker Engine with Compose is optional but recommended.

The project was tested in CI with Python 3.12 and Node 20.

---

## Run locally

### 1. Clone the repository

```bash
git clone <repository-url> veyra
cd veyra
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Generate a real secret for any environment beyond a disposable local demo:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Replace **`JWT_SECRET`** in **`.env`** with the generated value.

### 3. Install backend dependencies

```bash
python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm ci
cd ..
```

### 5. Start PostgreSQL and Redis

The simplest approach is to start the supporting services using the Makefile:

```bash
make db-start
make redis-start
```

Alternatively, use the PostgreSQL and Redis services from Docker Compose as described below.

For a lightweight backend test setup, set a SQLite URL in **`.env`**:

```dotenv
DATABASE_URL=sqlite:///dev.db
```

SQLite is useful for tests and small local experiments. PostgreSQL is recommended for a closer production-shaped workflow.

### 6. Apply migrations and seed users

```bash
make migrate
make seed
```

### 7. Train or provide a model artifact

If a compatible versioned artifact already exists in **`artifacts/models/`**, the API can load it. Otherwise, run:

```bash
make train
```

For a faster smoke run:

```bash
cd backend
python train_model.py --fake --no-tuning --no-shap --skip-eda
cd ..
```

The synthetic option is for tests and demonstrations only; it is not a production training dataset.

### 8. Start the API

```bash
make backend
```

The API is available at:

* Application: **`http://localhost:8000`**
* Swagger UI: **`http://localhost:8000/docs`**
* Health endpoint: **`http://localhost:8000/api/v1/health`**

### 9. Start the Celery worker

For asynchronous batch analysis:

```bash
make worker
```

Keep Redis running while the worker is active.

### 10. Start the frontend

In another terminal:

```bash
make frontend
```

Open:

```text
http://localhost:5173
```

The Vite development server proxies **`/api`** requests to the local backend. Sign in with a seeded account and the authenticated Bento Home page will open at **`/home`**.

---

## Run with Docker Compose

Docker Compose runs PostgreSQL, Redis, the API, Celery worker, and the production frontend together.

```bash
cp .env.example .env
docker compose up --build -d
```

The application is then available at:

```text
http://localhost:8080
```

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose logs -f api
docker compose logs -f worker
docker compose down
```

Services:

| **Service**    |   **Port** | **Purpose**                                  |
| -------------- | ---------: | -------------------------------------------- |
| **`postgres`** | **`5432`** | Persistent relational database               |
| **`redis`**    | **`6379`** | Celery broker, job state, rate-limit backend |
| **`api`**      | **`8000`** | FastAPI application                          |
| **`worker`**   |          — | Celery batch-processing worker               |
| **`frontend`** | **`8080`** | Nginx-served production build                |

The frontend Docker build uses **`VITE_API_BASE_URL`**. For a browser running on the host, the default **`http://localhost:8000`** is normally correct. In a deployed environment, set it to the externally reachable API origin.

---

## Configuration

Copy **`.env.example`** to **`.env`** and adjust the values as needed.

| **Variable**                       | **Purpose**                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| **`APP_NAME`**                     | Backend application name                                       |
| **`ENVIRONMENT`**                  | Runtime environment such as **`development`** or **`testing`** |
| **`DEBUG`**                        | Enables development debugging behaviour                        |
| **`JWT_SECRET`**                   | Secret used to sign tokens; change outside local demos         |
| **`JWT_ALGORITHM`**                | JWT signing algorithm, normally **`HS256`**                    |
| **`JWT_ACCESS_TTL_MIN`**           | Access-token lifetime in minutes                               |
| **`JWT_REFRESH_TTL_DAYS`**         | Refresh-token lifetime in days                                 |
| **`DATABASE_URL`**                 | PostgreSQL or SQLite SQLAlchemy URL                            |
| **`REDIS_URL`**                    | Redis connection URL                                           |
| **`CORS_ORIGINS`**                 | Comma-separated permitted browser origins                      |
| **`VITE_API_BASE_URL`**            | API origin baked into a production frontend build              |
| **`FP_COST`**                      | False-positive cost used by threshold selection                |
| **`FN_COST`**                      | False-negative cost used by threshold selection                |
| **`MODEL_VERSION`**                | Optional model-artifact version pin                            |
| **`RATE_LIMIT_SCREEN_PER_MINUTE`** | Screening rate limit                                           |
| **`RATE_LIMIT_LOGIN_PER_MINUTE`**  | Login rate limit                                               |
| **`MAX_UPLOAD_MB`**                | Maximum CSV upload size                                        |
| **`BATCH_CHUNK_SIZE`**             | Number of rows processed per batch chunk                       |

Never commit a real **`.env`** file or production secrets.

---

## Makefile commands

Run these from the repository root:

```bash
make help             # list commands
make setup            # create venv and install backend/frontend dependencies
make env              # create .env from .env.example
make db-start         # start PostgreSQL in Docker
make db-stop          # stop PostgreSQL container
make redis-start      # start Redis in Docker
make redis-stop       # stop Redis container
make migrate          # apply Alembic migrations
make seed             # create development users
make train            # train the model and write an artifact
make backend          # start FastAPI on port 8000
make worker           # start Celery worker
make frontend         # start Vite on port 5173
make test             # run backend and frontend tests
make test-backend     # run pytest
make test-frontend    # run Vitest
make lint             # frontend typecheck plus backend byte-compile
make docker-up        # build and start the full Docker stack
make docker-down      # stop the Docker stack
make docker-logs      # follow Docker logs
make clean            # remove caches and frontend build output
```

---

## Using the application

### Sign in

Use one of the development accounts after seeding:

```text
Email:    analyst@example.com
Password: Password123!
```

### Choose a workspace

After login, Home presents the Bento feature launcher. Select one workspace:

* **Overview** for system-level metrics.
* **Screen Transaction** for a single investigation.
* **Batch Analysis** for CSV processing.
* **Activity** for historical screenings.
* **Alerts** for high-risk investigations.
* **Model Performance** for governance and metrics.
* **Explainability** for SHAP explanations.
* **About VEYRA** for methodology and project information.

Feature pages do not have a sidebar. Use **`← Back to Home`** to return to the launcher.

### Screen a transaction

1. Open **Screen Transaction** from Home.
2. Enter an amount, timestamp, and anonymized feature values, or choose an available demo input.
3. Run the analysis.
4. Review probability, prediction, risk band, threshold, model version, rule signals, and SHAP explanation.
5. Return to Home or open the saved transaction through Activity/Alerts.

### Upload a batch

1. Open **Batch Analysis**.
2. Upload a CSV containing **`Time`**, **`V1`**–**`V28`**, and **`Amount`**.
3. Confirm validation and start processing.
4. Monitor the job state and progress.
5. Download the result CSV when processing completes.

### Investigate alerts

Open **Alerts** from Home to review high-risk screenings. Use the review action to inspect the relevant transaction and its explanation.

---

## Training the model

The training entry point is:

```bash
cd backend
python train_model.py
```

Common options include:

```bash
python train_model.py --no-tuning --skip-eda
python train_model.py --no-shap
python train_model.py --fake --no-tuning --no-shap --skip-eda
python train_model.py --target pr_auc
```

The pipeline generally performs the following steps:

1. Load or retrieve the documented anonymized dataset.
2. Validate schema and data quality.
3. Prepare a reusable preprocessing pipeline.
4. Train a baseline model.
5. Train and evaluate XGBoost.
6. Optimize or select a decision threshold.
7. Calculate held-out evaluation metrics.
8. Generate SHAP information.
9. Write a timestamped artifact under **`artifacts/models/`**.

The API loads the latest compatible artifact unless **`MODEL_VERSION`** is set. Keep model artifacts and their metadata together; the model, preprocessing assumptions, metrics, threshold configuration, and explainability files must remain consistent.

---

## Dataset and artifacts

The intended dataset is the anonymized European credit-card fraud dataset commonly distributed through the ULB/Kaggle credit-card-fraud dataset.

The expected feature structure is:

```text
Time, V1, V2, ..., V28, Amount, Class
```

The dataset contains anonymized PCA-style features. It does not expose direct merchant, card-number, CVV, or personally identifying information.

Generated artifacts may include:

* Trained model file.
* Preprocessing information.
* **`metadata.json`**.
* **`metrics.json`**.
* **`thresholds.json`**.
* Risk-band configuration.
* Global SHAP feature information.

The dataset is highly imbalanced. Accuracy alone is not a sufficient measure of quality; evaluate precision, recall, F1, PR-AUC, ROC-AUC, threshold behaviour, and operational false-positive volume together.

---

## API overview

The API is versioned under **`/api/v1`**. Interactive documentation is available at **`/docs`** when the backend is running.

| **Method** | **Endpoint**                                | **Purpose**                      |
| ---------- | ------------------------------------------- | -------------------------------- |
| **`GET`**  | **`/api/v1/health`**                        | Health and readiness information |
| **`POST`** | **`/api/v1/auth/register`**                 | Register an account              |
| **`POST`** | **`/api/v1/auth/login`**                    | Authenticate and issue tokens    |
| **`POST`** | **`/api/v1/auth/refresh`**                  | Refresh tokens                   |
| **`POST`** | **`/api/v1/auth/logout`**                   | Revoke a refresh token           |
| **`GET`**  | **`/api/v1/auth/me`**                       | Return the current user          |
| **`POST`** | **`/api/v1/screen`**                        | Screen one transaction           |
| **`POST`** | **`/api/v1/batch`**                         | Create a batch job               |
| **`GET`**  | **`/api/v1/batch`**                         | List batch jobs                  |
| **`GET`**  | **`/api/v1/batch/{job_id}`**                | Read job status and progress     |
| **`GET`**  | **`/api/v1/batch/{job_id}/download`**       | Download batch results           |
| **`GET`**  | **`/api/v1/transactions`**                  | Query the transaction ledger     |
| **`GET`**  | **`/api/v1/transactions/summary`**          | Read summary metrics and trends  |
| **`GET`**  | **`/api/v1/transactions/{id}`**             | Read transaction detail          |
| **`GET`**  | **`/api/v1/transactions/{id}/explanation`** | Read local explanation           |
| **`GET`**  | **`/api/v1/alerts`**                        | Query high-risk alerts           |
| **`GET`**  | **`/api/v1/model/info`**                    | Read active model metadata       |
| **`GET`**  | **`/api/v1/model/metrics`**                 | Read model evaluation metrics    |
| **`GET`**  | **`/api/v1/model/global-explanation`**      | Read global SHAP information     |
| **`POST`** | **`/api/v1/model/retrain`**                 | Queue administrator retraining   |

Example request after obtaining an access token:

```bash
curl -X POST http://localhost:8000/api/v1/screen \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4200.00,
    "occurred_at": "2026-09-10T18:05:00+05:30",
    "features": {
      "V1": 0.001,
      "V2": 0.87,
      "V3": -1.2
    }
  }'
```

Use the Swagger UI to see the complete schema, required fields, authentication requirements, and response models.

---

## Testing and verification

Run the complete verification suite:

```bash
make test
```

Run individual checks:

```bash
cd backend
pytest -q

cd ../frontend
npm run test
npm run typecheck
npm run build
```

The current verified frontend baseline includes:

* 48 Vitest tests passing.
* TypeScript project typecheck passing.
* Vite production build passing.

The backend CI baseline includes:

* 79 pytest tests passing.
* Python byte-compilation.
* Synthetic training smoke verification.
* Alembic migration verification against scratch SQLite.

GitHub Actions runs the backend and frontend checks on pushes and pull requests. Docker image build checks run after the application test jobs pass.

When changing the frontend, verify at minimum:

* Landing, login, and registration navigation.
* Protected redirect behaviour.
* Home Bento tile navigation.
* Back to Home from every feature page.
* Dynamic authenticated user name and initials.
* No feature-page sidebar or feature-switching menu.
* Dark and light theme persistence.
* Desktop, tablet, and approximately 390px mobile layouts.
* Real screening, SHAP, activity, alert, batch, and model flows.

---

## Frontend redesign notes

The redesign is intentionally a frontend architecture and visual-system change. It does not replace the scoring model or backend contracts.

### Design principles

* Premium, minimal, editorial fintech presentation.
* Home as the only feature switcher.
* Focused feature pages with one primary responsibility.
* Solid functional surfaces instead of pervasive glassmorphism.
* Restrained black, graphite, warm ivory, and champagne/gold brand accents.
* Semantic green, amber, red, and blue states for safe, warning, fraud, and informational results.
* Dynamic identity from authentication state rather than hardcoded developer details.
* Complete dark/light theme coverage.
* Motion kept subtle and compatible with **`prefers-reduced-motion`**.

### Landing asset

The active landing page uses:

```text
frontend/public/images/veyra-landing-background.png
```

The image is decorative and contains no application text. VEYRA branding, tagline, CTA, sign-in link, and theme control are rendered by React so they remain responsive and accessible.

The older MP4 remains in **`frontend/public/videos/`** for repository compatibility, but the active landing page does not render, preload, or depend on it.

---

## Responsible AI and limitations

VEYRA is a prototype and educational/portfolio system. It should not be used as a production banking decision system without substantial additional validation, security review, monitoring, and compliance work.

Important limitations:

* A screening result is not proof of fraud.
* The application provides analyst decision support; it does not automatically block transactions.
* The training data is anonymized and historical, so fraud behaviour may have changed over time.
* PCA features such as **`V14`** do not have a direct human meaning like a merchant category or cardholder attribute.
* SHAP describes how the model arrived at a prediction; it does not establish causality.
* Threshold selection is an operational/business decision involving false-positive and false-negative costs.
* Class imbalance means accuracy can be misleading.
* Model drift, data drift, calibration, fairness, and performance across relevant populations require ongoing monitoring.
* Development JWT secrets and seeded credentials must never be reused in production.
* Production deployments need TLS, secret management, restricted CORS, least-privilege database roles, durable queue configuration, monitoring, backups, and security hardening.

---

## Contributing

Contributions and improvements are welcome.

1. Fork the repository.

2. Create a focused branch:

   ```bash
   git checkout -b feature/your-change
   ```

3. Preserve existing API contracts unless a change is intentionally versioned.

4. Reuse existing frontend components and shells instead of duplicating patterns.

5. Do not fabricate model outputs, metrics, alerts, or transaction data.

6. Add or update tests for behaviour you change.

7. Run backend tests, frontend tests, typecheck, and build before opening a pull request.

8. Document any configuration or migration changes.

9. Open a pull request explaining the design/technical decision and verification performed.

For frontend work specifically:

* Keep feature pages free of sidebar and feature-switching navigation.
* Keep the authenticated user identity dynamic.
* Keep dark and light themes complete.
* Keep the real API integrations connected.
* Respect keyboard navigation, semantic labels, contrast, and reduced-motion preferences.

Use concise imperative commit messages such as:

```text
add Bento Home launcher
fix batch result empty state
make model chart theme-aware
```

---

## License

This project is released under the [**MIT License**](LICENSE).

Copyright © 2026 Varshith Reddy.

---

## Project status

VEYRA is an actively developed portfolio/internship project demonstrating:

* Imbalanced fraud classification.
* XGBoost model development.
* Threshold evaluation.
* SHAP explainability.
* Deterministic rules.
* JWT-secured APIs.
* Persistent transaction workflows.
* Celery batch processing.
* React product design and frontend architecture.
* Automated backend and frontend verification.

The project is intended to make the full path from **data → model → explanation → analyst workflow** understandable, testable, and extendable.
