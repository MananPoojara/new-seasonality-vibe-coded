# Seasonality SaaS - Documentation Hub

**Welcome!** This is your single source of truth for understanding the Seasonality SaaS platform.

---

## 📚 The 5 Core Documentation Files

We've consolidated everything into **5 comprehensive files**. New developers can understand the entire system by reading these:

### 1. [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md)
**Start here if you're new!**

What's inside:
- System overview with diagrams
- Monorepo folder structure
- Technology stack (frontend, backend, database)
- Authentication flow
- Design patterns used
- Deployment architecture

**Who should read:** Everyone (developers, stakeholders, new team members)

---

### 2. [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)
**For frontend developers and API consumers**

What's inside:
- All API endpoints with examples
- Request/response formats
- Authentication methods
- Error handling
- Rate limiting details
- Data models

**Who should read:** Frontend developers, mobile developers, third-party integrators

---

### 3. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
**How the system actually works**

What's inside:
- Complete data flow diagrams
- How analysis calculations work
- Frontend state management
- Backend service architecture
- Chart rendering system
- Caching strategy
- Security flows

**Who should read:** Developers who need to understand workflows and logic

---

### 4. [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
**All about data storage**

What's inside:
- ER diagrams (Entity-Relationship)
- Complete schema documentation
- TimescaleDB hypertable structure
- Query patterns and optimization
- Indexing strategy
- Migration history
- Two-phase implementation approach

**Who should read:** Backend developers, database administrators

---

### 5. [CALCULATION_FORMULAS.md](./CALCULATION_FORMULAS.md)
**The math behind the platform**

What's inside:
- All return calculation formulas
- Statistics (Win Rate, CAGR, Sharpe Ratio, etc.)
- Seasonal analysis calculations
- Event analysis formulas
- Z-score and probability calculations
- Example calculations with real numbers

**Who should read:** Data scientists, quantitative analysts, developers working on calculations

---

## 🗺️ Reading Guide by Role

### 👨‍💻 New Developer
**Start here → go deeper**
1. Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) (overview)
2. Read [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (how it works)
3. Read [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) (endpoints)
4. Reference [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) when needed

### 👨‍💼 Product Manager / Stakeholder
1. Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) (understand the system)
2. Skim [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (know the capabilities)

### 🎨 Frontend Developer
1. Read [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) (know your endpoints)
2. Read [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) sections on Frontend
3. Reference [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) for patterns

### ⚙️ Backend Developer
1. Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) (understand structure)
2. Deep dive [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) (know your data)
3. Reference [CALCULATION_FORMULAS.md](./CALCULATION_FORMULAS.md) for logic

### 📊 Data Engineer / Analyst
1. Read [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) (understand data model)
2. Study [CALCULATION_FORMULAS.md](./CALCULATION_FORMULAS.md) (all the math)
3. Reference [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for data flows

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    SEASONALITY SAAS PLATFORM                 │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js 14)                                       │
│  ├── React + TypeScript                                      │
│  ├── Tailwind CSS + shadcn/ui                               │
│  ├── Zustand (State) + TanStack Query (Server State)        │
│  └── Charts: Recharts, Lightweight Charts                   │
├─────────────────────────────────────────────────────────────┤
│  BACKEND (Node.js + Express)                                 │
│  ├── REST API                                               │
│  ├── JWT Authentication                                      │
│  ├── Services: Daily/Weekly/Monthly/Yearly/Event Analysis   │
│  └── Calculation Engine                                      │
├─────────────────────────────────────────────────────────────┤
│  DATABASE (PostgreSQL + TimescaleDB)                         │
│  ├── Time-series data (OHLCV)                               │
│  ├── User management                                        │
│  └── 217 symbols, 1.2M+ records                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Quick Reference

### Project Structure
```
new-seasonality/
├── apps/
│   ├── backend/          # Node.js API
│   └── frontend/         # Next.js App
├── MDfiles/             # 📍 This documentation
│   ├── README.md        # 📍 You are here
│   ├── SOFTWARE_ARCHITECTURE.md
│   ├── API_ARCHITECTURE.md
│   ├── SYSTEM_DESIGN.md
│   ├── DATABASE_DESIGN.md
│   └── CALCULATION_FORMULAS.md
└── docker-compose.yml   # Local dev environment
```

### Key Technologies
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js 20, Express.js, Prisma ORM
- **Database:** PostgreSQL 16 + TimescaleDB
- **Charts:** Recharts, Lightweight Charts
- **State:** Zustand, TanStack Query
- **Auth:** JWT, bcrypt, Google OAuth
- **DevOps:** Docker, Docker Compose

---

## 🎯 What This Platform Does

Seasonality SaaS helps traders identify **recurring patterns** in financial markets:

1. **Daily Analysis** - Which days of the week perform best?
2. **Weekly Analysis** - How do expiry weeks vs Monday weeks compare?
3. **Monthly Analysis** - Which months are historically strong/weak?
4. **Yearly Analysis** - Year-over-year patterns and comparisons
5. **Event Analysis** - How do specific events (Budget, Elections) impact prices?
6. **Scenario Testing** - Test custom trading strategies

---

## 🚀 Getting Started

### For Developers
1. Clone the repository
2. Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md)
3. Run `docker-compose up` to start the dev environment
4. Check [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) for available endpoints
5. Start coding!

### For Business Users
1. Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) (sections 1-3)
2. Review [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for features
3. Understand capabilities and limitations

---

## ❓ Common Questions

**Q: Where do I start as a new developer?**  
A: Read [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) first, then [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

**Q: How do I add a new API endpoint?**  
A: Check [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) for patterns, then look at existing routes in `apps/backend/src/routes/`.

**Q: What database tables exist?**  
A: See [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) for complete schema with diagrams.

**Q: How are returns calculated?**  
A: All formulas are in [CALCULATION_FORMULAS.md](./CALCULATION_FORMULAS.md).

**Q: How does caching work?**  
A: Read [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) section on Caching Strategy.

---

## 📝 Contributing to Documentation

When making changes:
1. Update the relevant file(s)
2. Keep examples practical and realistic
3. Update this README if navigation changes
4. Add diagrams using Mermaid when helpful

---

## 🔗 External Resources

- **TimescaleDB Docs:** https://docs.timescale.com/
- **Prisma Docs:** https://www.prisma.io/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **Express.js Docs:** https://expressjs.com/en/guide/routing.html

---

## 📞 Need Help?

1. Check the relevant documentation file above
2. Look at the code in `apps/`
3. Ask the development team

---

**Last Updated:** 2026-02-18  
**Version:** 2.0  
**Status:** Complete Documentation Suite

---

*"Everything you need to know in 5 files."*
