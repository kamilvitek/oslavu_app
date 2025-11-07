# Oslavu Documentation

Welcome to the comprehensive documentation for Oslavu - AI-Powered Event Date Optimization.

## 📚 Documentation Structure

- **[Getting Started](development/setup.md)** - Development setup and quick start guide
- **[Architecture](architecture/overview.md)** - System architecture and technical design
- **[Features](features/)** - Detailed feature documentation
  - [Conflict Analysis](features/conflict-analysis.md) - Core conflict detection engine
  - [Web Scraping](features/web-scraping.md) - Data collection infrastructure
  - [AI Normalization](features/ai-normalization.md) - AI-powered data processing
  - [Performance](features/performance.md) - Optimization and monitoring
  - [Seasonality](features/seasonality.md) - Seasonal patterns and holiday impact detection

## 🎯 Project Overview

Oslavu is a sophisticated SaaS platform that helps event managers pick the perfect date for their conferences and events by automatically detecting conflicts with other major events in the same city or niche. Instead of manually googling and cross-checking spreadsheets, organisers instantly see a conflict-score for every possible date, powered by AI-driven analysis.

### The Problem
- Conferences lose attendees and sponsors when dates overlap with competing events or big local festivals
- Organisers still rely on manual Google searches or spreadsheets, which is time-consuming and error-prone
- A single poorly chosen date can lead to no-shows, wasted ad budgets, and negative ROI

### The Solution
Oslavu provides a comprehensive conflict analysis platform with:

1. **Multi-Source Data Ingestion**
   - External APIs: Ticketmaster Discovery, PredictHQ, Meetup
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

### Unique Value Proposition
- "Pick the perfect date—data-backed, competitor-free"
- First automated conflict-score engine with AI-powered analysis
- Comprehensive coverage of Czech and European events
- Real-time analysis with detailed risk assessments

## Technology Stack

### Backend Infrastructure
- **Database**: Supabase (PostgreSQL) with vector extensions for semantic search
- **API Layer**: Next.js API routes with Vercel serverless functions
- **Authentication**: Supabase Auth with Row-Level Security
- **Data Processing**: Custom services for conflict analysis and event processing
- **AI Integration**: OpenAI GPT-4 for content extraction and audience analysis
- **Web Scraping**: Firecrawl for intelligent web content extraction
- **Caching**: Request deduplication and intelligent caching
- **Monitoring**: Comprehensive logging and error tracking

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **Components**: shadcn/ui component library
- **State Management**: @tanstack/react-query for server state
- **Forms**: react-hook-form with zod validation
- **Animations**: Custom CSS animations and transitions
- **Responsive Design**: Mobile-first approach with modern UX patterns

### External Integrations
- **Ticketmaster Discovery API**: Global event data
- **PredictHQ API**: Event intelligence and forecasting
- **OpenAI API**: GPT-4 for content extraction and analysis
- **Firecrawl API**: Web scraping and content extraction
- **Supabase**: Database, authentication, and real-time features

### Development Tools
- **AI-Powered Development**: Cursor with Claude integration
- **Version Control**: Git with comprehensive branching strategy
- **Testing**: Jest with comprehensive test coverage
- **Code Quality**: ESLint, TypeScript strict mode
- **Documentation**: Living documentation with code examples

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── analyze/       # Conflict analysis endpoints
│   │   ├── events/        # Event management endpoints
│   │   ├── scraper/       # Web scraping endpoints
│   │   ├── holidays/      # Holiday data endpoints
│   │   └── observability/ # Monitoring and metrics
│   ├── dashboard/         # Dashboard pages
│   ├── test-scraper/      # Scraper testing interface
│   ├── globals.css        # Global styles and design system
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components (header, footer)
│   ├── providers/        # Context providers
│   ├── sections/         # Page sections (hero, features, etc.)
│   └── ui/               # Reusable UI components
├── lib/                   # Core business logic
│   ├── services/         # Business logic services
│   │   ├── conflict-analysis.ts    # Core conflict analysis engine
│   │   ├── event-scraper.ts        # Web scraping service
│   │   ├── event-storage.ts        # Database operations
│   │   ├── ai-audience-overlap.ts  # AI-powered analysis
│   │   ├── batch-audience-overlap.ts # Batch processing service
│   │   └── observability.ts        # Monitoring service
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── supabase.ts       # Database client configuration
├── scripts/              # Utility and migration scripts
└── types/                # Global type definitions
```

## Database Schema Design

### Core Tables

#### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  city VARCHAR(100) NOT NULL,
  venue VARCHAR(200),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  expected_attendees INTEGER,
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(200),
  url TEXT,
  image_url TEXT,
  embedding VECTOR(1536), -- For semantic similarity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Conflict Analyses Table
```sql
CREATE TABLE conflict_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  city VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  preferred_dates JSONB NOT NULL,
  expected_attendees INTEGER NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Web Scraping Infrastructure
