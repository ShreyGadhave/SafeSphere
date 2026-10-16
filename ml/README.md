# SafeSphere ML workspace

Training code, notebooks and exported models for SafeSphere's AI features. Server-side models are served by `services/ml-api`; the audio and motion models are exported to TFLite and run on the phone.

> **Everything lives on D:.** Datasets go in `ml/data/`, models in `ml/models/`, and library caches (Hugging Face, Keras, TF Hub, KaggleHub, Torch, OSMnx, pip) in `D:\DevCache`. Call `safesphere_ml.common.paths.configure_caches()` before importing any of those libraries. `ml/data/*` and model binaries are gitignored.

## Layout

```
ml/
  configs/cities/     city packs: mumbai_mmr (Mumbai + Navi Mumbai), delhi, pune
  data/raw|interim|processed|cache/
  models/             exported artifacts, one folder per model
  notebooks/          one notebook per experiment (see notebooks/README.md)
  requirements/       base, geo, audio, nlp
  src/safesphere_ml/  common/ risk/ routing/ audio/ motion/ anomaly/ nlp/ triage/
```

## Models

| ID | Model | Data | Algorithm | Key metrics | Runs on |
|---|---|---|---|---|---|
| ML-1 | Area risk | Open city crime data, NCRB, OSM, app reports | KDE/HDBSCAN hotspots, logistic regression baseline, XGBoost/LightGBM, SHAP | ROC-AUC, PR-AUC, PAI | ML API |
| ML-2 | Safest route | OSM road graph + ML-1 scores | Risk-weighted A* over a lambda sweep (Pareto routes) | Risk exposure reduction vs travel-time increase | ML API |
| ML-3 | Scream / distress audio | AudioSet subsets, ESC-50, UrbanSound8K, own recordings | MFCC + SVM baseline, YAMNet transfer learning | Precision, recall, F1, false alarms/hour | Phone (TFLite) |
| ML-4 | Fall / snatch / motion | SisFall, MobiAct, UCI-HAR, own recordings | Feature RF baseline, 1D-CNN / CNN-LSTM | Sensitivity, specificity, F1 | Phone (TFLite) |
| ML-5 | Journey anomaly (Safe Ride) | Porto taxi, T-Drive, synthetic anomalies on Indian routes | Isolation Forest, XGBoost; LSTM stretch | Precision/recall, false alarms per trip, detection delay | Phone rules + ML API |
| ML-6 | Report NLP | Own labelled reports, HASOC, Jigsaw | TF-IDF + LR baseline, MuRIL/IndicBERT, embedding duplicates | Macro-F1 | ML API |
| ML-8 | Alert triage (stretch) | Hand-labelled scenarios | Weighted logistic scoring | Accuracy, rank correlation | ML API |

ML-7 (RAG assistant) is out of scope for now.

### A note on Indian crime data

There is no open, geocoded, incident-level crime dataset for Indian cities. ML-1 is therefore built and validated on an open city dataset first (London or Chicago), then transferred to Mumbai/Navi Mumbai, Delhi and Pune using features that exist everywhere (OSM infrastructure, time of day), NCRB district statistics as priors, and SafeSphere's own approved community reports. The report should state this plainly.

## Datasets

Check each licence before use and cite datasets in the project report.

| Dataset | Used for | Source | Licence / terms |
|---|---|---|---|
| data.police.uk street-level crime | ML-1 method validation | https://data.police.uk/data/ | Open Government Licence v3.0 |
| Chicago Crimes 2001–present | ML-1 method validation (alternative) | https://data.cityofchicago.org/Public-Safety/Crimes-2001-to-Present/ijzp-q8t2 | City of Chicago data portal terms |
| NCRB Crime in India | ML-1 priors (district level) | https://ncrb.gov.in/ and https://data.gov.in/ | Government Open Data Licence – India |
| OpenStreetMap via OSMnx | ML-1 features, ML-2 graphs, safe places | https://www.openstreetmap.org/ | ODbL 1.0 (attribution required) |
| AudioSet (Screaming, Shout, Yell, Crying) | ML-3 positives | https://research.google.com/audioset/ | Labels CC BY 4.0; clips are YouTube videos, availability varies |
| YAMNet | ML-3 backbone | https://www.kaggle.com/models/google/yamnet | Apache 2.0 |
| ESC-50 | ML-3 negatives / noise | https://github.com/karolpiczak/ESC-50 | CC BY-NC 3.0 |
| UrbanSound8K | ML-3 negatives / noise | https://urbansounddataset.weebly.com/urbansound8k.html | CC BY-NC 3.0 |
| SisFall | ML-4 falls and daily activities | http://sistemic.udea.edu.co/en/investigacion/proyectos/english-falls/ | Free for research; cite Sucerquia et al. (2017) |
| MobiAct | ML-4 falls and activities | https://bmi.hmu.gr/the-mobifall-and-mobiact-datasets-2/ | Free for research; registration required |
| UCI-HAR | ML-4 normal activities | https://archive.ics.uci.edu/dataset/240/human+activity+recognition+using+smartphones | CC BY 4.0 |
| Porto taxi (ECML/PKDD 15) | ML-5 normal trips | https://archive.ics.uci.edu/dataset/339/taxi+service+trajectory+prediction+challenge+ecml+pkdd+2015 | CC BY 4.0 |
| T-Drive | ML-5 normal trips | https://www.microsoft.com/en-us/research/publication/t-drive-trajectory-data-sample/ | Microsoft Research terms (research use) |
| HASOC (Hindi-English) | ML-6 toxicity | https://hasocfire.github.io/ | Research use; registration per track |
| Jigsaw Toxic Comments | ML-6 toxicity | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | CC0 (Wikipedia text under CC BY-SA 3.0) |
| MuRIL / IndicBERT | ML-6 backbone | https://huggingface.co/google/muril-base-cased, https://huggingface.co/ai4bharat/indic-bert | Apache 2.0 / MIT |

## Setup (Windows)

Use separate virtualenvs so one heavy stack does not block another. All of them live inside `ml/` (gitignored):

```powershell
$env:PIP_CACHE_DIR = 'D:\DevCache\pip'
cd "D:\Major Project\safesphere\ml"

# Risk + routing (ML-1, ML-2, ML-5, ML-8)
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements\geo.txt
.\.venv\Scripts\python.exe -m pip install -e .
```

### Python version

The laptop has Python 3.13. Most of the stack supports it, but TensorFlow (ML-3, ML-4) and occasionally PyTorch lag behind new Python releases. If `pip install -r requirements\audio.txt` cannot find a TensorFlow wheel, install Python 3.12 **to D:** (custom install location in the installer) and create a dedicated venv:

```powershell
py -3.12 -m venv .venv-audio
.\.venv-audio\Scripts\python.exe -m pip install -r requirements\audio.txt
.\.venv-audio\Scripts\python.exe -m pip install -e .
```

Do the same with `.venv-nlp` and `requirements\nlp.txt` for ML-6 (CPU-only PyTorch).

## Conventions

- Notebooks explore; anything reused goes into `src/safesphere_ml/`.
- Every training run logs parameters, metrics and the confusion matrix / curves to MLflow (`ml/mlruns/`).
- Exported models: `ml/models/<model>/<city or version>/` with a `metadata.json` (version, training date, metrics, feature list). The ML API loads from there; `model_registry` in Supabase records which version is live.
- Time-based or subject-based splits only: no random splits that leak the future or the same person into the test set.
