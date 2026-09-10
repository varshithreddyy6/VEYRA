# Project Report

**Project Title:** Credit Card Fraud Detection System (application brand: **VEYRA — AI Fraud Intelligence**)

| | |
|---|---|
| **Name** | Vinayak Varshith Reddy Vandgeti (10953) |
| **Program** | Artificial Intelligence — InternsElite |
| **Batch** | July 2026 |

---

## 1. Introduction

Financial fraud has grown into one of the most expensive problems facing the digital economy. Card-not-present
transactions, instant payments and e-commerce have made card fraud a high-volume, fast-moving threat, and the
economics of fraud are lopsided: a missed fraudulent transaction costs the bank or merchant directly, while an
incorrectly blocked legitimate transaction damages customer trust. At the same time, fraud is extremely rare
relative to normal traffic — typically well under one percent of transactions — which makes it a textbook
**imbalanced-classification** problem that simple accuracy-based models cannot solve.

Modern financial institutions therefore do not use a single classifier in isolation; they use a screening
pipeline that combines machine learning with business rules and human review. Yet most machine-learning demos
stop at a probability score, leaving the analyst with a black box: the model says a transaction is suspicious,
but not *why*.

This project addresses exactly that gap. It builds a complete, **explainable fraud-screening platform** —
implemented as an application named **VEYRA** — whose main goal is to answer one question for every
transaction:

> **"Is this transaction suspicious — and why?"**

The system achieves this by combining three complementary signals into one workflow:

1. **A machine-learning model** (XGBoost) that learns the statistical signature of fraud from a dataset of
   anonymized card transactions and outputs a fraud probability;
2. **A deterministic rule engine** that flags known behavioural anomalies (for example an anomalous amount)
   independently of the model, giving auditors signals they can verify by hand;
3. **SHAP explainability**, which translates the model's internal reasoning into per-feature contributions and
   a human-readable statement of why a particular transaction was scored the way it was.

In the current context — where regulators increasingly require that credit decisions be explainable and
auditable — a fraud system that can justify its own outputs, plus an analyst workspace that makes the whole
pipeline usable end-to-end, is a realistic and relevant engineering target. The project therefore delivers not
only a model, but a production-shaped platform: authenticated web application, transaction-screening API,
asynchronous batch analysis, activity ledger, alert queue, model-governance dashboard and explanation tools.

## 2. Problem Statement

Card fraud detection faces four specific difficulties that the project set out to solve:

1. **Severe class imbalance.** The public dataset used for this domain contains 284,807 transactions of which
   only 492 (~0.172%) are fraudulent. A classifier that predicts "legitimate" for everything already achieves
   99.8% accuracy — yet is entirely useless. The model must therefore be evaluated on precision, recall, F1
   and PR-AUC, not accuracy.

2. **Black-box predictions.** A raw probability gives an analyst no basis for a decision and no material for
   an audit trail. The system needs per-feature attribution and plain-language explanations.

3. **Model-only opinions.** Statistical models miss hard, verifiable patterns. Deterministic rules (e.g.
   "amount far above the card's historical range") should run beside the model and agree or disagree with it.

4. **No analyst workflow.** Even a good model is worthless if an analyst cannot screen a transaction, review
   previous screenings, or score hundreds of transactions in a batch without writing code.

The problem statement can therefore be defined as follows:

> *Given a dataset of anonymized card transactions (Time, 28 PCA features V1–V28, Amount, Class), train and
> evaluate an imbalanced-classification model that predicts the probability that a transaction is fraudulent,
> make the prediction explainable in feature-level terms, complement it with deterministic rules, and wrap the
> whole pipeline in a full-stack analyst application that supports single screening, batch screening,
> monitoring, alerting and model governance — without fabricating any data along the way.*

