import { Pushwoosh } from 'web-push-notifications';
import { apiClient } from 'app';

/**
 * Pushwoosh integration for Web Push notifications
 * 
 * ANTI-STORM DESIGN:
 * - Initialize once per app load
 * - Register device once per browser (cached in localStorage)
 * - Only re-register if token changes
 */

interface PushwooshConfig {
  apiToken: string;
  applicationCode: string;
  safariWebsitePushID?: string;
}

class PushwooshManager {
  private static instance: PushwooshManager;
  private pwInstance: any = null;
  private isInitialized = false;
  private isRegistering = false;

  private constructor() {}

  static getInstance(): PushwooshManager {
    if (!PushwooshManager.instance) {
      PushwooshManager.instance = new PushwooshManager();
    }
    return PushwooshManager.instance;
  }

  /**
   * Initialize Pushwoosh SDK
   * Call this once during app startup
   */
  async initialize(config: PushwooshConfig): Promise<void> {
    if (this.isInitialized) {
      console.log('[Pushwoosh] Already initialized');
      return;
    }

    try {
      this.pwInstance = new Pushwoosh();

      // Initialize with config
      await window.Pushwoosh.push([
        'init',
        {
          logLevel: import.meta.env.DEV ? 'info' : 'error',
          applicationCode: config.applicationCode,
          safariWebsitePushID: config.safariWebsitePushID,
          defaultNotificationTitle: 'Citizen Hub',
          defaultNotificationImage: '/brand/logo.png',
          autoSubscribe: false, // Manual subscription for better UX
          userId: null, // Will be set after login
        },
      ]);

      this.isInitialized = true;
      console.log('[Pushwoosh] SDK initialized');
    } catch (error) {
      console.error('[Pushwoosh] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if browser supports push notifications
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request notification permission and register device
   * 
   * ANTI-STORM: Only registers once per browser session
   * Caches device info in localStorage
   */
  async requestPermissionAndRegister(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('[Pushwoosh] SDK not initialized');
      return false;
    }

    if (!this.isSupported()) {
      console.warn('[Pushwoosh] Push notifications not supported');
      return false;
    }

    // Check if already registered for this session
    const cachedDevice = this.getCachedDevice();
    if (cachedDevice && cachedDevice.userId === userId) {
      console.log('[Pushwoosh] Device already registered for this session');
      return true;
    }

    // Prevent multiple simultaneous registration attempts
    if (this.isRegistering) {
      console.log('[Pushwoosh] Registration already in progress');
      return false;
    }

    try {
      this.isRegistering = true;

      // Set user ID before subscribing
      this.pwInstance.push(['setUserId', userId]);

      // Request permission and subscribe
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('[Pushwoosh] Permission denied');
        return false;
      }

      // Subscribe to push notifications
      await new Promise<void>((resolve, reject) => {
        this.pwInstance.push([
          'subscribe',
          () => {
            console.log('[Pushwoosh] Subscription successful');
            resolve();
          },
          (error: any) => {
            console.error('[Pushwoosh] Subscription failed:', error);
            reject(error);
          },
        ]);
      });

      // Get device info from Pushwoosh
      const deviceInfo = await this.getDeviceInfo();

      if (!deviceInfo) {
        console.error('[Pushwoosh] Failed to get device info');
        return false;
      }

      // Register device with our backend
      await this.registerWithBackend(userId, deviceInfo);

      // Cache device info
      this.cacheDevice(userId, deviceInfo);

      return true;
    } catch (error) {
      console.error('[Pushwoosh] Registration failed:', error);
      return false;
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.isInitialized) return;

    return new Promise<void>((resolve, reject) => {
      this.pwInstance.push([
        'unsubscribe',
        () => {
          console.log('[Pushwoosh] Unsubscribed successfully');
          this.clearCachedDevice();
          resolve();
        },
        (error: any) => {
          console.error('[Pushwoosh] Unsubscribe failed:', error);
          reject(error);
        },
      ]);
    });
  }

  /**
   * Get device information from Pushwoosh
   */
  private async getDeviceInfo(): Promise<any> {
    return new Promise((resolve) => {
      this.pwInstance.push([
        'getHWID',
        (hwid: string) => {
          this.pwInstance.push([
            'getPushToken',
            (token: string) => {
              resolve({
                hwid,
                token,
                userAgent: navigator.userAgent,
              });
            },
          ]);
        },
      ]);
    });
  }

  /**
   * Register device with our backend API
   */
  private async registerWithBackend(
    userId: string,
    deviceInfo: any
  ): Promise<void> {
    try {
      // Detect browser and OS
      const ua = navigator.userAgent;
      let browserName = 'unknown';
      let browserVersion = '';
      let osName = 'unknown';

      // Browser detection
      if (ua.includes('Chrome')) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/(\d+)/)![1];
      } else if (ua.includes('Firefox')) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/(\d+)/)![1];
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/(\d+)/)![1];
      } else if (ua.includes('Edge')) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edge\/(\d+)/)![1];
      }

      // OS detection
      if (ua.includes('Win')) osName = 'Windows';
      else if (ua.includes('Mac')) osName = 'macOS';
      else if (ua.includes('Linux')) osName = 'Linux';
      else if (ua.includes('Android')) osName = 'Android';
      else if (ua.includes('iOS')) osName = 'iOS';

      const deviceType = `web_${browserName.toLowerCase()}`;

      await apiClient.register_device({
        device_hwid: deviceInfo.hwid,
        device_type: deviceType,
        push_token: deviceInfo.token,
        user_agent: ua,
        browser_name: browserName,
        browser_version: browserVersion,
        os_name: osName,
      });

      console.log('[Pushwoosh] Device registered with backend');
    } catch (error) {
      console.error('[Pushwoosh] Backend registration failed:', error);
      // Don't throw - Pushwoosh subscription still works
    }
  }

  /**
   * Cache device info in localStorage (ANTI-STORM)
   */
  private cacheDevice(userId: string, deviceInfo: any): void {
    try {
      localStorage.setItem(
        'pushwoosh_device',
        JSON.stringify({
          userId,
          hwid: deviceInfo.hwid,
          registeredAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('[Pushwoosh] Failed to cache device:', error);
    }
  }

  /**
   * Get cached device info
   */
  private getCachedDevice(): any {
    try {
      const cached = localStorage.getItem('pushwoosh_device');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cached device info
   */
  private clearCachedDevice(): void {
    try {
      localStorage.removeItem('pushwoosh_device');
    } catch (error) {
      console.error('[Pushwoosh] Failed to clear cache:', error);
    }
  }

  /**
   * Set user tags (for targeted notifications)
   */
  setTags(tags: Record<string, any>): void {
    if (!this.isInitialized) return;
    this.pwInstance.push(['setTags', tags]);
  }

  /**
   * Check subscription status
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.isInitialized) return false;

    return new Promise((resolve) => {
      this.pwInstance.push([
        'isSubscribed',
        (isSubscribed: boolean) => {
          resolve(isSubscribed);
        },
      ]);
    });
  }
}

// Export singleton instance
export const pushwoosh = PushwooshManager.getInstance();

// Export config from backend API
export const getPushwooshConfig = async (): Promise<PushwooshConfig> => {
  try {
    // Fetch public config from backend using apiClient to handle base URL correctly
    const response = await apiClient.get_public_config();
    
    if (!response.ok) {
      console.error('[Pushwoosh] Failed to fetch config:', response.statusText);
      return {
        apiToken: '',
        applicationCode: '',
      };
    }
    
    const data = await response.json();
    
    if (!data.pushwoosh) {
      console.warn('[Pushwoosh] No config returned from backend');
      return {
        apiToken: '',
        applicationCode: '',
      };
    }
    
    // Note: apiToken is not returned by backend (it's server-side only)
    // The frontend SDK doesn't actually need the server token
    return {
      apiToken: '', // Not needed for frontend SDK
      applicationCode: data.pushwoosh.application_code || '',
      safariWebsitePushID: data.pushwoosh.safari_website_push_id || undefined,
    };
  } catch (error) {
    console.error('[Pushwoosh] Error fetching config:', error);
    return {
      apiToken: '',
      applicationCode: '',
    };
  }
};
