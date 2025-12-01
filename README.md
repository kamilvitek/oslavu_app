# Oslavu - AI-Powered Event Date Optimization

> **Pick the perfect date—data-backed, competitor-free**

Oslavu is a sophisticated SaaS platform that helps event managers pick the perfect date for their conferences and events by automatically detecting conflicts with other major events in the same city or niche. Instead of manually googling and cross-checking spreadsheets, organisers instantly see a conflict-score for every possible date, powered by AI-driven analysis.

## 🎯 Project Overview

### The Problem
- Conferences lose attendees and sponsors when dates overlap with competing events or big local festivals
- Organisers still rely on manual Google searches or spreadsheets, which is time-consuming and error-prone
- A single poorly chosen date can lead to no-shows, wasted ad budgets, and negative ROI

### The Solution
Oslavu provides a comprehensive conflict analysis platform with:

1. **Multi-Source Data Ingestion**
   - External APIs: Ticketmaster Discovery, PredictHQ, Perplexity AI
   - Web Scraping: Czech event websites (GoOut, TicketPortal, Brno Expat, etc.)
   - Local Data: Brno city events and regional calendars
   - AI-Powered Content Extraction using GPT-4

2. **Advanced Deduplication & Clustering**
   - Semantic similarity detection using OpenAI embeddings
   - Vector-based duplicate detection across all sources
   - Intelligent event clustering by theme/topic
   - Audience overlap analysis using AI

3. **Sophisticated Conflict-Score Engine**
   - Multi-factor scoring algorithm (0-20 scale)
   - Geographic and temporal conflict detection
   - Audience overlap prediction
   - Risk level assessment (Low/Medium/High)
   - Real-time analysis with <30 second response times

4. **Intelligent Frontend**
   - Interactive date selection with real-time analysis
   - Comprehensive event visualization
   - Risk assessment with detailed explanations
   - Mobile-responsive design with modern UI/UX

