# Seasonality SaaS - Software Architecture

**Last Updated:** 2026-02-18  
**Version:** 2.0  
**Purpose:** Complete architectural overview for developers and stakeholders

---

## 🏗️ System Overview

Seasonality SaaS is a financial analysis platform that identifies seasonal patterns in stock market data. The platform helps traders and analysts discover recurring patterns across different timeframes (daily, weekly, monthly, yearly) and special events.

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>Next.js 14]
        MOBILE[Mobile Ready<br/>Responsive PWA]
    end

    subgraph "API Gateway"
        NGINX[Nginx Reverse Proxy]
        RATE[Rate Limiting]
        AUTH[Auth Middleware]
    end

    subgraph "Backend Services"
        API[REST API<br/>Node.js + Express]
        CALC[Calculation Engine<br/>Statistical Analysis]
        FILE[File Processing<br/>CSV Uploads]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>TimescaleDB)]
        CACHE[(Redis<br/>Session & Cache)]
        STORAGE[File Storage<br/>Local/MinIO]
    end

    subgraph "External Integrations"
        GOOGLE[Google OAuth]
        EMAIL[Email Service]
    end

    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> RATE
    RATE --> AUTH
    AUTH --> API
    API --> CALC
    API --> FILE
    CALC --> DB
    FILE --> DB
    FILE --> STORAGE
    API --> CACHE
    API --> GOOGLE
    API --> EMAIL
```

---

## 📁 Monorepo Structure

```
new-seasonality/
├── 📂 apps/
│   ├── 📂 backend/              # Node.js + Express API
│   │   ├── 📂 src/
│   │   │   ├── 📂 controllers/  # Route handlers
│   │   │   ├── 📂 services/     # Business logic
│   │   │   ├── 📂 routes/       # API endpoint definitions
│   │   │   ├── 📂 middleware/   # Auth, validation, error handling
│   │   │   ├── 📂 models/       # Prisma schema
│   │   │   ├── 📂 utils/        # Helper functions
│   │   │   └── 📂 config/       # Environment configs
│   │   ├── 📂 prisma/           # Database schema & migrations
│   │   └── 📂 scripts/          # Data migration scripts
│   │
│   └── 📂 frontend/             # Next.js 14 Application
│       ├── 📂 src/
│       │   ├── 📂 app/          # Next.js app router
│       │   │   ├── 📂 (dashboard)/   # Protected routes
│       │   │   │   ├── 📂 dashboard/
│       │   │   │   │   ├── 📂 daily/
│       │   │   │   │   ├── 📂 weekly/
│       │   │   │   │   ├── 📂 monthly/
│       │   │   │   │   ├── 📂 yearly/
│       │   │   │   │   ├── 📂 events/
│       │   │   │   │   └── 📂 ...
│       │   │   │   └── 📂 admin/
│       │   │   ├── 📂 api/      # API routes
│       │   │   └── 📂 login/    # Auth pages
│       │   ├── 📂 components/   # React components
│       │   │   ├── 📂 charts/   # Chart components
│       │   │   ├── 📂 filters/  # Filter components
│       │   │   ├── 📂 layout/   # Layout components
│       │   │   └── 📂 ui/       # shadcn/ui components
│       │   ├── 📂 hooks/        # Custom React hooks
│       │   ├── 📂 lib/          # Utilities & API clients
│       │   ├── 📂 store/        # Zustand state management
│       │   └── 📂 types/        # TypeScript types
│       └── 📂 public/           # Static assets
│
├── 📂 MDfiles/                  # Documentation
├── 📂 packages/                 # Shared packages (if any)
├── 📄 docker-compose.yml        # Local development stack
├── 📄 package.json             # Root package.json
└── 📄 README.md                # Project overview
```

---

## 🎯 Core Components

### 1. **Backend Architecture**

```mermaid
graph LR
    subgraph "Express Application"
        APP[App.js<br/>Server Setup]
        
        subgraph "Middleware Stack"
            CORS[CORS]
            RATE[Rate Limiter]
            AUTH[Auth Middleware]
            VALID[Validation]
        end
        
        subgraph "Route Modules"
            R_AUTH[/auth/]
            R_ANALYSIS[/analysis/]
            R_DATA[/data/]
            R_ADMIN[/admin/]
        end
        
        subgraph "Service Layer"
            S_DAILY[DailyAnalysis]
            S_WEEKLY[WeeklyAnalysis]
            S_MONTHLY[MonthlyAnalysis]
            S_YEARLY[YearlyAnalysis]
            S_EVENT[EventAnalysis]
        end
        
        subgraph "Data Access"
            PRISMA[Prisma Client]
            DB[(PostgreSQL)]
        end
    end

    APP --> CORS --> RATE --> AUTH --> VALID
    VALID --> R_AUTH & R_ANALYSIS & R_DATA & R_ADMIN
    R_ANALYSIS --> S_DAILY & S_WEEKLY & S_MONTHLY & S_YEARLY & S_EVENT
    S_DAILY & S_WEEKLY & S_MONTHLY & S_YEARLY & S_EVENT --> PRISMA --> DB
