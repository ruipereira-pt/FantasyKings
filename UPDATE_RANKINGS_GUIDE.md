# ATP Rankings Update Guide

This guide explains how to scrape ATP rankings from the official website and update your database using SQL scripts.

## Overview

The process involves:

1. **Scraping** ATP rankings data from atptour.com
2. **Converting** scraped data into SQL INSERT statements
3. **Updating** the database using the SQL script

## Files

- `update-rankings-from-scraped-data.sql` - Main SQL script that updates player rankings
- `scripts/scrape-atp-rankings.ts` - TypeScript scraper for ATP website
- `scripts/generate-rankings-sql.ts` - Helper to convert JSON/CSV to SQL

## Quick Start

### Option 1: Using the Scraper Script (Recommended)

1. **Install dependencies:**

   ```bash
   npm install axios cheerio
   npm install --save-dev @types/node tsx
   ```

2. **Run the scraper:**

   ```bash
   npx tsx scripts/scrape-atp-rankings.ts --output rankings.sql --range 1-500
   ```

3. **Update the SQL script:**
   - Open `update-rankings-from-scraped-data.sql`
   - Replace the example INSERT statements with the content from `rankings.sql`

4. **Run the SQL script:**
   ```bash
   psql -h your-host -U your-user -d your-database -f update-rankings-from-scraped-data.sql
   ```
   Or use Supabase Dashboard SQL Editor.

### Option 2: Manual Data Import

If you already have rankings data in JSON or CSV format:

1. **Convert to SQL:**

   ```bash
   npx tsx scripts/generate-rankings-sql.ts rankings.json --format json --output rankings.sql
   ```

2. **Add to SQL script and run** (same as Option 1, step 3-4)

## SQL Script Details

### What It Does

The `update-rankings-from-scraped-data.sql` script:

1. **Creates a temporary table** (`temp_rankings`) to hold scraped data
2. **Updates existing players** by matching:
   - First by `sportradar_competitor_id` (most reliable)
   - Then by `name` (fallback)
3. **Inserts new players** that don't exist yet
4. **Sets ranking to 500+** for players not in the new rankings
5. **Recalculates prices** using the `calculate_player_price()` function
6. **Provides summary statistics** of the update

### Data Format

The script expects data with these fields:

```sql
- rank: integer (1-500+)
- name: text (player full name)
- country: text (country code, e.g., 'USA', 'ESP')
- points: integer (ATP ranking points)
- sportradar_competitor_id: text (optional)
- age: integer (optional)
```

### Example Data Insertion

```sql
INSERT INTO temp_rankings (rank, name, country, points, sportradar_competitor_id, age) VALUES
  (1, 'Novak Djokovic', 'SRB', 9795, 'sr:competitor:12345', 37),
  (2, 'Carlos Alcaraz', 'ESP', 8855, 'sr:competitor:67890', 21),
  (3, 'Daniil Medvedev', 'RUS', 7600, 'sr:competitor:11111', 28);
```

## Scraper Script Usage

### Basic Usage

```bash
npx tsx scripts/scrape-atp-rankings.ts
```

### Options

- `--output <file>` - Output SQL file (default: `rankings-scraped.sql`)
- `--range <start-end>` - Rank range to scrape (default: `1-500`)

### Examples

```bash
# Scrape top 100 players
npx tsx scripts/scrape-atp-rankings.ts --range 1-100 --output top100.sql

# Scrape all top 500
npx tsx scripts/scrape-atp-rankings.ts --range 1-500 --output rankings.sql
```

### Important Notes

⚠️ **Website Structure Changes**: The ATP website structure may change. If scraping fails, you may need to:

1. Inspect the HTML structure using browser DevTools
2. Update the CSS selectors in `scrape-atp-rankings.ts`
3. Common selectors: `.mega-table`, `.rankings-table`, `table.rankings`

⚠️ **Rate Limiting**: The scraper includes a 2-second delay between requests. If you get rate-limited:

- Increase the delay
- Use a proxy
- Scrape in smaller batches

⚠️ **Legal Considerations**:

- For personal/fantasy use, scraping is generally acceptable
- Don't overload the server with requests
- Respect robots.txt and terms of service

## Price Calculation

Player prices are automatically calculated using the `calculate_player_price()` function:

```sql
Price = 20 × (log(201) - log(rank + 1)) / log(201)
Minimum price: 2 coins
```

Examples:

- Rank 1: ~20 coins
- Rank 10: ~15 coins
- Rank 50: ~11 coins
- Rank 100: ~8 coins
- Rank 200: ~4 coins
- Rank 500+: ~2 coins

## Verification

After running the SQL script, check the results:

```sql
-- Top 10 players
SELECT ranking, name, country, points, price
FROM players
WHERE ranking IS NOT NULL
ORDER BY ranking
LIMIT 10;

-- Players by rank category
SELECT
  CASE
    WHEN ranking <= 100 THEN 'Top 100'
    WHEN ranking <= 200 THEN '101-200'
    WHEN ranking <= 500 THEN '201-500'
    ELSE '500+'
  END as rank_category,
  COUNT(*) as player_count,
  AVG(price)::integer as avg_price
FROM players
WHERE ranking IS NOT NULL
GROUP BY rank_category;
```

## Troubleshooting

### No players scraped

- Check if the ATP website structure has changed
- Inspect the HTML using browser DevTools
- Update CSS selectors in the scraper script

### Players not matching

- Ensure player names match exactly (case-insensitive)
- Use `sportradar_competitor_id` for more reliable matching
- Check for special characters or encoding issues

### Price not updating

- Verify `calculate_player_price()` function exists
- Check that ranking values are valid integers
- Ensure the function is called in the UPDATE statements

## Automation

You can automate this process:

1. **Schedule scraping** (cron job, GitHub Actions, etc.)
2. **Run SQL script** automatically after scraping
3. **Send notifications** on completion

Example cron job (runs weekly on Monday at 2 AM):

```bash
0 2 * * 1 cd /path/to/project && npx tsx scripts/scrape-atp-rankings.ts && psql -f update-rankings-from-scraped-data.sql
```

## Alternative: Using SportsRadar API

If you have access to SportsRadar API, you can use the existing `fetch-rankings` edge function instead of scraping. This is more reliable and includes `sportradar_competitor_id` for better matching.

## Support

For issues or questions:

1. Check the SQL script comments for detailed explanations
2. Review the scraper script for selector updates
3. Verify database schema matches expected structure
