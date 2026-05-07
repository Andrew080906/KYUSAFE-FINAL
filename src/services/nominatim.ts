
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}

const searchCache = new Map<string, NominatimResult[]>();

/**
 * Searches for locations using the Nominatim API (OpenStreetMap).
 * @param query The search query string.
 * @returns A promise that resolves to an array of NominatimResult objects.
 */
export const searchNominatim = async (query: string): Promise<NominatimResult[]> => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (searchCache.has(normalizedQuery)) {
    return searchCache.get(normalizedQuery)!;
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `/api/search?q=${encodedQuery}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from search service.');
    }

    searchCache.set(normalizedQuery, data);
    return data;
  } catch (error: any) {
    if (error?.message?.includes("Failed to fetch") || error?.message?.includes("Rate limit")) {
      console.warn('Nominatim search warning:', error.message);
    } else {
      console.error('Nominatim search error:', error);
    }
    throw error;
  }
};
