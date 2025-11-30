
import { Farmer } from "../types";

const API_URL = "http://localhost:5000/api";
const CACHE_KEY = "agriqnet_current_farmer";
const LOCAL_DB_KEY = "agriqnet_users_db";
const PEST_SUBSCRIPTIONS_KEY = "agriqnet_pest_subscriptions";

export const DBService = {
  /**
   * Helper to get local users
   */
  getLocalUsers(): Farmer[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Checks if a user exists in the MongoDB database via Backend API.
   * Falls back to LocalStorage if API fails.
   */
  async findUserByPhone(phone: string): Promise<Farmer | null> {
    try {
      const response = await fetch(`${API_URL}/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      
      if (!response.ok) throw new Error("Backend unavailable");
      
      const data = await response.json();
      if (data.exists) {
        return { id: 'existing', name: 'Existing', location: '', phone, password: '' };
      }
      return null;
    } catch (error) {
      console.warn("Backend unavailable, checking local storage...");
      // Fallback
      const localUsers = this.getLocalUsers();
      const user = localUsers.find(u => u.phone === phone);
      return user || null;
    }
  },

  /**
   * Registers a new user into MongoDB via Backend API.
   * Falls back to LocalStorage if API fails.
   */
  async createUser(farmer: Farmer): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmer)
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }
      return true;
    } catch (error) {
      console.warn("Backend unavailable, saving to local storage...");
      // Fallback
      const localUsers = this.getLocalUsers();
      // Check duplicate locally just in case
      if (localUsers.find(u => u.phone === farmer.phone)) return false;
      
      localUsers.push(farmer);
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(localUsers));
      return true;
    }
  },

  /**
   * Verifies login credentials against MongoDB via Backend API.
   * Falls back to LocalStorage if API fails.
   */
  async verifyLogin(phone: string, password: string): Promise<Farmer | null> {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.cacheUser(data.user);
          return data.user;
        }
      } else {
         // If server returns 404/401, we respect that. Only fallback on fetch error.
         if (response.status === 404 || response.status === 401) {
            return null;
         }
         throw new Error("Backend Error");
      }
      return null;
    } catch (error) {
      console.warn("Backend unavailable, verifying locally...");
      // Fallback
      const localUsers = this.getLocalUsers();
      const user = localUsers.find(u => u.phone === phone && u.password === password);
      
      if (user) {
        this.cacheUser(user);
        return user;
      }
      return null;
    }
  },

  /**
   * Cache user locally for session persistence
   */
  cacheUser(user: Farmer) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  },

  getCachedUser(): Farmer | null {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(CACHE_KEY);
  },

  /**
   * Subscribe a phone number to Pest Alerts for a specific district.
   * Persists to LocalStorage as a HashMap: { "DistrictName": ["phone1", "phone2"] }
   */
  addPestSubscriber(district: string, phone: string): boolean {
    try {
      const storedMap = localStorage.getItem(PEST_SUBSCRIPTIONS_KEY);
      const subscriptionMap: Record<string, string[]> = storedMap ? JSON.parse(storedMap) : {};

      // Initialize district set if not exists
      if (!subscriptionMap[district]) {
        subscriptionMap[district] = [];
      }

      // Add phone if not already subscribed (Set behavior)
      if (!subscriptionMap[district].includes(phone)) {
        subscriptionMap[district].push(phone);
        localStorage.setItem(PEST_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptionMap));
        return true;
      }
      return true; // Already subscribed
    } catch (error) {
      console.error("Failed to save subscription", error);
      return false;
    }
  },

  /**
   * Retrieve all pest alert subscribers
   */
  getPestSubscribers(): Record<string, string[]> {
    try {
      const storedMap = localStorage.getItem(PEST_SUBSCRIPTIONS_KEY);
      return storedMap ? JSON.parse(storedMap) : {};
    } catch {
      return {};
    }
  }
};
