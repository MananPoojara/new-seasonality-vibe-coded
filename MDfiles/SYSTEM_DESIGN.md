# Seasonality SaaS - System Design

**Last Updated:** 2026-02-18  
**Purpose:** Complete guide to how the system works internally

---

## 🎯 System Overview

Seasonality SaaS helps traders identify recurring patterns in financial markets. The system analyzes historical data to find seasonal trends across different timeframes.

### What the System Does
1. **Ingests** historical OHLCV data (Open, High, Low, Close, Volume)
2. **Calculates** returns and statistical metrics
3. **Identifies** seasonal patterns (daily, weekly, monthly, yearly)
4. **Analyzes** special events impact on prices
5. **Visualizes** data through interactive charts and tables

---

## 🔄 Complete Data Flow

```mermaid
graph TB
    subgraph "Data Sources"
        CSV[CSV Files<br/>daily.csv]
        ADMIN[Admin Upload]
        EXTERNAL[External APIs<br/>Future]
    end

    subgraph "Ingestion Layer"
        VALIDATE[Validate CSV]
        PARSE[Parse Data]
        TRANSFORM[Transform Format]
    end

    subgraph "Storage Layer"
        TICKER[Ticker Management]
        TIMESERIES[Time-series DB<br/>TimescaleDB]
        CACHE[Redis Cache]
    end

    subgraph "Processing Layer"
        CALC[Calculate Returns]
        AGG[Aggregate Data]
        STATS[Statistics Engine]
    end

    subgraph "Presentation Layer"
        CHARTS[Interactive Charts]
        TABLES[Data Tables]
        FILTERS[Dynamic Filters]
    end

    subgraph "User Actions"
        ANALYZE[Request Analysis]
        FILTER[Apply Filters]
        EXPORT[Export Data]
    end

    CSV --> VALIDATE --> PARSE --> TRANSFORM --> TICKER --> TIMESERIES
    ADMIN --> VALIDATE
    TIMESERIES --> CALC --> AGG --> STATS
    STATS --> CACHE
    CACHE --> CHARTS & TABLES
    USER[User] --> ANALYZE --> FILTER --> EXPORT
    ANALYZE --> CACHE
```

---

## 📊 How Analysis Works

### 1. Daily Analysis Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Cache
    participant DB

    User->>Frontend: Select symbol (NIFTY)
    User->>Frontend: Apply filters (2020-2024)
    Frontend->>Backend: GET /analysis/daily
    
    Backend->>Cache: Check cache
    alt Cache Hit
        Cache-->>Backend: Return cached analysis
    else Cache Miss
        Backend->>DB: Query OHLCV data
        DB-->>Backend: Raw data (1200 records)
        
        Note over Backend: Processing Pipeline
        Backend->>Backend: 1. Calculate daily returns
        Backend->>Backend: 2. Filter by date range
        Backend->>Backend: 3. Compute statistics
        Backend->>Backend: 4. Generate chart data
        
        Backend->>Cache: Store for 1 hour
    end
    
    Backend-->>Frontend: Analysis result
    Frontend->>Frontend: Render charts & tables
    Frontend-->>User: Visual analysis
```

### 2. Calculation Pipeline

```mermaid
graph LR
    subgraph "Input"
        RAW[Raw OHLCV Data<br/>date, open, high, low, close]
    end

    subgraph "Step 1: Calculate Returns"
        PNL[Point Return<br/>close - prevClose]
        PCT[Percentage Return<br/>PNL / prevClose × 100]
    end

    subgraph "Step 2: Aggregate"
        GROUP[Group by Timeframe<br/>Day/Week/Month/Year]
        AVG[Average Returns]
        SUM[Sum of Returns]
    end

    subgraph "Step 3: Statistics"
        WIN[Win Rate<br/>% of positive returns]
        CAGR[Compound Annual Growth]
        SHARPE[Risk-Adjusted Return]
        DD[Maximum Drawdown]
    end

    subgraph "Output"
        RESULT[Analysis Result<br/>Ready for Display]
    end

    RAW --> PNL --> PCT --> GROUP --> AVG --> SUM --> WIN --> CAGR --> SHARPE --> DD --> RESULT
```

---

## 🎨 Frontend System Design

### State Management Flow

```mermaid
graph TB
    subgraph "Global State (Zustand)"
        AUTH[Auth Store<br/>User, Token]
        ANALYSIS[Analysis Store<br/>Symbol, Filters, Results]
        UI[UI Store<br/>Theme, Sidebar State]
    end

    subgraph "Server State (TanStack Query)"
        Q_DAILY[Daily Analysis Query]
        Q_WEEKLY[Weekly Analysis Query]
        Q_SYMBOLS[Symbols Query]
    end

    subgraph "Local Component State"
        LOCAL_CHART[Chart Settings]
        LOCAL_TABLE[Table Sorting]
        LOCAL_FILTER[Filter Values]
    end

    subgraph "Actions"
        A_FETCH[Fetch Analysis]
        A_UPDATE[Update Filters]
        A_NAVIGATE[Tab Navigation]
    end

    AUTH --> A_FETCH
    ANALYSIS --> A_UPDATE
    A_FETCH --> Q_DAILY & Q_WEEKLY
    A_UPDATE --> ANALYSIS
    Q_DAILY --> LOCAL_CHART
    Q_WEEKLY --> LOCAL_TABLE
    A_NAVIGATE --> UI
