# HR Automation SaaS Platform

**Final Year Project (FYP)** – A cloud-based HR Automation SaaS platform that streamlines the hiring process with AI-powered interviews, assessments, and candidate ranking.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x LTS or higher
- Python 3.11+
- Docker Desktop
- Git

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd agentic-hr
   ```

2. **Start infrastructure services** (PostgreSQL, Redis, MinIO):
   ```bash
   docker-compose -f infra/docker-compose.dev.yml up -d
   ```

3. **Set up Backend**:
   ```bash
   cd backend
   cp env.example .env
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run start:dev
   ```

4. **Set up Frontend** (in a new terminal):
   ```bash
   cd frontend
   cp env.example .env
   npm install
   npm run dev
   ```

5. **Set up AI Services** (in a new terminal):
   ```bash
   cd ai-services
   cp env.example .env
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

6. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api/v1
   - AI Services: http://localhost:8000
   - API Docs: http://localhost:8000/docs

For detailed setup instructions, see [docs/setup/local-development.md](docs/setup/local-development.md).

## 📁 Project Structure

```
agentic-hr/
├── frontend/          # React + TypeScript frontend application
├── backend/           # NestJS + TypeScript backend API
├── ai-services/       # FastAPI Python services for AI processing
├── infra/             # Docker Compose and infrastructure configs
├── docs/              # Comprehensive documentation
│   ├── architecture/ # System architecture and roadmap
│   ├── setup/        # Setup and configuration guides
│   ├── decisions/    # Architecture Decision Records (ADRs)
│   └── security/     # Security principles and controls
└── prompts/           # Original FYP requirements
```

## 🛠️ Technology Stack

### Frontend
- **React 18** + **TypeScript** – Modern UI framework
- **Vite** – Fast build tool
- **Tailwind CSS** – Utility-first styling
- **React Query** – Server state management
- **React Router** – Client-side routing

### Backend
- **NestJS** – Enterprise Node.js framework
- **TypeScript** – Type-safe development
- **Prisma** – Type-safe ORM
- **PostgreSQL** – Relational database
- **JWT** – Authentication

### AI Services
- **FastAPI** – High-performance Python framework
- **LiveKit** – Real-time WebRTC infrastructure
- **OpenAI API** – LLM integration
- **LangChain** – LLM orchestration
- **OpenCV/MediaPipe** – Computer vision

### Infrastructure
- **Docker** + **Docker Compose** – Containerization
- **PostgreSQL** – Database
- **Redis** – Caching and sessions
- **MinIO** – S3-compatible object storage

## 📚 Documentation

- **[Architecture Overview](docs/architecture/01-overview.md)** – System design and components
- **[Roadmap & Milestones](docs/architecture/02-roadmap-and-milestones.md)** – Development phases
- **[Local Development Setup](docs/setup/local-development.md)** – Detailed setup guide
- **[Technology Stack Decision](docs/decisions/ADR-0002-technology-stack.md)** – Tech choices and rationale
- **[Authentication Strategy](docs/decisions/ADR-0003-authentication-strategy.md)** – Auth implementation
- **[Security Guidelines](docs/security/README.md)** – Security principles

## 🧪 Testing

```bash
# Backend tests
cd backend && npm run test

# Frontend tests
cd frontend && npm run test

# AI Services tests
cd ai-services && pytest
```

## 🔄 CI/CD

GitHub Actions workflows are configured in `.github/workflows/ci.yml` for:
- Automated testing (backend, frontend, AI services)
- Code quality checks (linting, formatting)
- Database migrations

## 📋 Current Status

### ✅ Completed
- Project structure and architecture design
- Technology stack selection
- Backend API scaffold with authentication
- Frontend application scaffold with routing
- AI services scaffold with FastAPI
- Docker Compose setup for local development
- CI/CD pipeline configuration
- Comprehensive documentation

### 🚧 In Progress
- Job posting and management features
- Assessment engine implementation
- AI interview agent integration

### 📅 Planned
- Computer vision analysis (emotion, cheating detection)
- Candidate ranking and insights
- Email notifications
- Advanced analytics dashboard

See [Roadmap](docs/architecture/02-roadmap-and-milestones.md) for detailed milestones.

## 🤝 Contributing

This is a Final Year Project. For development guidelines, see:
- [Architecture Decision Records](docs/decisions/)
- [Security Guidelines](docs/security/README.md)
- [Setup Guide](docs/setup/local-development.md)

## 📄 License

MIT License (or as specified for FYP)

## 📞 Contact

For questions about this FYP project, please refer to the project documentation or contact the development team.