### Target Audience
**Primary:**
- Startup & tech conference organisers (e.g. JIC Brno's 30+ events/year)
- Event management agencies
- Corporate event planners

**Secondary:**
- Professional associations
- Educational institutions
- Non-profit organizations

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18+ (recommended: 20+)
- **npm**: Version 9+
- **Supabase Account**: For database hosting
- **API Keys**: OpenAI, Firecrawl, Ticketmaster, PredictHQ, Perplexity (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd oslavu_app

# Install dependencies
npm install

# Set up environment variables
cp env-template.txt .env.local
# Edit .env.local with your API keys (see Environment Variables section)

# Run database migrations
supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📚 Documentation

- **[Complete Documentation](docs/README.md)** - Comprehensive project overview
- **[Getting Started](docs/development/setup.md)** - Development setup guide
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[Components](docs/COMPONENTS.md)** - Component documentation and responsibilities
- **[API Reference](docs/API.md)** - Backend API routes and endpoints
- **[Data Structures](docs/DATA_STRUCTURES.md)** - Types, models, and schemas
- **[Application Flows](docs/FLOWS.md)** - Frontend flows and state management
- **[Features](docs/features/)** - Detailed feature documentation
  - [Conflict Analysis](docs/features/conflict-analysis.md) - Core conflict detection
  - [Web Scraping](docs/features/web-scraping.md) - Data collection infrastructure
  - [AI Normalization](docs/features/ai-normalization.md) - AI-powered data processing
  - [Performance](docs/features/performance.md) - Optimization and monitoring
  - [Seasonality](docs/features/seasonality.md) - Seasonal patterns and holiday impact

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **Components**: shadcn/ui component library
- **State Management**: @tanstack/react-query for server state
- **Forms**: react-hook-form with zod validation
- **Animations**: Custom CSS animations and transitions

### Backend
- **API Layer**: Next.js API routes with Vercel serverless functions
- **Database**: Supabase (PostgreSQL) with vector extensions
- **Authentication**: Supabase Auth with Row-Level Security
- **Caching**: Request deduplication and intelligent caching
- **Rate Limiting**: Built-in request throttling

### AI & External Services
- **OpenAI**: GPT-4 for content extraction and audience analysis
- **Firecrawl**: Web scraping and content extraction
- **Ticketmaster Discovery API**: Global event data
- **PredictHQ API**: Event intelligence and forecasting
- **Perplexity AI**: Online event research (optional)

### Development Tools
- **Testing**: Jest with comprehensive test coverage
- **Code Quality**: ESLint, TypeScript strict mode
- **Version Control**: Git with comprehensive branching strategy
- **CI/CD**: Vercel automated deployments

## 📁 Project Structure

```
oslavu_app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   │   ├── analyze/       # Conflict analysis endpoints
│   │   │   ├── events/        # Event management endpoints
│   │   │   ├── scraper/       # Web scraping endpoints
│   │   │   ├── holidays/      # Holiday data endpoints
│   │   │   └── observability/ # Monitoring and metrics
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── test-scraper/      # Scraper testing interface
│   │   ├── globals.css        # Global styles and design system
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components (header, footer)
│   │   ├── providers/        # Context providers
│   │   ├── sections/         # Page sections (hero, features, etc.)
│   │   ├── ui/               # Reusable UI components
│   │   ├── analytics/        # Analytics components (GTM, GA)
│   │   ├── data-visualization/ # Charts and visualizations
│   │   └── feedback/         # User feedback components
│   ├── lib/                   # Core business logic
│   │   ├── services/         # Business logic services
│   │   │   ├── conflict-analysis.ts    # Core conflict analysis engine
│   │   │   ├── event-scraper.ts        # Web scraping service
│   │   │   ├── event-storage.ts        # Database operations
│   │   │   ├── ai-audience-overlap.ts  # AI-powered analysis
│   │   │   ├── batch-audience-overlap.ts # Batch processing service
│   │   │   └── observability.ts        # Monitoring service
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript type definitions
│   │   ├── constants/        # Constants and taxonomies
│   │   ├── hooks/            # Custom React hooks
│   │   └── supabase.ts       # Database client configuration
│   └── types/                # Global type definitions
├── supabase/
│   └── migrations/           # Database migration files
├── scripts/                  # Utility and migration scripts
├── docs/                     # Project documentation
├── public/                   # Static assets
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
└── tailwind.config.ts        # Tailwind CSS configuration
```

## 🔧 Environment Variables

Copy `env-template.txt` to `.env.local` and fill in your values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration (for AI scraping)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EXTRACTION_MODEL=gpt-4o-mini  # Options: gpt-4o-mini, gpt-4o, gpt-4-turbo

# Firecrawl Configuration (for web scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# PredictHQ Configuration (for event data)
PREDICTHQ_API_KEY=your_predicthq_api_key_here

# Ticketmaster Configuration (for event data)
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

# Perplexity Configuration (for online event research)
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Cron Job Security (for automated scraping and backfill)
CRON_SECRET=your_secure_random_string_here

# Google Analytics / Tag Manager Configuration
NEXT_PUBLIC_GTM_ID=your_gtm_id_here  # Format: GTM-XXXXXXX
# OR
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_measurement_id_here  # Format: G-XXXXXXXXXX

# Optional: API Authentication
API_KEY=your_optional_api_key_here

# Optional: CORS Configuration
ALLOWED_ORIGIN=https://yourdomain.com
```

## 📜 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:apis` - Test API health checks

### Data Management
- `npm run scrape` - Test web scraper
- `npm run scrape:test` - Test scraper via API
- `npm run scrape:run` - Run full scraping process
- `npm run crawl:source` - Crawl specific source
- `npm run backfill-attendees` - Backfill attendee data
- `npm run seed-venues` - Seed venue database
- `npm run check-db` - Check database structure
- `npm run setup-cron` - Setup cron automation

### Security
- `npm run verify-security` - Verify security configuration
- `npm run security-check` - Run security checks

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Deploy**: Vercel will automatically deploy on every push to main branch

### Environment Setup

1. **Production Environment Variables**: Set all required variables in Vercel
2. **Database**: Ensure Supabase production database is configured
3. **API Keys**: Verify all external API keys are valid and have sufficient credits
4. **Cron Jobs**: Configure cron jobs in `vercel.json` for automated tasks

### Cron Jobs

Automated tasks configured in `vercel.json`:
- **Daily Scraping**: Runs at 6:00 AM UTC (`/api/scraper/sync`)
- **Weekly Attendee Backfill**: Runs Sundays at 7:00 AM UTC (`/api/events/backfill-attendees`)

## 📊 Current Status

- ✅ **Event Coverage**: 1000+ events from multiple sources
- ✅ **Response Time**: 3-10 seconds (10x improvement)
- ✅ **Data Sources**: 400+ Czech event sources + external APIs
- ✅ **Performance**: 5-10x faster with batch processing
- ✅ **Cost**: 10x reduction through optimization

## 🎉 Recent Achievements

- **AI-First Normalization**: Multi-strategy event data processing
- **Performance Optimization**: Batch processing with 10x cost reduction
- **Enhanced Coverage**: Comprehensive Czech event data collection
- **Seasonality System**: Expert seasonal rules and holiday impact detection
- **Temporal Proximity**: Enhanced audience overlap with date proximity analysis
- **Monitoring**: Real-time observability and automated alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation for API changes
- Follow existing code style and patterns
- Ensure all tests pass before submitting PR

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@oslavu.com or create an issue in the repository.

## 🔗 Links

- **Documentation**: [docs/README.md](docs/README.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Reference**: [docs/API.md](docs/API.md)
- **Components**: [docs/COMPONENTS.md](docs/COMPONENTS.md)

---

**Built with ❤️ by the Oslavu team in Brno, Czech Republic.**