```

### Component Hierarchy

```
DashboardLayout
├── Header
│   ├── Logo
│   ├── Symbol Selector
│   └── User Menu
├── Left Sidebar (Navigation)
│   ├── Daily
│   ├── Weekly
│   ├── Monthly
│   ├── Yearly
│   ├── Events
│   └── ...
├── Main Content Area
│   ├── Stats Strip
│   ├── Chart Mode Selector
│   ├── Charts Section
│   │   ├── Main Chart (Cumulative/Yearly)
│   │   └── Analytics Matrix
│   ├── Secondary Charts
│   │   ├── Superimposed Pattern
│   │   └── Pattern Returns
│   └── Data Tables
└── Right Filter Console
    ├── Symbol Selector
    ├── Time Range Picker
    ├── Year/Month/Day Filters
    └── Advanced Filters
```

---

## ⚙️ Backend System Design

### Service Architecture

```mermaid
graph TB
    subgraph "API Layer"
        ROUTES[Express Routes]
        CONTROLLERS[Controllers]
    end

    subgraph "Business Logic Layer"
        S_DAILY[DailyAnalysisService]
        S_WEEKLY[WeeklyAnalysisService]
        S_MONTHLY[MonthlyAnalysisService]
        S_YEARLY[YearlyAnalysisService]
        S_EVENT[EventAnalysisService]
        S_SCENARIO[ScenarioAnalysisService]
    end

    subgraph "Calculation Layer"
        C_RETURNS[ReturnCalculator]
        C_STATS[StatisticsCalculator]
        C_AGG[AggregationCalculator]
    end

    subgraph "Data Access Layer"
        REPO_SEASON[SeasonalityRepository]
        REPO_TICKER[TickerRepository]
        PRISMA[Prisma Client]
    end

    subgraph "Database"
        DB[(PostgreSQL<br/>TimescaleDB)]
    end

    ROUTES --> CONTROLLERS
    CONTROLLERS --> S_DAILY & S_WEEKLY & S_MONTHLY & S_YEARLY & S_EVENT & S_SCENARIO
    S_DAILY --> C_RETURNS --> C_STATS --> C_AGG
    C_AGG --> REPO_SEASON --> PRISMA --> DB
```

### How Analysis Services Work

**DailyAnalysisService Example:**
```javascript
class DailyAnalysisService {
  async analyze(symbol, filters) {
    // 1. Fetch raw data from database
    const rawData = await this.repository.findBySymbolAndDateRange(
      symbol, 
      filters.startDate, 
      filters.endDate
    );

    // 2. Apply user filters (years, months, days)
    const filteredData = this.applyFilters(rawData, filters);

    // 3. Calculate returns for each day
    const returns = this.calculateReturns(filteredData);

    // 4. Compute statistics
    const statistics = this.computeStatistics(returns);

    // 5. Generate chart-ready data
    const chartData = this.prepareChartData(returns);

    // 6. Generate table data
    const tableData = this.prepareTableData(returns);

    return {
      symbol,
      chartData,
      tableData,
      statistics,
      filters
    };
  }
}
```

---

## 📈 Chart Rendering System

### Chart Types & Their Purposes

```mermaid
graph LR
    subgraph "Chart Components"
        CUMUL[Cumulative Chart<br/>Shows compounded growth]
        YEARLY[Yearly Overlay<br/>Compare years side-by-side]
        SUPER[Superimposed<br/>Average pattern across years]
        BAR[Bar Chart<br/>Individual returns]
    end

    subgraph "Use Cases"
        U_TREND[Identify long-term trends]
        U_COMPARE[Compare different years]
        U_PATTERN[Find recurring patterns]
        U_DIST[Return distribution]
    end

    CUMUL --> U_TREND
    YEARLY --> U_COMPARE
    SUPER --> U_PATTERN
    BAR --> U_DIST
```

### Chart Data Preparation

**Cumulative Chart Example:**
```javascript
// Transform raw returns into cumulative data
function prepareCumulativeData(returns) {
  let cumulative = 1; // Start at 1 (100%)
  
  return returns.map(day => {
    cumulative = cumulative * (1 + day.returnPercentage / 100);
    return {
      date: day.date,
      cumulativeReturn: (cumulative - 1) * 100 // Convert to percentage
    };
  });
}
```

---

## 🗄️ Caching Strategy

### Multi-Level Caching

```mermaid
graph TB
    subgraph "Level 1: Browser Cache"
        L1[Static Assets<br/>JS/CSS/Images<br/>1 Year TTL]
    end

    subgraph "Level 2: API Response Cache"
        L2[Redis Cache<br/>Analysis Results<br/>1 Hour TTL]
    end

    subgraph "Level 3: Database Cache"
        L3[Materialized Views<br/>Pre-computed Stats<br/>Daily Refresh]
    end

    subgraph "Cache Keys"
        K1[analysis:daily:NIFTY:2020:2024]
        K2[symbols:list]
        K3[user:profile:123]
    end

    CLIENT[Client] --> L1
    CLIENT --> L2
    L2 --> L3
    L2 --> K1 & K2 & K3
