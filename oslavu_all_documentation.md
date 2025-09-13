# Oslavu

## Project Description
Oslavu is a SaaS tool that helps event managers pick the perfect date for their conferences and events by automatically detecting conflicts with other major events in the same city or niche. Instead of manually googling and cross-checking spreadsheets, organisers instantly see a conflict-score for every possible date.

The outcome:
- Higher attendance
- Lower marketing waste
- Stronger sponsor confidence
- Stress-free planning

Problems
- Conferences lose attendees and sponsors when dates overlap with competing events or big local festivals.
- Organisers still rely on manual Google searches or spreadsheets, which is time-consuming and error-prone.
- A single poorly chosen date can lead to no-shows, wasted ad budgets, and negative ROI.

Solution (MVP Scope):
1)Multi-feed ingest
- APIs: Ticketmaster Discovery, Meetup, PredictHQ, city open-data calendars, Luma

2)Deduplication & clustering:
- Detect duplicates across feeds.
- Cluster by theme/topic to ensure only overlapping audiences are flagged.

3)Conflict-score engine:
- For any given city + theme, Oslavu calculates a score for each future date.
- Score = risk factor of overlap with competitor events.

4)Frontend:
- Event manager enters city, theme, preferred date range, number of attendes etc.
- Oslavu returns a ranked list of “safe” vs. “risky” dates.

Target Group
Primary:
- Startup & tech conference organisers (e.g. JIC Brno’s 30+ events/year).
Secondary:
- Agencies using Eventee for client events.
- Corporate summit planners.
- Professional associations.

Unique Value Proposition
- “Pick the perfect date—data-backed, competitor-free.”
- Oslavu is the first automated conflict-score engine that saves organisers from manual guesswork.

Tech Stack
Backend:
- Supabase – Postgres DB + Auth + Row-Level Security.
- Supabase SQL – direct queries (no ORM at MVP stage).
- Vercel Serverless Functions – API routes for conflict-score calculations.
- Vercel Cron / Supabase Cron – scheduled jobs for refreshing event data.
- PostHog – product analytics.
- Resend – transactional emails (auth links, notifications).
- Upstash Redis (optional) – rate limiting & job queues for heavy API calls.

Frontend:
- Next.js (React, App Router) – UI framework, deployed on Vercel.
- TypeScript – type safety.
- Tailwind CSS + shadcn/ui – styling and UI components.
- @tanstack/react-query – caching, server-state management, optimistic updates.
- react-hook-form + zod – forms + validation.
- date-fns – date utilities.
- Sentry (or Vercel Observability) – error tracking.

Developer Tools
- Cursor – AI-powered coding editor, speeds up implementation.
- Claude Code – assists with deeper code reasoning and refactoring.
- VibeCodeDocs – for living documentation, shared with team and contributors.

Distribution Channels
- API integrations – plug Oslavu into existing EMS platforms (Eventee, Bizzabo, Cvent).
- Warm intros via JIC Brno & regional startup ecosystems.
- Content SEO – “how to pick the perfect event date”.
- Marketplace listings – on platforms where organisers already shop for tools.

Business Model
SaaS tiers:
Free: 3 analyses/year.
Pro: €79/mo (25 analyses).
Agency: €299/mo (unlimited).
One-off credits – single analyses for small organisers.
White-label API – embed conflict-score into other EMS products.

Key Metrics
- % of organisers adopting recommended “conflict-free” dates.
- Average attendance uplift vs. previous year.
- Number of analyses run per org per month.
- Monthly recurring revenue (MRR) + churn.

Unfair Advantage
- Exclusive launch partner: Eventee.
- Local data moat: early Czech/CEE coverage via JIC Brno pilots.
- Continuous ML refinement: conflict-score improves over time using real attendance data.

Outcome
By using Oslavu, event organisers will:
- Avoid competing dates.
- Increase turnout by at least 15% (validated in pilot cases).
- Build trust with sponsors.
- Free up planning time for content and partnerships instead of endless Google searches.

Vision: Oslavu becomes the standard API for event-date optimisation—powering both niche meetups and global conferences.

## Product Requirements Document
Not available

## Technology Stack
Not available

## Project Structure
Not available

## Database Schema Design
Not available

## User Flow
Not available

## Styling Guidelines
Not available