```sql
CREATE TABLE scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### Advanced Features
- **Vector Search**: Semantic similarity using pgvector
- **Row-Level Security**: User data isolation
- **Real-time Updates**: Supabase real-time subscriptions
- **Audit Logging**: Comprehensive change tracking
- **AI-Powered Normalization**: Intelligent event data processing
- **Batch Processing**: Optimized audience overlap analysis
- **Performance Monitoring**: Comprehensive observability and metrics
- **Cron Automation**: Automated data synchronization

## User Flow

### 1. Event Analysis Workflow
1. **Input Collection**: User enters event details (city, category, dates, attendees)
2. **Data Gathering**: System fetches events from multiple sources
3. **AI Processing**: Content extraction and semantic analysis
4. **Conflict Analysis**: Advanced scoring algorithm with risk assessment
5. **Results Presentation**: Interactive dashboard with recommendations

### 2. Web Scraping Workflow
1. **Source Configuration**: Automated scraping of Czech event websites
2. **Content Extraction**: AI-powered event data extraction
3. **Deduplication**: Semantic similarity detection
4. **Storage**: Intelligent upsert with conflict resolution
5. **Integration**: Seamless integration with analysis engine

### 3. API Integration Workflow
1. **Multi-Source Fetching**: Parallel API calls to external services
2. **Data Normalization**: Consistent event data structure
3. **Geographic Filtering**: Location-based event filtering
4. **Category Mapping**: Intelligent category classification
5. **Performance Optimization**: Caching and request deduplication

## Recent Improvements & Features

### AI-First Event Normalization (Latest)
- **Multi-Strategy Normalization**: Dictionary → Geocoding → LLM fallback chain
- **PredictHQ Radius Fix**: Proper `within` parameter for geographic searches
- **Synonym Matching**: AI-powered category normalization across data sources
- **Confidence Scoring**: Quality metrics for normalization accuracy
- **Performance**: 5-10x faster processing with batch operations

### Performance Optimizations
- **Batch Processing Service**: Parallel processing of 5 events simultaneously
- **Optimized OpenAI Integration**: Single API call for multiple event analysis
- **Smart Caching**: Intelligent cache management for repeated queries
- **Cost Reduction**: 10x cheaper API usage through batching
- **Response Time**: Sub-10 second analysis for complex scenarios

### Enhanced Data Sources
- **Czech Event Coverage**: Comprehensive scraping of 400+ Czech event sources
- **MUNI Calendar Integration**: University event data integration
- **Hradec Králové Expansion**: Additional regional event coverage
- **Venue Database**: Enhanced venue capacity and competition analysis
- **Holiday Integration**: Cultural event and holiday conflict detection

### Monitoring & Observability
- **Source Health Metrics**: Real-time monitoring of data source performance
- **Normalization Quality**: Confidence score tracking and method breakdown
- **Seasonal Baselines**: Expected vs actual event count monitoring
- **Automated Alerts**: Proactive issue detection and notification

## API Documentation

### Core Endpoints

#### POST /api/analyze
Performs comprehensive conflict analysis for event dates.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "expectedAttendees": 500,
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  },
  "preferredDates": ["2024-03-15", "2024-03-16"],
  "enableAdvancedAnalysis": true
}
```

**Response:**
```json
{
  "data": {
    "recommendedDates": [
      {
        "startDate": "2024-03-15",
        "endDate": "2024-03-16",
        "conflictScore": 2.5,
        "riskLevel": "Low",
        "competingEvents": [],
        "reasons": ["No major conflicts detected"]
      }
    ],
    "highRiskDates": [...],
    "allEvents": [...],
    "analysisDate": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/events
Retrieves events with advanced filtering and search capabilities.

**Query Parameters:**
- `city`: Filter by city
- `category`: Filter by category
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `source`: Filter by data source
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

#### GET /api/scraper
Web scraping management and monitoring.

**Actions:**
- `test`: Test scraper connectivity
- `scrape`: Run full scraping process
- `scrape-source`: Scrape specific source

## Styling Guidelines

### Design System
- **Color Palette**: Comprehensive chart colors for data visualization
- **Typography**: Inter font family with responsive sizing
- **Spacing**: Consistent spacing scale using Tailwind utilities
- **Components**: shadcn/ui component library with custom extensions
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: WCAG 2.1 AA compliance

### Key Features
- **Dark Mode**: Complete dark mode support
- **Responsive Design**: Mobile-first approach
- **Data Visualization**: Advanced chart components
- **Interactive Elements**: Hover effects and animations
- **Glass Effects**: Modern glassmorphism design elements
- **Gradient System**: Sophisticated gradient backgrounds

### Component Architecture
- **Atomic Design**: Component hierarchy from atoms to organisms
- **Composition**: Flexible component composition patterns
- **Theming**: CSS custom properties for consistent theming
- **Performance**: Optimized bundle size and loading
- **Type Safety**: Full TypeScript integration