```

### 2. **Frontend Architecture**

```mermaid
graph TB
    subgraph "Next.js App"
        LAYOUT[Root Layout<br/>Providers]
        
        subgraph "Route Groups"
            AUTH[(auth)]
            DASHBOARD[(dashboard)]
            ADMIN[(admin)]
        end
        
        subgraph "Shared Components"
            UI[shadcn/ui
            Components]
            CHARTS[Chart Library
            Recharts/Lightweight]
            FILTERS[Filter System]
        end
        
        subgraph "State Management"
            ZUSTAND[Zustand Stores]
            REACT_QUERY[TanStack Query
            Server State]
            LOCAL[Local State]
        end
        
        subgraph "Data Layer"
            API_CLIENT[API Client
            Axios/Fetch]
            TYPES[TypeScript
            Types]
        end
    end

    LAYOUT --> AUTH & DASHBOARD & ADMIN
    DASHBOARD --> UI & CHARTS & FILTERS
    CHARTS --> ZUSTAND & REACT_QUERY
    FILTERS --> ZUSTAND
    REACT_QUERY --> API_CLIENT --> TYPES
```

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant Google

    %% Email/Password Login
    alt Email/Password Authentication
        User->>Frontend: Enter credentials
        Frontend->>Backend: POST /auth/login
        Backend->>Database: Validate user
        Database-->>Backend: User data
        Backend->>Backend: Verify password (bcrypt)
        Backend->>Backend: Generate JWT
        Backend-->>Frontend: JWT + User data
        Frontend->>Frontend: Store token (httpOnly cookie)
        Frontend-->>User: Redirect to dashboard
    end

    %% Google OAuth Login
    alt Google OAuth
        User->>Frontend: Click "Login with Google"
        Frontend->>Google: OAuth redirect
        Google-->>User: Login prompt
        User->>Google: Authenticate
        Google-->>Frontend: Authorization code
        Frontend->>Backend: POST /auth/google/callback
        Backend->>Google: Exchange code for token
        Google-->>Backend: User info
        Backend->>Database: Find/create user
        Database-->>Backend: User record
        Backend->>Backend: Generate JWT
        Backend-->>Frontend: JWT + User data
        Frontend-->>User: Redirect to dashboard
    end
```

---

## 🧮 Analysis Engine Architecture

The calculation engine processes time-series data to identify seasonal patterns.

```mermaid
graph TB
    subgraph "Analysis Request"
        REQ[API Request<br/>Symbol + Filters]
    end

    subgraph "Data Fetching"
        RAW[Raw Data<br/>OHLCV Records]
        FILTERS[Apply Filters
Date Range<br/>Years/Months/Weeks]
    end

    subgraph "Calculation Pipeline"
        RETURNS[Calculate Returns<br/>PnL %]
        AGG[Aggregate Data<br/>By Timeframe]
        STATS[Compute Statistics
Win Rate, CAGR, Sharpe]
        CHART[Generate Chart Data
Cumulative, Patterns]
    end

    subgraph "Response"
        JSON[JSON Response
Data + Metadata]
    end

    REQ --> RAW --> FILTERS --> RETURNS --> AGG --> STATS --> CHART --> JSON
```

---

## 🔄 Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Cache as Redis
    participant DB as PostgreSQL
    participant Files as CSV Files

    %% Data Upload Flow
    Note over User,Files: Data Upload (Admin Only)
    User->>Frontend: Upload CSV file
    Frontend->>Backend: POST /admin/upload
    Backend->>Backend: Validate CSV format
    Backend->>Files: Store file
    Backend->>Backend: Process in background
    loop For each row
        Backend->>DB: Insert/Update record
    end
    Backend-->>Frontend: Upload status

    %% Analysis Request Flow
    Note over User,DB: Analysis Request
    User->>Frontend: Select symbol & filters
    Frontend->>Backend: GET /api/analysis/daily
    Backend->>Cache: Check cache
    alt Cache Hit
        Cache-->>Backend: Cached result
    else Cache Miss
        Backend->>DB: Query data
        DB-->>Backend: Raw OHLCV data
        Backend->>Backend: Calculate statistics
        Backend->>Cache: Store result
    end
    Backend-->>Frontend: Analysis results
    Frontend->>Frontend: Render charts & tables
