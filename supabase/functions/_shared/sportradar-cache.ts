/**
 * Sportradar API Response Cache Utility
 * 
 * Saves successful API responses to files for testing/debugging
 * Files are saved in: supabase/.temp/sportradar-cache/
 */

const CACHE_DIR = '.temp/sportradar-cache';

/**
 * Sanitize endpoint to create a valid filename
 */
function sanitizeFilename(endpoint: string): string {
  // Remove leading slash and replace slashes with underscores
  let filename = endpoint.replace(/^\//, '').replace(/\//g, '_');
  // Replace query params if any (remove them for filename)
  filename = filename.split('?')[0];
  // Replace special characters
  filename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  // Add .json extension
  return `${filename}.json`;
}

/**
 * Get cache file path for an endpoint
 */
function getCachePath(endpoint: string): string {
  const filename = sanitizeFilename(endpoint);
  return `${CACHE_DIR}/${filename}`;
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await Deno.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      console.error('Error creating cache directory:', error);
    }
  }
}

/**
 * Save API response to cache file
 */
export async function saveToCache(endpoint: string, data: any): Promise<void> {
  try {
    await ensureCacheDir();
    const cachePath = getCachePath(endpoint);
    const cacheData = {
      endpoint,
      timestamp: new Date().toISOString(),
      data,
    };
    
    await Deno.writeTextFile(cachePath, JSON.stringify(cacheData, null, 2));
    console.log(`✓ Cached response to: ${cachePath}`);
  } catch (error) {
    console.error(`Error saving cache for ${endpoint}:`, error);
    // Don't throw - caching is optional
  }
}

/**
 * Load API response from cache (if available)
 */
export async function loadFromCache(endpoint: string): Promise<any | null> {
  try {
    const cachePath = getCachePath(endpoint);
    const fileContent = await Deno.readTextFile(cachePath);
    const cacheData = JSON.parse(fileContent);
    console.log(`✓ Loaded cached response from: ${cachePath}`);
    return cacheData.data;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null; // Cache file doesn't exist
    }
    console.error(`Error loading cache for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Clear all cached files
 */
export async function clearCache(): Promise<void> {
  try {
    const dir = await Deno.readDir(CACHE_DIR);
    for await (const entry of dir) {
      if (entry.isFile && entry.name.endsWith('.json')) {
        await Deno.remove(`${CACHE_DIR}/${entry.name}`);
      }
    }
    console.log('✓ Cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