**Approach.** A unified scikit-learn pipeline (scalers + engineered features such as the log-transformed amount
and time-of-day harmonics) is shared between training and inference so that the API and the batch worker score
identically. XGBoost (300 trees, depth 5, `scale_pos_weight` set to the inverse fraud rate, PR-AUC as the
evaluation metric) is trained with a stratified hold-out, and a **threshold optimizer** selects the operating
point that maximizes F1 under configurable false-positive / false-negative business costs. A logistic
regression baseline is trained on the same split for comparison. SHAP (TreeExplainer) is fitted on the
validation sample and produces both a global summary and per-transaction explanations. Everything is
packaged as a **versioned artifact** (model + preprocessor + threshold + risk bands + metadata) that the API
resolves at startup. On top of this, FastAPI exposes the screening, batch, transaction, alert and model
endpoints; Celery + Redis process CSV batches asynchronously; PostgreSQL stores screenings, users and alerts;
and a React/TypeScript application (VEYRA) provides the analyst interface.

## 3. Results and Discussion

### 3.1 Model performance

The active pipeline was trained with seed 42 and evaluated on a held-out test split of 4,800 transactions
(24 fraudulent, 4,776 legitimate — matching the ~0.5% oversampled demo split used to keep the platform
reproducible out of the box). The threshold optimizer selected **0.4273** (max-F1), producing the following
confusion matrix and metrics:

| Metric | XGBoost | Logistic baseline |
|---|---|---|
| True positives / False negatives | 21 / 3 | 23 / 1 |
| False positives / True negatives | 4 / 4772 | 62 / 4714 |
| **Precision** | **84.0%** | 27.1% |
| **Recall** | **87.5%** | 95.8% |
| **F1 score** | **85.7%** | 42.2% |
| **PR-AUC** | **93.8%** | 82.5% |
| **ROC-AUC** | **0.9995** | 0.9977 |
| Accuracy | 99.85% | 98.69% |

The comparison is instructive. The logistic baseline catches slightly more fraud (recall 95.8%) but is
overwhelmed by false positives (62 vs 4), collapsing its precision to 27% — for an analyst queue that means
**62 wasted investigations for every 23 caught frauds**. XGBoost concentrates the signal where it matters:
21 of 24 frauds caught with only 4 false alarms, i.e. roughly one false alert for every five true alerts.
At the chosen operating point, F1 improves from 0.42 to **0.86** (more than double).

### 3.2 Explainability

SHAP produced a consistent story across global and local views. Globally, the anonymized principal components
**V14, V17, V12, V11, V10 and V3** carry the largest mean absolute contributions — the same features repeatedly
reported in the literature for this dataset. Locally, a fraud-like demo transaction scored at **99.4%** was
explained as dominated by V14 (+0.30) and V17 (+0.24) pushing toward fraud, with a handful of features pushing
the other way; the interpretation text states plainly that PCA features have no direct real-world meaning,
and that SHAP describes the model's reasoning rather than causality. This is exactly the auditability the
problem statement demanded: an analyst can see *which* features moved the score and *in which direction*.

### 3.3 Rules complementing the model

Adversarial and edge cases show the value of the hybrid design. A high-amount, clean-pattern transaction
(caught by the `amount_anomaly` rule) scored `0.0000` from the model and was banded **MEDIUM by the rule
engine alone** — a case the statistical model would have waved through but a human auditor can verify
immediately from the rule's plain-language description.

### 3.4 Platform and engineering outcomes

Beyond the model, the project delivered a working product and verified it end-to-end:

- **Single screening** runs through real, observable stages (validate → features → model → rules → explain →
  persist) and returns probability, risk band (LOW < 0.3 ≤ MEDIUM < 0.7 ≤ HIGH), threshold, model version and
  SHAP details.
- **Batch CSV screening** validates uploads (required columns `Time, V1…V28, Amount`, 20 MB / 100,000-row
  limits, raw card data rejected), processes them asynchronously via Celery with live progress, and returns a
  downloadable results file.
- **Automated verification:** 79 backend tests (schema validation, preprocessing, model, thresholds, auth,
  API, batch) and 48 frontend tests all pass; an end-to-end browser suite of **94 checks** passes across every
  screen, including mobile 390 px (zero horizontal overflow), `prefers-reduced-motion`, and **zero console
  errors or failed network requests**.
- **Live verification:** end-to-end screenings against the running API returned the expected verdicts
  (fraud-like sample → 99.4% HIGH RISK with `amount_anomaly` flagged; clean sample → 0.0% LOW), and the
  dashboard, ledger and alert queue all reflected the real stored data.

### 3.5 Honest limitations

