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

# Optional Services
POSTHOG_API_KEY=your_posthog_key
RESEND_API_KEY=your_resend_api_key

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

4. Set up Supabase:
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase (if starting fresh)
supabase init

# Start local Supabase (optional for development)
supabase start

# Run database migrations
supabase db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Key Features

### 🎯 AI-Powered Conflict Analysis
- **Multi-Source Data**: Integrates Ticketmaster, PredictHQ, and web scraping
- **Semantic Deduplication**: Uses OpenAI embeddings for intelligent duplicate detection
- **Advanced Scoring**: 0-20 conflict score with risk level assessment
- **Real-time Analysis**: Sub-10 second response times with batch processing
- **AI Normalization**: Intelligent event data processing across sources

### 🔍 Web Scraping Infrastructure
- **Comprehensive Coverage**: 400+ Czech event sources including MUNI calendar
- **AI Content Extraction**: GPT-4 powered event data extraction
- **Intelligent Processing**: Semantic similarity and deduplication
- **Rate Limiting**: Respectful scraping with proper delays
- **Automated Sync**: Cron-based data synchronization

### 📊 Advanced Analytics
- **Audience Overlap**: AI-powered audience overlap prediction with batch processing
- **Geographic Filtering**: Smart location-based event filtering with radius search
- **Category Intelligence**: Automatic event categorization with synonym matching
- **Performance Monitoring**: Comprehensive observability and metrics
- **Venue Competition**: Enhanced venue capacity and competition analysis

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with modern components
- **Interactive Dashboard**: Real-time analysis with progress indicators
- **Data Visualization**: Advanced chart components and metrics
- **Dark Mode**: Complete dark mode support

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── analyze/       # Conflict analysis endpoints
│   │   ├── events/        # Event management endpoints
│   │   ├── scraper/       # Web scraping endpoints
│   │   ├── holidays/      # Holiday data endpoints
│   │   └── observability/ # Monitoring and metrics
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
│   │   ├── conflict-analysis.ts    # Core conflict analysis engine
│   │   ├── event-scraper.ts        # Web scraping service
│   │   ├── batch-audience-overlap.ts # Batch processing service
│   │   └── observability.ts        # Monitoring service
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper utilities
├── scripts/              # Utility and migration scripts
└── types/                # TypeScript type definitions
```

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

## API Documentation

### POST /api/analyze

Analyzes potential conflicts for event dates.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "subcategory": "AI/ML",
  "expectedAttendees": 500,
  "preferredDates": ["2024-03-15", "2024-03-16"],
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "city": "Prague",
    "category": "Technology",
    "results": [
      {
        "date": "2024-03-15",
        "score": 15,
        "risk": "low",
        "conflictingEvents": [],
        "recommendation": "Excellent choice! No major conflicts detected."
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## Business Model

- **Free Tier**: 3 analyses per year
- **Pro Tier**: €79/month (25 analyses)
- **Agency Tier**: €299/month (unlimited analyses)
- **API Access**: White-label integration for EMS platforms

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Roadmap

- [x] Implement external API integrations (Ticketmaster, PredictHQ, etc.)
- [x] Build comprehensive web scraping infrastructure
- [x] Add AI-powered event normalization and deduplication
- [x] Implement performance optimizations and batch processing
- [x] Add observability and monitoring capabilities
- [x] Expand Czech event coverage (400+ sources)
- [ ] Add user authentication and subscription management
- [ ] Build analytics dashboard for event performance tracking
- [ ] Implement real-time conflict monitoring
- [ ] Add email notifications for new conflicts
- [ ] Create mobile app version
- [ ] Expand to more cities and regions

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@oslavu.com or create an issue in the repository.

## Team

Built with ❤️ by the Oslavu team in Brno, Czech Republic.