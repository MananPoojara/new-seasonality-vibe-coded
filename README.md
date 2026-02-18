# 🏗️ Seasonality SaaS Platform

A comprehensive financial analysis platform that helps traders identify seasonal patterns in stock market data across different timeframes (daily, weekly, monthly, yearly) and special events.

## 🎯 What This Platform Does

Seasonality SaaS analyzes historical market data to discover recurring patterns:

- **📅 Daily Analysis** - Which days of the week perform best?
- **📊 Weekly Analysis** - Expiry weeks vs Monday weeks comparison
- **📈 Monthly Analysis** - Which months are historically strong/weak?
- **📉 Yearly Analysis** - Year-over-year patterns and comparisons
- **🎆 Event Analysis** - Impact of Budget, Elections, and other events
- **🧪 Scenario Testing** - Test custom trading strategies

## 🚀 Quick Start

### For Users (Docker)
```bash
# 1. Clone the repository
git clone <your-repo-url> seasonality-saas
cd seasonality-saas

# 2. Run the quick setup script
chmod +x scripts/quick-setup.sh
./scripts/quick-setup.sh

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### For Developers
```bash
# 1. Clone and setup
git clone <your-repo-url> seasonality-saas
cd seasonality-saas

# 2. Start infrastructure (database, cache, etc.)
docker-compose up -d postgres redis minio

# 3. Setup backend
cd apps/backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# 4. Setup frontend (new terminal)
cd apps/frontend
npm install
npm run dev

# 5. Access the app
# Open http://localhost:3000
```

## 📚 Documentation

### 🎓 Core Documentation (Start Here!)

We've consolidated everything into **5 comprehensive documentation files**. New developers can understand the entire system by reading these:

| File | Purpose | Read If You Are... |
|------|---------|-------------------|
| **[MDfiles/README.md](MDfiles/README.md)** | Master guide with navigation | Everyone - **Start here!** |
| **[MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md)** | System overview, tech stack, folder structure | New team members, stakeholders |
| **[MDfiles/API_ARCHITECTURE.md](MDfiles/API_ARCHITECTURE.md)** | All API endpoints with examples | Frontend developers, integrators |
| **[MDfiles/SYSTEM_DESIGN.md](MDfiles/SYSTEM_DESIGN.md)** | How it works internally | Developers implementing features |
| **[MDfiles/DATABASE_DESIGN.md](MDfiles/DATABASE_DESIGN.md)** | Schema, ER diagrams, queries | Backend developers, DBAs |
| **[MDfiles/CALCULATION_FORMULAS.md](MDfiles/CALCULATION_FORMULAS.md)** | All statistical formulas | Data scientists, quants |

### 📖 Reading Guide by Role

**👨‍💻 New Developer:**
1. Read [MDfiles/README.md](MDfiles/README.md) (navigation guide)
2. Read [MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md) (overview)
3. Read [MDfiles/SYSTEM_DESIGN.md](MDfiles/SYSTEM_DESIGN.md) (how it works)
4. Reference others as needed

**🎨 Frontend Developer:**
- [MDfiles/API_ARCHITECTURE.md](MDfiles/API_ARCHITECTURE.md) - Know your endpoints
- [MDfiles/SYSTEM_DESIGN.md](MDfiles/SYSTEM_DESIGN.md) - Frontend architecture

**⚙️ Backend Developer:**
- [MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md) - System structure
- [MDfiles/DATABASE_DESIGN.md](MDfiles/DATABASE_DESIGN.md) - Data model
- [MDfiles/CALCULATION_FORMULAS.md](MDfiles/CALCULATION_FORMULAS.md) - Business logic

**📊 Product Manager / Stakeholder:**
- [MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md) - Capabilities
- [MDfiles/SYSTEM_DESIGN.md](MDfiles/SYSTEM_DESIGN.md) - Features

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js 14]
        MOBILE[Mobile Ready<br/>Responsive]
    end

    subgraph "API Layer"
        NGINX[Nginx Proxy]
        API[REST API<br/>Node.js + Express]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>TimescaleDB)]
        CACHE[(Redis Cache)]
        STORAGE[File Storage]
    end

    subgraph "Analysis Engine"
        CALC[Calculation Service]
        STATS[Statistics Engine]
    end

    WEB --> NGINX --> API
    API --> CALC --> STATS
    CALC --> DB
    STATS --> CACHE
    API --> STORAGE
```

## 📋 System Requirements

### **Minimum Requirements**
- **OS**: Ubuntu 20.04 LTS or newer (or any Docker-compatible OS)
- **CPU**: 4 cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB free space (SSD preferred)
- **Network**: Stable internet connection

### **Software Dependencies**
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- Git (latest)

## 📁 Project Structure

```
seasonality-saas/
├── 📂 apps/
│   ├── 📂 backend/              # Node.js + Express API
│   │   ├── 📂 src/
│   │   │   ├── 📂 controllers/  # API route handlers
│   │   │   ├── 📂 services/     # Business logic
│   │   │   ├── 📂 routes/       # API endpoint definitions
│   │   │   ├── 📂 models/       # Prisma schema
│   │   │   └── 📂 utils/        # Helper functions
│   │   └── 📂 prisma/           # Database migrations
│   │
│   └── 📂 frontend/             # Next.js 14 Application
│       ├── 📂 src/
│       │   ├── 📂 app/          # Next.js app router
│       │   ├── 📂 components/   # React components
│       │   ├── 📂 hooks/        # Custom hooks
│       │   ├── 📂 lib/          # Utilities & API
│       │   └── 📂 store/        # Zustand state
│       └── 📂 public/           # Static assets
│
├── 📂 MDfiles/                  # 📚 Documentation (5 core files)
│   ├── README.md                # Start here!
│   ├── SOFTWARE_ARCHITECTURE.md
│   ├── API_ARCHITECTURE.md
│   ├── SYSTEM_DESIGN.md
│   ├── DATABASE_DESIGN.md
│   └── CALCULATION_FORMULAS.md
│
├── 📂 scripts/                  # Utility scripts
├── 📄 docker-compose.yml        # Docker configuration
└── 📄 README.md                 # This file
```

