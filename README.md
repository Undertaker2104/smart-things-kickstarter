# 🎾 Ball Cleaner

Een IoT-systeem voor het automatisch tellen en beheren van sportballen (basketballen, voetballen, volleyballen) tijdens het reinigingsproces.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

---

## 📋 Inhoudsopgave

- [Over het Project](#-over-het-project)
- [Architectuur](#-architectuur)
- [Vereisten](#-vereisten)
- [Installatie](#-installatie)
- [Gebruik](#-gebruik)
- [Development](#-development)
- [Database](#-database)
- [API Documentatie](#-api-documentatie)

---

## 🎯 Over het Project

Ball Cleaner is een dashboard applicatie die communiceert met een ESP32-microcontroller om:

- **Sessies te beheren** - Start, pauzeer en stop reinigingssessies
- **Ballen te tellen** - Real-time telling van verschillende baltypen
- **Inventaris bij te houden** - Vergelijk verwachte vs. getelde aantallen
- **Data te visualiseren** - Grafieken en statistieken over sessies

### Features

✅ Real-time status monitoring  
✅ Meerdere baltypen ondersteuning  
✅ Sessie geschiedenis en statistieken  
✅ Inventarisbeheer met verwachte aantallen  
✅ Responsive web interface  
✅ REST API voor ESP32 integratie

---

## 🏗 Architectuur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│  (React)    │     │  (FastAPI)  │     │ (PostgreSQL)│
│  Port: 80   │     │  Port: 8000 │     │  Port: 5432 │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲
                           │
                    ┌──────┴──────┐
                    │    ESP32    │
                    │ (Hardware)  │
                    └─────────────┘
```

### Tech Stack

| Component | Technologie |
|-----------|-------------|
| Frontend | React 19, Vite, Recharts |
| Backend | FastAPI, Uvicorn, Plotly |
| Database | PostgreSQL 16 |
| Containerization | Docker, Docker Compose |
| Webserver | Nginx |

---

## 📦 Vereisten

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ (voor development)
- Git

---

## 🚀 Installatie

### 1. Clone de repository

```bash
git clone https://github.com/Undertaker2104/smart-things-kickstarter.git
cd smart-things-kickstarter
```

### 2. Build de frontend

```bash
cd frontend/app
npm install
npm run build
cd ../..
```

### 3. Start alle services

```bash
docker compose up -d --build
```

### 4. Controleer of alles draait

```bash
docker compose ps
```

De applicatie is nu beschikbaar op:
- **Frontend**: http://localhost
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **pgAdmin**: http://localhost:5050

---

## 💻 Gebruik

### Docker Commando's

| Commando | Beschrijving |
|----------|--------------|
| `docker compose up -d` | Start containers op achtergrond |
| `docker compose up -d --build` | Rebuild en start containers |
| `docker compose ps` | Bekijk status van containers |
| `docker compose logs api` | Bekijk API logs |
| `docker compose logs -f api` | Volg API logs live |
| `docker compose logs db` | Bekijk database logs |
| `docker compose down` | Stop alle containers |
| `docker compose down -v` | Stop containers + wis database |

### Deployment op VM

```bash
git pull
cd frontend/app
npm install
npm run build
cd ../..
docker compose up -d --build
```

---

## 🛠 Development

### Frontend Development

```bash
cd frontend/app
npm install
npm run dev
```

De development server draait op http://localhost:5173

### Backend Development

De backend start automatisch via Docker. Voor lokale development:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### macOS (met Colima)

```bash
colima start
cd frontend/app
npm run dev
```

---

## 🗄 Database

### pgAdmin Toegang

1. Ga naar http://localhost:5050
2. Login met:
   - **Email**: `admin@local.dev`
   - **Wachtwoord**: `admin`

### Database Server Toevoegen

1. Klik op **Add New Server**
2. **Tab General**:
   - Name: `BallCleaner DB`
3. **Tab Connection**:
   - Host: `db`
   - Port: `5432`
   - Username: `app`
   - Password: `app_pw`
   - Database: `ballcleaner`

### Database Schema

De database bevat de volgende hoofdtabellen:

| Tabel | Beschrijving |
|-------|--------------|
| `ball_type` | Baltypen (basketball, voetbal, etc.) |
| `cleaning_session` | Reinigingssessies met status |
| `session_item` | Getelde ballen per sessie |
| `inventory_expected` | Verwachte aantallen per baltype |
| `command` | Commando queue voor ESP32 |
| `event_log` | Systeem events en errors |

---

## 📖 API Documentatie

De interactieve API documentatie is beschikbaar op:

- **Swagger UI**: http://localhost:8000/api/docs
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

### Belangrijke Endpoints

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/sessions` | GET | Lijst van alle sessies |
| `/api/sessions/{id}` | GET | Sessie details |
| `/api/commands` | POST | Stuur commando naar ESP32 |
| `/api/inventory` | GET | Huidige inventaris |
| `/api/state` | GET | Huidige systeemstatus |

---

## 📁 Project Structuur

```
smart-things-kickstarter/
├── backend/
│   ├── main.py           # FastAPI applicatie
│   ├── config.py         # Configuratie
│   ├── database.py       # Database connectie
│   ├── models/           # Pydantic models
│   ├── routers/          # API endpoints
│   └── charts/           # Grafiek generatie
├── frontend/
│   └── app/
│       ├── src/
│       │   ├── pages/    # React pagina's
│       │   ├── components/
│       │   └── services/ # API calls
│       └── package.json
├── db/
│   └── init.sql          # Database schema
├── docker-compose.yml
└── README.md
```

---


## 📄 Licentie

Dit project is onderdeel van Sphaera, de verzonnen startup voor het Smart Things Kickstarter programma 2025-2026.