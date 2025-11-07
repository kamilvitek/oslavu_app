# Development Setup Guide

This guide will help you set up the Oslavu development environment.

## Prerequisites

- **Node.js**: Version 18+ (recommended: 20+)
- **npm**: Version 9+ (comes with Node.js)
- **Git**: For version control
- **Supabase CLI**: For database management

## Quick Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd oslavu_app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp env-template.txt .env.local

# Edit .env.local with your API keys
nano .env.local
```

**Required Environment Variables:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# External API Keys
TICKETMASTER_API_KEY=your_ticketmaster_api_key
PREDICTHQ_API_KEY=your_predicthq_api_key

# AI Services
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Cron authentication
CRON_SECRET=generate-random-secret-here
```

### 4. Database Setup

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Initialize Supabase (if starting fresh)
supabase init

# Start local Supabase (optional for development)
supabase start

# Run database migrations
supabase db push
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development Workflow

### Adding New Features

1. **API Integration**: Add new external API integrations in `src/lib/services/`
2. **UI Components**: Create reusable components in `src/components/ui/`
3. **Forms**: Add new forms in `src/components/forms/`
4. **API Routes**: Create backend endpoints in `src/app/api/`

### Database Changes

1. Create new migration file in `supabase/migrations/`
2. Run `supabase db push` to apply changes
3. Update TypeScript types in `src/types/`

### Testing

```bash
# Run type checking
npm run build

# Run linting
npm run lint
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── test-scraper/      # Scraper testing interface
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   ├── providers/        # Context providers
│   ├── sections/         # Page sections
│   └── ui/               # Reusable UI components
├── lib/                   # Core business logic
│   ├── services/         # Business logic services
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper utilities
├── scripts/              # Utility and migration scripts
└── types/                # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run scrape` - Test web scraper
- `npm run scrape:test` - Test scraper via API
- `npm run scrape:run` - Run full scraping process

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Check environment variables are set correctly
   - Verify API keys are valid and have sufficient credits

2. **Database Errors**
   - Ensure Supabase migration has been run
   - Check database connection and permissions

3. **Rate Limiting**
   - Scraper respects rate limits automatically
   - Adjust `dailyRequestLimit` if needed

4. **No Events Found**
   - Check if sources are enabled in `scraper_sources` table
   - Verify website URLs are accessible
   - Check GPT-4 extraction is working

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

This will show detailed console output for debugging.

## Performance Tips

1. **Batch Processing**: Events are processed in batches of 100
2. **Embedding Caching**: Similar events reuse embeddings
3. **Rate Limiting**: Prevents API quota exhaustion
4. **Error Handling**: Individual event failures don't stop the process

## Security

- API keys stored in environment variables
- Rate limiting prevents abuse
- Input sanitization for all scraped data
- Database queries use parameterized statements

## Next Steps

1. **Explore the Codebase**: Start with `src/lib/services/` for core functionality
2. **Read Documentation**: Check `docs/` folder for detailed guides
3. **Review Features**: See `docs/features/` for detailed feature documentation
4. **Check Architecture**: Review `docs/architecture/` for system design
