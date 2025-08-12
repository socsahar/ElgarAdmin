import api from '../utils/api';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastUpdate = 0;
    this.updateInterval = 30000; // Update every 30 seconds
    this.minDistanceThreshold = 10; // Update if moved more than 10 meters
  }

  /**
   * Start tracking user location and periodically update server
   */
  startTracking() {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    this.isTracking = true;
    console.log('Starting location tracking...');

    // Request high accuracy position
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Accept cached position up to 1 minute old
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
  }

  /**
   * Stop tracking user location
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  /**
   * Handle location update from browser
   */
  async handleLocationUpdate(position) {
    const { latitude, longitude } = position.coords;
    const now = Date.now();

    // Throttle updates - don't update too frequently
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }

    try {
      // Send location to server
      const response = await api.post('/api/users/update-location', {
        latitude,
        longitude
      });

      if (response.data.success) {
        this.lastUpdate = now;
        console.log('Location updated successfully:', { latitude, longitude });
      }
    } catch (error) {
      console.error('Error updating location:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // If we get authentication error, stop tracking
      if (error.response?.status === 401) {
        this.stopTracking();
      }
    }
  }

  /**
   * Handle location error
   */
  handleLocationError(error) {
    let message = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'User denied the request for Geolocation';
        // Stop tracking if permission denied
        this.stopTracking();
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable';
        break;
      case error.TIMEOUT:
        message = 'The request to get user location timed out';
        break;
    }
    
    console.error('Location error:', message);
  }

  /**
   * Get current position once (for immediate use)
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Update location immediately (manual trigger)
   */
  async updateLocationNow() {
    try {
      const position = await this.getCurrentPosition();
      
      const response = await api.post('/api/users/update-location', {
        latitude: position.latitude,
        longitude: position.longitude
      });

      if (response.data.success) {
        console.log('Manual location update successful');
        return response.data.location;
      }
    } catch (error) {
      console.error('Error in manual location update:', error);
      throw error;
    }
  }

  /**
   * Check if location tracking is supported
   */
  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported');
    }

    try {
      const position = await this.getCurrentPosition();
      return true;
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        throw new Error('Location permission denied');
      }
      throw error;
    }
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
