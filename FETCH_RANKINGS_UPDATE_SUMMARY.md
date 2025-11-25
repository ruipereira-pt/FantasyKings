# Fetch Rankings Edge Function Update Summary

## Changes Made

### 1. ✅ Removed Sportradar Integration

- Removed `fetchSportradarRankings()` function
- Removed Sportradar API calls
- Removed `sportradar_competitor_id` dependency
- Updated comments and documentation

### 2. ✅ Fixed Duplicate Player Insertion

- Added `normalizePlayerName()` function to handle name variations:
  - "C. Alcaraz" → "Carlos Alcaraz"
  - "N. Djokovic" → "Novak Djokovic"
  - "J. Sinner" → "Jannik Sinner"
  - And more common mappings
- Added `createSearchKey()` function for fuzzy matching:
  - Normalizes names (removes accents, special chars)
  - Creates searchable keys for duplicate detection
- Improved player matching logic:
  - First tries exact name match
  - Falls back to fuzzy matching using search keys
  - Checks last name similarity to avoid false matches

### 3. ✅ Fixed Country Insertion

- Enhanced country extraction in scraper:
  - Multiple methods to find country code
  - Checks data attributes, flag images, class names
  - Validates country code is 3 uppercase characters
- Improved ATP API country handling:
  - Ensures country code is uppercase
  - Validates length (must be 3 characters)
  - Defaults to 'UNK' if invalid

### 4. ✅ Simplified Data Source Logic

- **ATP Official API first**: Tries API endpoint first
- **Web Scraper fallback**: Only uses scraper if API fails or returns no data
- Removed Sportradar as a data source
- Clear logging of which source was used

## Key Functions

### `normalizePlayerName(name: string)`

Normalizes player names to prevent duplicates:

- Maps common abbreviations to full names
- Handles single-letter initials (e.g., "C. Alcaraz")
- Returns normalized name

### `createSearchKey(name: string)`

Creates a searchable key for fuzzy matching:

- Converts to lowercase
- Removes accents
- Removes special characters
- Normalizes whitespace

### `fetchATPRankings()`

Main function that:

1. Tries ATP Official API first
2. Falls back to web scraper only if API fails
3. Returns normalized player data

## Player Matching Logic

1. **Normalize incoming player name**
2. **Try exact match** with normalized name
3. **Try fuzzy match** using search keys:
   - Compares search keys
   - Checks last name similarity
   - Avoids false positives
4. **Update existing** or **insert new** player

## Testing Recommendations

1. Test with "Refresh Rankings" button in Admin > Player Management
2. Check logs to see which source was used (API vs scraper)
3. Verify no duplicate players (e.g., "C. Alcaraz" and "Carlos Alcaraz")
4. Verify country codes are properly stored (3 uppercase letters)
5. Check that existing players are updated, not duplicated

## Files Modified

- `supabase/functions/fetch-rankings/index.ts` - Complete rewrite
- Backup created: `supabase/functions/fetch-rankings/index.ts.backup-before-remove-sportradar`

## Next Steps

1. Deploy the updated Edge Function
2. Test the "Refresh Rankings" functionality
3. Monitor for duplicate players
4. Expand `nameMappings` in `normalizePlayerName()` as needed
