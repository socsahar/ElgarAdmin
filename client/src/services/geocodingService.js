/**
 * Geocoding Service - Convert addresses to GPS coordinates
 * Uses OpenStreetMap Nominatim API (free service)
 */

class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org/search';
    this.requestDelay = 1000; // 1 second delay between requests (Nominatim rate limit)
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting to respect Nominatim usage policy
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Convert address to GPS coordinates with multiple fallback strategies
   * @param {string} address - Full address to geocode
   * @param {string} countryCode - Country code (default: 'IL' for Israel)
   * @returns {Promise<{latitude: number, longitude: number, displayName: string} | null>}
   */
  async addressToCoordinates(address, countryCode = 'IL') {
    try {
      console.log('🌍 Starting geocoding for address:', address);
      
      // Try Israeli-specific geocoding first
      let result = await this.geocodeIsraeliAddress(address, countryCode);
      
      if (!result) {
        console.log('🔄 Trying with cleaned address...');
        // Try with different formatting
        const cleanAddress = this.cleanAddress(address);
        result = await this.basicGeocode(cleanAddress, countryCode);
      }
      
      if (!result) {
        console.log('🔄 Trying without country restriction...');
        // Try without country restriction
        result = await this.basicGeocode(address, null);
      }
      
      if (!result) {
        console.log('🔄 Trying with Hebrew city names...');
        // Try with common Hebrew city transformations
        const hebrewAddress = this.transformToHebrew(address);
        result = await this.basicGeocode(hebrewAddress, 'IL');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Basic geocoding method
   */
  async basicGeocode(address, countryCode) {
    try {
      // Rate limiting
      await this.rateLimit();

      // Build query parameters
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '3', // Get more results for better chances
        'accept-language': 'he,en' // Hebrew and English
      });

      if (countryCode) {
        params.set('countrycodes', countryCode);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      
      console.log('🌍 Geocoding request:', address, countryCode ? `(${countryCode})` : '(global)');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ElgarCarTheftSystem/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0]; // Take the best result
        
        const coordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          confidence: result.importance || 0.5
        };
        
        console.log('✅ Geocoding success:', coordinates);
        return coordinates;
      } else {
        console.log('❌ No geocoding results found for:', address);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Specialized geocoding for Israeli addresses
   */
  async geocodeIsraeliAddress(address, countryCode = 'IL') {
    // Format address for Israeli geocoding
    const formattedAddress = this.formatIsraeliAddress(address);
    
    return await this.basicGeocode(formattedAddress, countryCode);
  }

  /**
   * Format address specifically for Israeli geocoding
   */
  formatIsraeliAddress(address) {
    if (!address) return '';
    
    // Common Israeli address patterns
    let formatted = address
      .trim()
      .replace(/רחוב\s+/g, '') // Remove "רחוב" prefix
      .replace(/\s+/g, ' '); // Normalize spaces
    
    // If it looks like "City, Street Number" format, try "Street Number, City"
    const parts = formatted.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Check if first part looks like a city name
      const possibleCity = parts[0];
      const possibleStreet = parts[1];
      
      // Common Israeli cities
      const israeliCities = [
        'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'פתח תקווה', 'נתניה', 
        'הרצליה', 'רמת גן', 'בני ברק', 'גבעתיים', 'כפר סבא', 'רעננה'
      ];
      
      if (israeliCities.some(city => possibleCity.includes(city))) {
        // It's likely "City, Street" - reorder to "Street, City"
        formatted = parts.slice(1).join(' ') + ', ' + possibleCity;
      }
    }
    
    return formatted;
  }

  /**
   * Transform address to Hebrew equivalents for better Israeli results
   */
  transformToHebrew(address) {
    if (!address) return '';
    
    const translations = {
      'tel aviv': 'תל אביב',
      'jerusalem': 'ירושלים',
      'haifa': 'חיפה',
      'beer sheva': 'באר שבע',
      'petah tikva': 'פתח תקווה',
      'netanya': 'נתניה',
      'herzliya': 'הרצליה',
      'ramat gan': 'רמת גן',
      'bnei brak': 'בני ברק',
      'givat shmuel': 'גבעת שמואל',
      'kfar saba': 'כפר סבא',
      'raanana': 'רעננה'
    };
    
    let transformed = address.toLowerCase();
    
    for (const [english, hebrew] of Object.entries(translations)) {
      transformed = transformed.replace(new RegExp(english, 'gi'), hebrew);
    }
    
    return transformed;
  }

  /**
   * Reverse geocoding - convert GPS coordinates to address
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<string|null>} Address string or null if failed
   */
  async coordinatesToAddress(latitude, longitude) {
    try {
      // Validate coordinates
      if (!this.isValidCoordinates(latitude, longitude)) {
        console.error('❌ Invalid coordinates for reverse geocoding:', { latitude, longitude });
        return null;
      }

      // Rate limiting
      await this.rateLimit();

      // Build reverse geocoding URL
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=he,en`;
      
      console.log('🔄 Reverse geocoding request:', { latitude, longitude });
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ElgarCarTheftSystem/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract meaningful address components
        const address = data.address || {};
        
        // Build a clean address string in Hebrew format
        const addressParts = [];
        
        // Street number and name
        if (address.house_number && address.road) {
          addressParts.push(`${address.road} ${address.house_number}`);
        } else if (address.road) {
          addressParts.push(address.road);
        }
        
        // City
        if (address.city) {
          addressParts.push(address.city);
        } else if (address.town) {
          addressParts.push(address.town);
        } else if (address.village) {
          addressParts.push(address.village);
        }
        
        // Country (if not Israel, include it)
        if (address.country && address.country !== 'ישראל' && address.country !== 'Israel') {
          addressParts.push(address.country);
        }
        
        const cleanAddress = addressParts.join(', ') || data.display_name;
        
        console.log('✅ Reverse geocoding successful:', cleanAddress);
        return cleanAddress;
      } else {
        console.log('❌ No reverse geocoding results found for coordinates:', { latitude, longitude });
        return null;
      }
      
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Clean and format address for better geocoding results
   */
  cleanAddress(address) {
    if (!address) return '';
    
    return address
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,|,$/g, ''); // Remove leading/trailing commas
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }
}

// Create singleton instance
const geocodingService = new GeocodingService();

export default geocodingService;
