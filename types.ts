

export type NavView = 'dashboard' | 'crops' | 'fertilizer' | 'pests' | 'chat' | 'weather_station' | 'pest_alerts';

export type Language = 'en' | 'hi' | 'kn' | 'te';

export interface Farmer {
  id: string;
  name: string;
  location: string;
  phone: string;
  password?: string; // Optional for security when passing around
}

export interface WeatherData {
  temp: number;
  condition: string;
  code: number;
  humidity: number;
  windSpeed: number;
  location: string;
  forecast: Array<{ day: string; temp: number; icon: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SoilData {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  rainfall: number;
}

export interface CropRecommendation {
  name: string;
  scientificName: string;
  confidence: number;
  description: string;
  imageUrl: string;
  requirements: {
    water: string;
    sun: string;
    soil: string;
  };
  growthPeriod: string;
  yieldPotential: string;
  economicAnalysis: string;
}

export interface PestAnalysisResult {
  pestName: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  treatments: string[];
  preventions: string[];
}

export interface FertilizerPlan {
  name: string;
  description: string;
  applicationFrequency: string;
  dosage: string;
  warnings: string[];
}