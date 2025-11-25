/**
 * Generate SQL INSERT statements from scraped ATP rankings data
 * 
 * This script converts scraped ATP rankings data (JSON/CSV) into SQL INSERT statements
 * that can be used with update-rankings-from-scraped-data.sql
 * 
 * Usage:
 *   npm run generate-rankings-sql <input-file> [--format json|csv] [--output output.sql]
 */

import * as fs from 'fs';
import * as path from 'path';

interface RankingData {
  rank: number;
  name: string;
  country?: string;
  points?: number;
  sportradar_competitor_id?: string;
  age?: number;
}

function parseJSONData(filePath: string): RankingData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of ranking objects');
  }
  
  return data.map((item: any) => ({
    rank: parseInt(item.rank || item.ranking || item.position, 10),
    name: item.name || item.player || item.playerName,
    country: item.country || item.countryCode || item.nation,
    points: item.points ? parseInt(item.points.toString().replace(/,/g, ''), 10) : 0,
    sportradar_competitor_id: item.sportradar_competitor_id || item.competitor_id || item.sr_id,
    age: item.age ? parseInt(item.age, 10) : undefined,
  }));
}

function parseCSVData(filePath: string): RankingData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const data: RankingData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push({
      rank: parseInt(row.rank || row.ranking || row.position || '0', 10),
      name: row.name || row.player || row.playername || '',
      country: row.country || row.countrycode || row.nation,
      points: row.points ? parseInt(row.points.toString().replace(/,/g, ''), 10) : 0,
      sportradar_competitor_id: row.sportradar_competitor_id || row.competitor_id || row.sr_id,
      age: row.age ? parseInt(row.age, 10) : undefined,
    });
  }
  
  return data.filter(item => item.rank > 0 && item.name);
}

function generateSQLInserts(data: RankingData[]): string {
  const inserts = data.map(item => {
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
-- Total players: ${data.length}

INSERT INTO temp_rankings (rank, name, country, points, sportradar_competitor_id, age) VALUES
${inserts.join(',\n')};
`;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: ts-node generate-rankings-sql.ts <input-file> [--format json|csv] [--output output.sql]');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const format = args.includes('--format') 
    ? args[args.indexOf('--format') + 1] 
    : path.extname(inputFile).slice(1).toLowerCase() || 'json';
  
  const outputFile = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : 'rankings-insert.sql';
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  try {
    let data: RankingData[];
    
    if (format === 'csv') {
      data = parseCSVData(inputFile);
    } else {
      data = parseJSONData(inputFile);
    }
    
    console.log(`Parsed ${data.length} players from ${inputFile}`);
    
    const sql = generateSQLInserts(data);
    fs.writeFileSync(outputFile, sql, 'utf-8');
    
    console.log(`✅ Generated SQL file: ${outputFile}`);
    console.log(`   Top 5 players:`);
    data.slice(0, 5).forEach(p => {
      console.log(`   ${p.rank}. ${p.name} (${p.country || 'N/A'}) - ${p.points || 0} pts`);
    });
    
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { parseJSONData, parseCSVData, generateSQLInserts };

