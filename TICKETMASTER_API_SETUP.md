# Ticketmaster API Setup Guide

## Problem Identified

The Oslavu app is not fetching events from Ticketmaster because the API key is not properly configured. The Ticketmaster API returns `"Invalid ApiKey"` error when the key is missing or invalid.

## Root Cause

1. **Missing API Key**: The `TICKETMASTER_API_KEY` environment variable is not set
2. **No `.env.local` file**: Environment variables are not configured
3. **Misleading validation**: The app incorrectly reports API key as available when it's actually empty

## Solution Steps

### 1. Get a Ticketmaster API Key

1. Visit [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Create a developer account or sign in
3. Create a new app/project
4. Copy your Consumer Key (this is your API key)

### 2. Create Environment File

Create a `.env.local` file in the project root with your API keys:

```bash
# Ticketmaster API Key
TICKETMASTER_API_KEY=your_actual_ticketmaster_api_key_here

# PredictHQ API Key (already working)
PREDICTHQ_API_KEY=your_predicthq_api_key

# OpenAI API Key (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Other environment variables...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Restart the Development Server

After adding the API key:

```bash
npm run dev
```

### 4. Verify the Fix

The app will now show better error messages if the API key is still invalid:

- ✅ **Working**: Events will be fetched from both PredictHQ and Ticketmaster
- ❌ **Still broken**: Check the console for detailed error messages about the API key

## API Key Validation

The improved validation now checks:
- ✅ Key exists and is not empty
- ✅ Key has reasonable length (>10 characters)
- ✅ Key is not a placeholder (doesn't contain 'your_' or 'here')

## Testing

Once configured, test the integration:

1. Run the conflict analysis for Prague in December 2025
2. Check the terminal logs - you should see:
   - `🎟️ Ticketmaster: Retrieved X events` (where X > 0)
   - No "Invalid ApiKey" errors

## Expected Results

With a valid API key, Ticketmaster should return events for Prague, especially for:
- Entertainment/Arts & Theatre events
- Music events  
- Sports events
- Other cultural events

The app should now fetch events from both:
- **PredictHQ**: Local Czech events (working)
- **Ticketmaster**: International and major venue events (now fixed)

## Troubleshooting

If still getting 0 events after setup:

1. **Check API key validity**: Look for console messages about key validation
2. **Check API limits**: Ticketmaster has daily rate limits
3. **Check date ranges**: Ensure you're searching for future dates
4. **Check classifications**: Try broader searches without category filters

## Improvements Made

1. **Better API key validation** in `ticketmaster.ts`
2. **Detailed error messages** in the API route
3. **Clear setup instructions** (this document)
4. **Debug information** in API responses