## 🛠️ Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20 | JavaScript runtime |
| Framework | Express.js 4 | Web framework |
| Database | PostgreSQL 16 + TimescaleDB | Time-series data |
| ORM | Prisma 5 | Type-safe database access |
| Auth | JWT + bcrypt | Authentication |
| Validation | express-validator | Input validation |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 14 (App Router) | React framework |
| Language | TypeScript 5 | Type safety |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Components | shadcn/ui | UI component library |
| Charts | Recharts + Lightweight Charts | Data visualization |
| State | Zustand | Client state |
| Server State | TanStack Query | API caching |

### Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker + Docker Compose | Development |
| Web Server | Nginx | Reverse proxy |
| Cache | Redis | Session & API caching |
| Storage | MinIO | File storage |

## ⚙️ Configuration

### **Environment Variables**
Copy `.env.example` to `.env` and customize:

```bash
# Database
DATABASE_URL=postgresql://seasonality:your_password@localhost:5432/seasonality

# Security
JWT_SECRET=your-super-secure-jwt-secret
BCRYPT_ROUNDS=12

# API
API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### **Resource Optimization**

For **8GB RAM systems**, use low-memory mode:
```bash
docker-compose -f docker-compose.yml -f docker-compose.low-memory.yml up -d
```

For **16GB+ RAM systems**, use standard configuration:
```bash
docker-compose up -d
```

## 🔧 Management Commands

### **Service Management**
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Scale backend service
docker-compose up -d --scale backend=2
```

### **Database Commands**
```bash
# Run migrations
cd apps/backend && npx prisma migrate dev

# Seed database
cd apps/backend && npm run db:seed

# Open Prisma Studio
cd apps/backend && npx prisma studio
```

### **Development Commands**
```bash
# Backend (Terminal 1)
cd apps/backend && npm run dev

# Frontend (Terminal 2)
cd apps/frontend && npm run dev

# Run tests
cd apps/backend && npm test
cd apps/frontend && npm test
```

## 🔍 Monitoring & Troubleshooting

### **System Health**
```bash
# Run health check
./scripts/health-check.sh

# View resource usage
docker stats

# Check service status
docker-compose ps
```

### **Common Issues**

#### Services Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check available resources
free -h && df -h

# Restart Docker
sudo systemctl restart docker
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U seasonality
```

## 🔐 Security Features

- ✅ **Network Isolation**: Private Docker network
- ✅ **Rate Limiting**: API endpoint protection
- ✅ **Security Headers**: HTTP security headers
- ✅ **Input Validation**: All API inputs validated
- ✅ **Authentication**: JWT-based auth
- ✅ **Password Security**: bcrypt hashing
- ✅ **CORS**: Configured for security
- ✅ **SQL Injection Prevention**: Prisma ORM protection

## 📊 Performance Optimizations

### **Database**
- TimescaleDB hypertables for time-series data
- Optimized indexes for common queries
- Connection pooling
- Query performance monitoring

### **Caching**
- Redis for session storage
- API response caching (1-hour TTL)
- Static asset caching via Nginx

### **Frontend**
- Component lazy loading
- Image optimization
- Code splitting

## 🚀 Production Readiness

This infrastructure is production-ready with:
- ✅ **High Availability**: Automatic service restart
- ✅ **Data Persistence**: Named volumes
- ✅ **Backup Strategy**: Automated backup scripts
- ✅ **Monitoring**: Health checks
- ✅ **Security**: Production security configs
- ✅ **Performance**: Optimized for 100-1000 concurrent users
- ✅ **Scalability**: Designed for horizontal scaling

## 📈 Current Scale

- **Symbols**: 217 tickers available
- **Records**: ~1.2M records (217 × 5,000 days)
- **Timeframes**: Daily, Weekly, Monthly, Yearly
- **Events**: Economic, Political, Company-specific

## 🤝 Contributing

1. Read the documentation in `MDfiles/`
2. Follow the existing code patterns
3. Write tests for new features
4. Update documentation as needed

## 📞 Support

### **Documentation**
- **[MDfiles/README.md](MDfiles/README.md)** - Start here
- **[MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md)** - System design
- **[MDfiles/API_ARCHITECTURE.md](MDfiles/API_ARCHITECTURE.md)** - API reference

### **Quick Help**
- **Setup Issues**: Run `./scripts/health-check.sh`
- **Performance Issues**: Monitor with `docker stats`
- **Service Issues**: Check logs with `docker-compose logs [service]`
- **API Issues**: Check [MDfiles/API_ARCHITECTURE.md](MDfiles/API_ARCHITECTURE.md)

## 📄 License

[Your License Here]

---

**🎉 Your Seasonality SaaS platform is ready!**

Built with ❤️ for data-driven trading analysis.

**Next Steps:**
1. 📖 Read [MDfiles/README.md](MDfiles/README.md) for detailed navigation
2. 🏗️ Check [MDfiles/SOFTWARE_ARCHITECTURE.md](MDfiles/SOFTWARE_ARCHITECTURE.md) for system overview
3. 🚀 Start developing with the quick start guide above
