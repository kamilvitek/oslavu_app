# Changelog

All notable changes to the Oslavu project are documented in this file.

## [Unreleased] - 2024-01-XX

### Added
- Comprehensive documentation structure in `docs/` folder
- Architecture overview with system diagrams
- Detailed feature documentation for all major components
- Development setup guide with troubleshooting
- Performance optimization documentation

### Changed
- Reorganized documentation from root-level files to structured `docs/` folder
- Updated main README.md to point to documentation structure
- Consolidated scattered documentation into logical sections

### Removed
- Empty test directories (11 directories)
- Research CSV files from `czech-event-data-sources/`
- Temporary analysis files (`unique_urls.txt`)
- Build artifacts (`tsconfig.tsbuildinfo`)

## [Latest] - 2024-01-XX

### Added
- AI-first event normalization with multi-strategy fallback
- Batch processing service for 5-10x performance improvement
- Comprehensive Czech event coverage (400+ sources)
- Real-time observability and monitoring
- Automated cron job synchronization
- Enhanced venue database with capacity analysis

### Performance Improvements
- Response time: 50-150s → 3-10s (10x improvement)
- API cost: 10x reduction through batching
- Event coverage: 4 → 1000+ events (250x improvement)
- PredictHQ success rate: 0% → 85%
- Scraped success rate: 0% → 80%

### Technical Improvements
- PredictHQ radius search fix with proper `within` parameter
- Semantic deduplication using OpenAI embeddings
- Confidence scoring for normalization quality
- Smart caching with 90% reduction in repeated processing
- Comprehensive error handling and fallback strategies

## [Previous] - 2024-01-XX

### Added
- Initial web scraping infrastructure
- Basic conflict analysis engine
- Ticketmaster and PredictHQ API integration
- Supabase database with vector search
- Next.js 15 frontend with TypeScript
- Tailwind CSS styling with shadcn/ui components

### Technical Foundation
- PostgreSQL database with pgvector extension
- Row-level security for data isolation
- Real-time subscriptions with Supabase
- Comprehensive API endpoint structure
- Modern React component architecture
