# PredictHQ API Integration Setup

This document explains how to set up and use the PredictHQ API integration in the Oslavu app.

## Setup Instructions

### 1. Get PredictHQ API Key

1. Visit [PredictHQ](https://predicthq.com/) and create an account
2. Navigate to the API Tokens section under API tools
3. Create a new token by entering a name and clicking "Create Token"
4. Copy the generated token (it won't be shown again)

### 2. Configure Environment Variable

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following line:
   ```
   PREDICTHQ_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual PredictHQ API key
4. Restart your development server

### 3. Test the Integration

1. Navigate to `/test-predicthq` in your app
2. Use the test interface to verify the API is working
3. Try different search parameters to see PredictHQ events

## API Features

The PredictHQ integration provides:

- **Event Search**: Search for events by city, date range, and category
- **High Attendance Events**: Find events with predicted high attendance
- **High Rank Events**: Find events with high local impact rankings
- **Category Filtering**: Filter by PredictHQ's event categories
- **Conflict Analysis**: Automatically included in conflict analysis workflow

## PredictHQ Event Categories

PredictHQ uses these main categories:
- `conferences` - Business and professional conferences
- `concerts` - Music concerts and performances
- `sports` - Sporting events
- `festivals` - Cultural and music festivals
- `community` - Community events
- `expos` - Trade shows and exhibitions
- `performing-arts` - Theater and performing arts
- `nightlife` - Nightlife events
- `politics` - Political events
- `school-holidays` - School holiday periods
- `observances` - Cultural and religious observances
- `public-holidays` - Public holidays
- `academic` - Academic events
- And many more...

## Integration with Conflict Analysis

PredictHQ events are automatically included in the conflict analysis workflow alongside:
- Ticketmaster events
- Eventbrite events
- Brno city events

The system will:
1. Fetch events from all sources in parallel
2. Remove duplicates based on title, date, and venue
3. Calculate conflict scores considering PredictHQ's attendance predictions
4. Provide recommendations for optimal event dates

## API Endpoints

- `GET /api/analyze/events/predicthq` - Fetch PredictHQ events
- Parameters:
  - `city` - City name (required for city-based search)
  - `keyword` - Search keyword (alternative to city)
  - `startDate` - Start date (YYYY-MM-DD)
  - `endDate` - End date (YYYY-MM-DD)
  - `category` - Event category
  - `minAttendance` - Minimum predicted attendance
  - `minRank` - Minimum local rank
  - `limit` - Maximum number of results (default: 200)

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify the API key is correct in `.env.local`
   - Restart the development server after adding the key
   - Check that the key has the necessary permissions

2. **No Events Returned**
   - Try different cities or date ranges
   - Check if the city name is spelled correctly
   - Verify the date format (YYYY-MM-DD)

3. **Rate Limiting**
   - PredictHQ has rate limits on their API
   - The integration includes error handling for rate limits
   - Consider implementing caching for production use

### Error Messages

- `PREDICTHQ_API_KEY environment variable is required` - API key not configured
- `PredictHQ API key is not configured` - API key missing in environment
- `PredictHQ API error: 401` - Invalid API key
- `PredictHQ API error: 429` - Rate limit exceeded

## Support

For PredictHQ API issues:
- Check the [PredictHQ API Documentation](https://docs.predicthq.com/)
- Contact PredictHQ support for API-specific issues

For Oslavu integration issues:
- Check the test page at `/test-predicthq`
- Review the browser console for error messages
- Verify all environment variables are set correctly