```

### Cache Invalidation
- **Analysis Results**: 1 hour TTL, invalidated on new data upload
- **Symbol Lists**: 24 hour TTL, invalidated when new ticker added
- **User Data**: On profile update

---

## 🔒 Security Flow

### Authentication & Authorization

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Auth
    participant DB

    %% Login Flow
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /auth/login
    Backend->>DB: Find user by email
    DB-->>Backend: User record
    Backend->>Auth: Verify password
    Auth-->>Backend: Valid
    Backend->>Backend: Generate JWT
    Backend-->>Frontend: Token + User
    Frontend->>Frontend: Store token (httpOnly)

    %% Protected Request
    User->>Frontend: Request analysis
    Frontend->>Backend: GET /analysis/daily<br/>Authorization: Bearer <token>
    Backend->>Auth: Verify token
    Auth-->>Backend: Valid (userId: 123)
    Backend->>Backend: Check permissions
    Backend->>DB: Fetch data
    DB-->>Backend: Results
    Backend-->>Frontend: Analysis data
```

---

## 📊 Event Analysis System

### How Event Analysis Works

```mermaid
graph TB
    subgraph "Event Data"
        E_DATE[Event Date<br/>e.g., Budget Day]
        E_TYPE[Event Type<br/>Economic/Political]
    end

    subgraph "Window Analysis"
        BEFORE[Days Before<br/>T-10 to T-1]
        EVENT[Event Day<br/>T0]
        AFTER[Days After<br/>T+1 to T+10]
    end

    subgraph "Calculations"
        CURVE[Average Event Curve<br/>Mean return per day]
        CUMUL[Cumulative Profit<br/>Total P&L over time]
        STATS[Event Statistics<br/>Win rate, Sharpe]
    end

    subgraph "Visualization"
        CHART[Event Pattern Chart]
        TABLE[Event Occurrences Table]
    end

    E_DATE --> BEFORE & EVENT & AFTER
    BEFORE --> CURVE
    EVENT --> CURVE
    AFTER --> CURVE
    CURVE --> CUMUL --> STATS
    CURVE --> CHART
    STATS --> TABLE
```

---

## 🚀 Performance Optimizations

### Database Query Optimization

**Chunk Exclusion (TimescaleDB):**
```sql
-- Automatically excludes chunks outside date range
SELECT * FROM seasonality_data 
WHERE ticker_id = 1 
  AND date BETWEEN '2020-01-01' AND '2020-12-31';
-- Only scans 1 chunk (1 month) instead of all 60 months
```

**Parallel Processing:**
```javascript
// Multiple chunks processed in parallel
const promises = chunks.map(chunk => 
  db.query(`SELECT ... FROM ${chunk.table_name} WHERE ...`)
);
const results = await Promise.all(promises);
```

### Frontend Optimizations

**Lazy Loading:**
```typescript
// Charts loaded only when needed
const SeasonalityChart = dynamic(
  () => import('@/components/charts/SeasonalityChart'),
  { ssr: false, loading: () => <Skeleton /> }
);
```

**Virtualized Tables:**
```typescript
// Only render visible rows
<VirtualizedTable
  data={10000Rows}
  rowHeight={40}
  overscan={5}
/>
```

---

## 🧪 Testing Strategy

### Testing Pyramid

```mermaid
graph TD
    subgraph "Testing Layers"
        E2E[End-to-End Tests<br/>Playwright<br/>10%]
        INT[Integration Tests<br/>Jest + Supertest<br/>20%]
        UNIT[Unit Tests<br/>Jest<br/>70%]
    end

    subgraph "What We Test"
        E2E --> USER[User Workflows<br/>Login → Analysis → Export]
        INT --> API[API Endpoints<br/>Request/Response]
        UNIT --> CALC[Calculations<br/>Statistics]
        UNIT --> COMP[Components<br/>Rendering]
    end
```

---

## 📈 Scaling Strategy

### Current Scale
- **Symbols**: 217 tickers
- **Records**: ~1.2M records (217 × 5,000 days)
- **Concurrent Users**: 50-100
- **Query Time**: <500ms for 95% of requests

### Future Scale
- **Symbols**: 2,000+ tickers
- **Records**: 100M+ records
- **Concurrent Users**: 1,000+
- **Query Time**: <200ms with optimization

### Scaling Steps
1. **Database**: Read replicas, connection pooling
2. **Caching**: Redis Cluster, CDN for static assets
3. **API**: Horizontal scaling with load balancer
4. **Frontend**: Static export to CDN

---

## 📚 Related Documentation

- [Software Architecture](./SOFTWARE_ARCHITECTURE.md) - High-level design
- [API Architecture](./API_ARCHITECTURE.md) - API endpoints
- [Database Design](./DATABASE_DESIGN.md) - Data models
- [Calculation Formulas](./CALCULATION_FORMULAS.md) - Math explained

---

**Questions?** This document explains HOW things work. Check other docs for specific details!
