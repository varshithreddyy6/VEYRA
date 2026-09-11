# Dataset — Credit Card Fraud Detection (ULB / Kaggle)

## Name

Credit Card Fraud Detection — anonymized European card transactions.
Also referred to as the **ULB fraud dataset** (Machine Learning Group, Université Libre de Bruxelles) and as the **Kaggle creditcard.csv** dataset.

## Source

- Kaggle: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- ULB Machine Learning Group: http://mlg.ulb.ac.be/

## Expected file

Place the dataset at:

```text
data/raw/creditcard.csv
```

The training pipeline (`backend/train_model.py`) looks for this path first.
If the file is missing, the pipeline attempts a download from the Kaggle
public mirror hosted by the ULB group and then aborts with clear instructions
if that also fails. The raw file is never committed to the repository.

## Download instructions

1. Visit the Kaggle page above (a free Kaggle account is required).
2. Download `creditcard.csv` (about 143 MB in the raw zip).
3. Move it into the repository: `data/raw/creditcard.csv`.

Or, from a machine with internet access:

```bash
mkdir -p data/raw
cd data/raw
kaggle datasets download -d mlg-ulb/creditcardfraud
unzip creditcardfraud.zip   # produces creditcard.csv
```

## Structure

The file is a CSV with 31 columns:

| Column   | Meaning                                                       |
|----------|---------------------------------------------------------------|
| `Time`   | Seconds elapsed between each transaction and the first transaction in the dataset |
| `V1..V28`| PCA-transformed anonymized features (no original card data)   |
| `Amount` | Transaction amount (raw, includes outliers)                   |
| `Class`  | Target: `0` = legitimate, `1` = fraud                        |

There are **no** merchant names, geographies, timestamps, PANs or cardholder
identifiers. `Time` is a relative offset, not a clock time. All real values
are statistical summaries derived from the dataset when it is actually loaded
(see `backend/app/fraud_detector/data/quality.py` for the computed checks).

## Class imbalance

This dataset is heavily imbalanced: frauds are a small fraction (a few tenths
of a percent) of all transactions. The exact ratio is computed at runtime from
the loaded dataset and recorded in the training report and model metadata —
it is not hard-coded here. The imbalance drives the choice of class weights,
`scale_pos_weight`, sampling experiments and threshold optimization.

## Placement instructions

- Keep the file at `data/raw/creditcard.csv`. Do not rename it.
- Do **not** add it to git — `.gitignore` excludes `data/raw/*`.
- After training, artifacts live under `artifacts/` and are also git-ignored;
  regenerate them with `make train` (or `python train_model.py`).

## Usage / licensing considerations

- The dataset is public and widely used for research and education, but its
  redistribution terms are set by the original authors (ULB) and the Kaggle
  page for the version you download. Review the Kaggle license before any
  redistribution; this repository only documents how to obtain it.
- The features are **anonymized/tokenized only** — no PANs, CVVs, names or
  merchants appear, and the system itself refuses to accept raw card numbers
  (see the API validation rules).
- The data reflects a single European card-issuer snapshot from 2013. Fraud
  patterns drift: modern fraud differs, so any model trained here is a
  demonstration artifact, not a production screening model.

## Representativeness caveat

Because the features are PCA-transformed, human-readable interpretations
(e.g. "V14 means ...") are statistically motivated, not semantically
guaranteed. SHAP explanations in this project describe feature contributions
to the model output — they are explanations of the model's decision, not
evidence of real-world causality or of fraud itself.
