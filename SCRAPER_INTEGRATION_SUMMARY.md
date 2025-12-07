# ATP Rankings Scraper Integration Summary

## What Was Done

The `fetch-rankings` Edge Function has been updated to use a Cheerio-based web scraper as a fallback option when the Sportradar API and ATP official API are unavailable.

## Changes Made

1. **Added Cheerio Import**
   - Added `import { load } from "npm:cheerio@1.0.0";` to the Edge Function

2. **Replaced Regex-Based Scraper**
   - Removed the fragile regex-based HTML parsing
   - Added robust Cheerio-based HTML parsing with multiple selector fallbacks

3. **Added New Functions**
   - `scrapeRankingsPage(startRank, endRank)`: Scrapes a single range of rankings (e.g., 1-100)
   - `scrapeAllRankings(maxRank)`: Scrapes multiple ranges in batches of 100
   - Updated `fetchATPRankingsFromWeb()`: Now uses the new scraper functions

## How It Works

The ranking update follows this fallback chain:

1. **Sportradar API** (most reliable) - First attempt
2. **ATP Official API** - Second attempt
3. **Web Scraper (Cheerio)** - Third attempt (NEW)
4. **Fallback Static Data** - Last resort

## Features

- ✅ Scrapes up to 500 players in ranges of 100
- ✅ Handles rate limiting (HTTP 429) gracefully
- ✅ 30-second timeout per request
- ✅ 2-second delay between requests (respectful scraping)
- ✅ Multiple CSS selector fallbacks for robustness
- ✅ Proper error handling and logging

## Usage

The scraper is automatically used when:

- Admin clicks "Refresh Rankings" in Player Management
- The Sportradar API and ATP Official API both fail
- The function falls back to web scraping

## Testing

To test the scraper:

1. Temporarily disable Sportradar API (comment out the call)
2. Temporarily disable ATP Official API (comment out the call)
3. Click "Refresh Rankings" in Admin > Player Management
4. Check logs to see scraper activity

## Files Modified

- `supabase/functions/fetch-rankings/index.ts` - Updated with Cheerio scraper
- `fetch-rankings-scraper-update.ts` - Reference implementation (can be deleted)

## Backups Created

- `supabase/functions/fetch-rankings/index.ts.backup-20251124-235030`
- `supabase/functions/fetch-rankings/index.ts.backup-before-scraper-update-*`

## Next Steps

1. Deploy the updated Edge Function to Supabase
2. Test the "Refresh Rankings" functionality in the admin panel
3. Monitor logs to ensure scraper works correctly
4. Optionally adjust `maxRank` parameter (currently 500) if needed