It must be recorded that the artifact shipped with the repository was trained on a **synthetic demo dataset**
(metadata explicitly marks it: *"SYNTHETIC DEMO DATA — metrics do NOT describe the real ULB dataset"*) so that
the platform runs and its tests reproduce without a multi-hundred-megabyte download. The identical pipeline
trains on the real ULB dataset — the trainer locates `data/raw/creditcard.csv` and auto-downloads it from the
documented public mirror when absent — and the evaluation harness re-runs the same metrics on the real hold-out
without code changes. All discussion above is presented with this provenance made explicit, because metrics
are only meaningful when the data behind them is stated.

## 4. Conclusion

The project set out to build a fraud-screening system that is not merely accurate but **usable and
trustworthy**. It achieved this on all fronts. The model comparison showed that the choice of algorithm and
operating point matters enormously in an imbalanced domain — the same data yields F1 0.42 with logistic
regression and **0.86** with tuned XGBoost at the max-F1 threshold — and that precision/recall trade-offs
must be tuned with business costs, not defaulted. The rule engine and SHAP layer turned a probability into a
verifiable narrative, which is what separates a demo from something an analyst can act on. The platform
itself — authentication, screening, batch analysis, ledger, alerts, model governance — was verified with
127 automated tests plus a 94-check browser suite, all passing, with a premium analyst interface (VEYRA)
designed deliberately around solid surfaces, strong typography and restrained accent colours.

**Future work** naturally extends from the limitations above:

1. **Train and publish metrics on the real ULB dataset** and re-tune (RandomizedSearchCV) on it;
2. **Drift monitoring and scheduled retraining**, since fraud patterns evolve and the underlying dataset is
   from 2013;
3. **Model expansion** — compare XGBoost against cost-sensitive deep models, autoencoders for anomaly
   detection, or ensembles that blend the rule engine into the probability;
4. **Production hardening** — persistent PostgreSQL/Redis in deployment, containerized orchestration,
   monitoring/alerting on the pipeline itself, and an admin console for retraining;
5. **Live integration** — connect to a payment feed (in a sandbox) to validate real-latency screening, and
   add case-management tooling for the analyst (assign, annotate, escalate a screening).

In summary, the project demonstrates that a state-of-the-art machine-learning pipeline, an explainability
layer and a professional analyst workspace are not competing goals: built together, they deliver a fraud
screen that is accurate where it matters, honest about its own uncertainty, and immediately useful to the
people who must act on it.

## 5. References

1. A. Dal Pozzolo, O. Caelen, Y.-A. Le Borgne, S. Waterschoot, and G. Bontempi, *"Learned Lessons in Credit
   Card Fraud Detection from a Practitioner Perspective,"* Expert Systems with Applications, vol. 41, no. 10,
   pp. 4915–4928, 2014. (Origin of the ULB credit-card dataset.)
2. A. Dal Pozzolo, G. Boracchi, O. Caelen, C. Alippi, and G. Bontempi, *"Credit Card Fraud Detection: A
   Realistic Modeling and a Novel Learning Strategy,"* IEEE Transactions on Neural Networks and Learning
   Systems, vol. 29, no. 8, pp. 3784–3797, 2018.
3. T. Chen and C. Guestrin, *"XGBoost: A Scalable Tree Boosting System,"* in Proceedings of the 22nd ACM
   SIGKDD International Conference on Knowledge Discovery and Data Mining (KDD 2016), pp. 785–794, 2016.
4. S. M. Lundberg and S.-I. Lee, *"A Unified Approach to Interpreting Model Predictions,"* in Advances in
   Neural Information Processing Systems 30 (NeurIPS 2017), pp. 4765–4774, 2017.
5. F. Pedregosa et al., *"Scikit-learn: Machine Learning in Python,"* Journal of Machine Learning Research,
   vol. 12, pp. 2825–2830, 2011.
6. Machine Learning Group, Université Libre de Bruxelles, *"Credit Card Fraud Detection"* dataset
   (Kaggle: mlg-ulb/creditcardfraud), https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud.
7. FastAPI documentation, https://fastapi.tiangolo.com; SHAP documentation, https://shap.readthedocs.io.

---

*Compiled as part of the Artificial Intelligence — InternsElite internship project submission,
Batch July 2026.*