```

---

## 🛠️ Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20 | JavaScript runtime |
| Framework | Express.js 4 | Web framework |
| Database | PostgreSQL 16 + TimescaleDB | Time-series data |
| ORM | Prisma 5 | Database access |
| Auth | JWT + bcrypt | Authentication |
| Validation | express-validator | Input validation |
| Testing | Jest | Unit tests |

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
| Icons | Lucide React | Icon library |

### Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker + Docker Compose | Development environment |
| Web Server | Nginx | Reverse proxy |
| Cache | Redis | Session & API caching |
| Storage | MinIO (optional) | File storage |

---

## 🎨 Design Patterns

### 1. **Service Pattern (Backend)**
```javascript
// services/DailyAnalysisService.js
class DailyAnalysisService {
  async analyze(symbol, filters) {
    const data = await this.fetchData(symbol, filters);
    const returns = this.calculateReturns(data);
    const statistics = this.computeStatistics(returns);
    return { data, returns, statistics };
  }
}
```

### 2. **Repository Pattern (Backend)**
```javascript
// repositories/SeasonalityRepository.js
class SeasonalityRepository {
  async findBySymbolAndDateRange(symbol, startDate, endDate) {
    return prisma.seasonalityData.findMany({
      where: { ticker: { symbol }, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' }
    });
  }
}
```

### 3. **Compound Component Pattern (Frontend)**
```typescript
// components/filters/FilterSection.tsx
<FilterSection>
  <FilterSection.Header title="Time Range" />
  <FilterSection.Content>
    <DateRangePicker />
  </FilterSection.Content>
</FilterSection>
```

### 4. **Custom Hooks Pattern (Frontend)**
```typescript
// hooks/useAnalysis.ts
export function useAnalysis(symbol: string, timeframe: string) {
  return useQuery({
    queryKey: ['analysis', symbol, timeframe],
    queryFn: () => fetchAnalysis(symbol, timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer<br/>Nginx/CloudFlare]
        
        subgraph "Application Servers"
            FE1[Frontend Server 1<br/>Next.js]
            FE2[Frontend Server 2<br/>Next.js]
            BE1[Backend Server 1<br/>Node.js]
            BE2[Backend Server 2<br/>Node.js]
        end
        
        subgraph "Data Layer"
            PG[(PostgreSQL Primary)]
            PG_R[(PostgreSQL Replica)]
            REDIS[(Redis Cluster)]
        end
    end

    USER[Users] --> LB
    LB --> FE1 & FE2
    FE1 & FE2 --> BE1 & BE2
    BE1 & BE2 --> PG & REDIS
    PG --> PG_R
```

---

## 📊 Scalability Strategy

### Horizontal Scaling
- **Frontend**: Static export to CDN (Vercel/CloudFront)
- **Backend**: Multiple Node.js instances behind load balancer
- **Database**: Read replicas for analytics queries
- **Cache**: Redis Cluster for distributed caching

### Performance Optimization
- **Database**: TimescaleDB hypertables for time-series data
- **Caching**: API response caching (1-hour TTL)
- **Frontend**: Component lazy loading, image optimization
- **CDN**: Static assets served from edge locations

---

## 🔒 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        HTTPS[HTTPS/TLS 1.3]
        CORS[CORS Policy]
        RATE[Rate Limiting]
        AUTH[JWT Authentication]
        VALID[Input Validation]
        SQL[SQL Injection Prevention]
        XSS[XSS Protection]
    end

    CLIENT[Client] --> HTTPS --> WAF --> CORS --> RATE --> AUTH --> VALID --> SQL --> XSS --> APP[Application]
```

---

## 📈 Monitoring & Observability

- **Logging**: Structured JSON logs with correlation IDs
- **Metrics**: Application performance metrics (response time, error rate)
- **Health Checks**: `/health` endpoint for all services
- **Alerting**: Email/Slack notifications for critical errors

---

## 🎯 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo** | Shared types, easier coordination between frontend/backend |
| **TimescaleDB** | Native time-series support, automatic partitioning |
| **Next.js App Router** | Server components for better performance |
| **Zustand** | Simple, lightweight state management |
| **Prisma** | Type-safe database access, migration support |
| **Docker** | Consistent development environment |

---

## 📚 Related Documentation

- [API Architecture](./API_ARCHITECTURE.md) - All API endpoints
- [Database Design](./DATABASE_DESIGN.md) - Schema and queries
- [System Design](./SYSTEM_DESIGN.md) - How it works
- [Calculation Formulas](./CALCULATION_FORMULAS.md) - Statistical methods

---

**Questions?** Check the individual component documentation or ask the team!
