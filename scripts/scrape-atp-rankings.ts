/**
 * Scrape ATP Singles Rankings from atptour.com
 * 
 * This script scrapes the ATP rankings page and generates SQL INSERT statements
 * that can be used with update-rankings-from-scraped-data.sql
 * 
 * Usage:
 *   npm install axios cheerio
 *   npx tsx scripts/scrape-atp-rankings.ts [--output rankings.sql] [--range 1-500]
 * 
 * Note: This is for educational/personal use. Respect ATP's terms of service.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

interface RankingData {
  rank: number;
  name: string;
  country?: string;
  points: number;
  sportradar_competitor_id?: string;
  age?: number;
}

const ATP_RANKINGS_URL = 'https://www.atptour.com/en/rankings/singles';

/**
 * Scrape a single page of rankings
 */
async function scrapeRankingsPage(startRank: number = 1, endRank: number = 100): Promise<RankingData[]> {
  const url = `${ATP_RANKINGS_URL}?rankRange=${startRank}-${endRank}`;
  
  console.log(`Scraping rankings ${startRank}-${endRank}...`);
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(html);
    const rankings: RankingData[] = [];

    // ATP website structure may vary - adjust selectors as needed
    // Common selectors: .mega-table, .rankings-table, table.rankings
    const rows = $('.mega-table tbody tr, .rankings-table tbody tr, table.rankings tbody tr').toArray();

    if (rows.length === 0) {
      console.warn(`No rows found. Page structure may have changed.`);
      console.warn(`HTML snippet: ${html.substring(0, 500)}`);
      return [];
    }

    for (const row of rows) {
      try {
        const cells = $(row).find('td').toArray();
        
        if (cells.length < 4) continue;

        // Extract rank (usually first column)
        const rankText = $(cells[0]).text().trim();
        const rank = parseInt(rankText.replace(/[^\d]/g, ''), 10);
        if (!rank || rank < 1) continue;

        // Extract player name (usually second or third column with link)
        const nameLink = $(cells[1] || cells[2]).find('a').first();
        const name = nameLink.text().trim() || $(cells[1] || cells[2]).text().trim();
        if (!name) continue;

        // Extract country (flag or country code)
        const countryElement = $(cells[1] || cells[2]).find('.player-flag-code, .country-code, [data-country]').first();
        const country = countryElement.text().trim() || 
                       countryElement.attr('data-country') || 
                       countryElement.attr('title')?.substring(0, 3) ||
                       undefined;

        // Extract points (usually fourth or fifth column)
        const pointsText = $(cells[3] || cells[4]).text().trim().replace(/,/g, '');
        const points = parseInt(pointsText, 10) || 0;

        // Extract age if available
        const ageText = $(cells[2] || cells[3]).text().trim();
        const ageMatch = ageText.match(/\b(\d{2})\b/);
        const age = ageMatch ? parseInt(ageMatch[1], 10) : undefined;

        // Note: sportradar_competitor_id is typically not available on the public ATP site
        // You would need to match players by name or use a separate API

        rankings.push({
          rank,
          name,
          country,
          points,
          age,
        });
      } catch (error) {
        console.warn(`Error parsing row: ${error}`);
        continue;
      }
    }

    console.log(`  ✓ Found ${rankings.length} players`);
    return rankings;
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('Rate limited. Please wait before trying again.');
    } else {
      console.error(`Error scraping ${url}:`, error.message);
    }
    return [];
  }
}

/**
 * Scrape all rankings in ranges
 */
async function scrapeAllRankings(maxRank: number = 500): Promise<RankingData[]> {
  const allRankings: RankingData[] = [];
  const ranges: Array<[number, number]> = [];
  
  // Create ranges of 100
  for (let start = 1; start <= maxRank; start += 100) {
    const end = Math.min(start + 99, maxRank);
    ranges.push([start, end]);
  }

  for (const [start, end] of ranges) {
    const rankings = await scrapeRankingsPage(start, end);
    allRankings.push(...rankings);
    
    // Be respectful - add delay between requests
    if (ranges.indexOf([start, end]) < ranges.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  return allRankings.sort((a, b) => a.rank - b.rank);
}

/**
 * Generate SQL INSERT statements
 */
function generateSQL(rankings: RankingData[]): string {
  const inserts = rankings.map(item => {
    const values = [
      item.rank,
      `'${item.name.replace(/'/g, "''")}'`, // Escape single quotes
      item.country ? `'${item.country}'` : 'NULL',
      item.points || 0,
      item.sportradar_competitor_id ? `'${item.sportradar_competitor_id}'` : 'NULL',
      item.age ? item.age : 'NULL',
    ];
    
    return `  (${values.join(', ')})`;
  });
  
  return `-- Insert scraped ATP rankings data
-- Generated: ${new Date().toISOString()}
-- Total players: ${rankings.length}
-- Source: ${ATP_RANKINGS_URL}

INSERT INTO temp_rankings (rank, name, country, points, sportradar_competitor_id, age) VALUES
${inserts.join(',\n')};
`;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  const outputIndex = args.indexOf('--output');
  const outputFile = outputIndex >= 0 && args[outputIndex + 1] 
    ? args[outputIndex + 1] 
    : 'rankings-scraped.sql';
  
  const rangeIndex = args.indexOf('--range');
  const rangeStr = rangeIndex >= 0 && args[rangeIndex + 1] 
    ? args[rangeIndex + 1] 
    : '1-500';
  
  const [_startStr, endStr] = rangeStr.split('-');
  const maxRank = parseInt(endStr || '500', 10);

  console.log('ATP Rankings Scraper');
  console.log('====================');
  console.log(`Output file: ${outputFile}`);
  console.log(`Rank range: 1-${maxRank}`);
  console.log('');

  try {
    const rankings = await scrapeAllRankings(maxRank);
    
    if (rankings.length === 0) {
      console.error('No rankings scraped. The website structure may have changed.');
      console.error('Please check the selectors in the script and update if needed.');
      process.exit(1);
    }

    console.log(`\n✓ Successfully scraped ${rankings.length} players`);
    console.log(`\nTop 10 players:`);
    rankings.slice(0, 10).forEach(p => {
      console.log(`  ${p.rank}. ${p.name} (${p.country || 'N/A'}) - ${p.points} pts`);
    });

    const sql = generateSQL(rankings);
    fs.writeFileSync(outputFile, sql, 'utf-8');
    
    console.log(`\n✅ Generated SQL file: ${outputFile}`);
    console.log(`\nNext steps:`);
    console.log(`1. Review the generated SQL file`);
    console.log(`2. Add the INSERT statements to update-rankings-from-scraped-data.sql`);
    console.log(`3. Run the SQL script against your database`);
    
  } catch (error: any) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { scrapeRankingsPage, scrapeAllRankings, generateSQL };

