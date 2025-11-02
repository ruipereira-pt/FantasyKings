/**
 * Sportradar API Response Cache Utility
 * 
 * Saves successful API responses to Supabase Storage for testing/debugging
 * Files are saved in the 'sportradar-cache' storage bucket
 */

const BUCKET_NAME = 'sportradar-cache';

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
  return sanitizeFilename(endpoint);
}

/**
 * Save API response to cache in Supabase Storage
 */
export async function saveToCache(
  endpoint: string,
  data: any,
  supabase?: any
): Promise<void> {
  try {
    if (!supabase) {
      // If no supabase client provided, skip caching (no error)
      return;
    }

    const cachePath = getCachePath(endpoint);
    const cacheData = {
      endpoint,
      timestamp: new Date().toISOString(),
      data,
    };
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(cachePath, JSON.stringify(cacheData, null, 2), {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      // If bucket doesn't exist, that's okay - caching is optional
      if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
        console.log(`Cache bucket '${BUCKET_NAME}' not found. Caching skipped.`);
        return;
      }
      throw error;
    }
    
    console.log(`✓ Cached response to: ${cachePath}`);
  } catch (error) {
    console.error(`Error saving cache for ${endpoint}:`, error);
    // Don't throw - caching is optional
  }
}

/**
 * Load API response from cache in Supabase Storage (if available)
 */
export async function loadFromCache(
  endpoint: string,
  supabase?: any
): Promise<any | null> {
  try {
    if (!supabase) {
      return null;
    }

    const cachePath = getCachePath(endpoint);
    
    // Download from Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(cachePath);

    if (error) {
      if (error.message?.includes('not found') || error.statusCode === 404) {
        return null; // Cache file doesn't exist
      }
      throw error;
    }

    // Parse the cached data
    const text = await data.text();
    const cacheData = JSON.parse(text);
    console.log(`✓ Loaded cached response from: ${cachePath}`);
    return cacheData.data;
  } catch (error) {
    if (error instanceof TypeError && error.message?.includes('text')) {
      // File might be empty or invalid
      return null;
    }
    console.error(`Error loading cache for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Clear all cached files from Supabase Storage
 */
export async function clearCache(supabase?: any): Promise<void> {
  try {
    if (!supabase) {
      return;
    }

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (listError) {
      if (listError.message?.includes('not found')) {
        console.log(`Cache bucket '${BUCKET_NAME}' not found. Nothing to clear.`);
        return;
      }
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log('Cache is already empty');
      return;
    }

    // Delete all JSON files
    const jsonFiles = files.filter((f: any) => f.name.endsWith('.json'));
    const pathsToDelete = jsonFiles.map((f: any) => f.name);

    if (pathsToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(pathsToDelete);

      if (deleteError) {
        throw deleteError;
      }
    }

    console.log(`✓ Cleared ${pathsToDelete.length} cached files`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
