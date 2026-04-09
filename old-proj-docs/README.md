# GitSyntropy 

**Data-Driven Team Compatibility & Synchronization Engine**

> *Build high-performing teams through behavioral analysis and psychometric profiling*

---

## What is GitSyntropy?

GitSyntropy analyzes GitHub activity patterns and psychometric profiles to calculate team compatibility scores. It helps engineering managers and team leads:

- **Match developers** with compatible work rhythms (chronotypes)
- **Predict team dynamics** using 8-dimension personality profiling  
- **Identify risks** before they become conflicts
- **Optimize collaboration** with data-backed insights

---

## Core Features

### 1. Chronotype Detection
Analyzes GitHub commit timestamps to classify developers:
- **Night Owl** → Peak activity 10 PM - 4 AM
- **Early Bird** → Peak activity 5 AM - 10 AM  
- **Flexible** → Distributed work patterns

### 2. Team Resilience Score (0-36)
8-dimension weighted compatibility scoring:

| Dimension | Weight | What it Measures |
|-----------|--------|------------------|
| Chronotype Sync | 4 pts | Work schedule alignment |
| Risk Tolerance | 6 pts | Conservative vs adventurous |
| Communication | 5 pts | Async vs sync preference |
| Conflict Style | 5 pts | Avoidant vs confrontational |
| Decision Making | 4 pts | Data-driven vs intuitive |
| Work Pace | 4 pts | Steady vs sprint-based |
| Leadership | 4 pts | Collaborative vs directive |
| Innovation | 2 pts | Incremental vs disruptive |

### 3. GitHub OAuth Integration
One-click authentication to:
- Fetch commit history (last 90 days)
- Build behavioral profile automatically
- No manual data entry required

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, Vite, Custom CSS, Recharts |
| **Backend** | FastAPI, Python 3.12+, SQLAlchemy 2.0 |
| **Database** | PostgreSQL (Supabase) |
| **Analysis** | NumPy, scikit-learn (K-Means clustering) |
| **Auth** | GitHub OAuth, JWT tokens |

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL database ([Supabase](https://supabase.com) free tier works great)
- [GitHub OAuth App](https://github.com/settings/developers)

### Backend Setup

```bash
cd server

# Create virtual environment
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -e .

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run server
uvicorn src.main:app --reload
```

**API available at:** http://localhost:8000/api/docs

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit with your API URL

# Run dev server
npm run dev
```

**App available at:** http://localhost:5173

---

## Project Structure

```
gitsyntropy/
├── server/
│   ├── src/
│   │   ├── api/v1/           # REST endpoints
│   │   │   ├── auth.py       # GitHub OAuth
│   │   │   ├── github.py     # Commit analysis
│   │   │   ├── psychometric.py
│   │   │   ├── teams.py
│   │   │   └── users.py
│   │   ├── core/             # Config, DB, Security
│   │   ├── models/           # SQLAlchemy models
│   │   └── services/
│   │       ├── chronotype_service.py   # K-Means clustering
│   │       ├── matching_engine.py      # 36-point scoring
│   │       └── github_service.py       # API integration
│   ├── .env.example
│   └── pyproject.toml
│
├── client/
│   ├── src/
│   │   ├── api/client.js     # Axios client
│   │   ├── components/       # Reusable UI
│   │   ├── pages/            # Route pages
│   │   └── styles/           # CSS design system
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Environment Variables

### Backend (`server/.env`)

```ini
DATABASE_URL=postgresql+asyncpg://user:pass@db.supabase.co:5432/postgres
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback
JWT_SECRET_KEY=your-secret-key-min-64-chars
FRONTEND_URL=http://localhost:5173
```

### Frontend (`client/.env.local`)

```ini
VITE_API_URL=http://localhost:8000
VITE_GITHUB_CLIENT_ID=your_client_id
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/login` | Get GitHub OAuth URL |
| GET | `/api/v1/auth/callback` | OAuth callback handler |
| GET | `/api/v1/users/me` | Current user profile |
| POST | `/api/v1/github/analyze` | Trigger commit analysis |
| POST | `/api/v1/psychometric/submit` | Submit assessment |
| POST | `/api/v1/teams/` | Create team |
| GET | `/api/v1/teams/{id}/score` | Get compatibility score |

---

## Database Models

| Model | Purpose |
|-------|---------|
| `User` | GitHub-authenticated users |
| `GitHubProfile` | Commit data, chronotype |
| `PsychometricProfile` | 8-dimension scores |
| `Team` | Team definitions |
| `TeamMember` | Membership join table |
| `TeamScore` | Resilience analysis results |

---

## Algorithm Deep Dive

### Chronotype Detection

```python
# K-Means clustering on commit hour distribution
def detect_chronotype(commits: list[datetime]) -> str:
    hours = [c.hour for c in commits]
    histogram = np.bincount(hours, minlength=24)
    
    # Cluster into 3 groups
    kmeans = KMeans(n_clusters=3)
    labels = kmeans.fit_predict(histogram.reshape(-1, 1))
    
    peak_hour = np.argmax(histogram)
    if 22 <= peak_hour or peak_hour <= 4:
        return "night_owl"
    elif 5 <= peak_hour <= 10:
        return "early_bird"
    return "flexible"
```

### Team Resilience Scoring

```python
def calculate_resilience(members: list[Profile]) -> dict:
    scores = {}
    
    # Lower variance = higher compatibility
    for dimension in DIMENSIONS:
        values = [m.get(dimension) for m in members]
        variance = np.var(values)
        max_score = DIMENSION_WEIGHTS[dimension]
        scores[dimension] = max_score * (1 - variance/25)
    
    total = sum(scores.values())
    risk_factors = identify_risks(members)
    
    return {
        "total_score": round(total, 1),
        "dimension_scores": scores,
        "risk_factors": risk_factors,
        "compatibility_level": get_level(total)
    }
```

---

## Roadmap

- [x] Project architecture
- [x] Database models
- [x] Core algorithms
- [x] API scaffolding
- [x] Frontend structure
- [ ] GitHub OAuth flow
- [ ] Psychometric assessment UI
- [ ] Team dashboard with radar charts
- [ ] LLM-powered role suggestions
- [ ] Production deployment

---

## Design Principles

- **Data over intuition** — Objective metrics, not gut feelings
- **Developer-first** — GitHub as primary data source
- **Clean UI** — Information-dense but not overwhelming
- **Privacy-aware** — Minimal data retention, transparent analysis

---

## License

MIT License : Academic Portfolio Project

**IIT Madras BS in Data Science**  

