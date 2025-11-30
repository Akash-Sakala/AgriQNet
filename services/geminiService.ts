

import { GoogleGenAI, Type } from "@google/genai";
import { PestAnalysisResult, CropRecommendation, FertilizerPlan, Language } from "../types";
import { LANGUAGES } from "../utils/translations";

// Initialize Gemini Client
// NOTE: In a real app, ensure process.env.API_KEY is defined.
// If it's missing, the service calls will fail gracefully in the components.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  /**
   * General chat interaction
   */
  async chat(message: string, history: {role: string, parts: {text: string}[]}[] = [], lang: Language = 'en'): Promise<string> {
    try {
      const languageName = LANGUAGES[lang];
      const model = 'gemini-2.5-flash';
      const chatSession = ai.chats.create({
        model,
        config: {
          systemInstruction: `You are AgriQNet, an advanced agricultural AI assistant. 
          Respond strictly in the ${languageName} language.
          
          Guidelines:
          1. Format your response using Markdown. Use bolding for key terms, lists for steps, and clear headings.
          2. If the user asks for a process (e.g., 'how to grow corn'), provide a structured step-by-step workflow.
          3. Keep answers concise, practical, and encouraging.`,
        },
        history: history.map(h => ({
            role: h.role,
            parts: h.parts
        }))
      });

      const result = await chatSession.sendMessage({ message });
      return result.text || "I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Chat Error:", error);
      return "Sorry, I'm having trouble connecting to the agricultural database right now.";
    }
  },

  /**
   * Recommend crops based on soil data
   * Accepts either SoilData object (Legacy) or new GenAI Input object
   */
  async recommendCrops(inputData: any, lang: Language = 'en'): Promise<CropRecommendation[]> {
    try {
      const languageName = LANGUAGES[lang];
      let prompt = '';

      if (inputData.nitrogen !== undefined) {
        // Legacy/ML Fallback input
        prompt = `Based on the following soil conditions, recommend the top 3 best suitable crops.
        Conditions: Nitrogen: ${inputData.nitrogen}, Phosphorus: ${inputData.phosphorus}, Potassium: ${inputData.potassium}, pH: ${inputData.ph}, Rainfall: ${inputData.rainfall}mm.`;
      } else {
        // New Simple GenAI Input
        prompt = `Recommend the top 3 best suitable crops for a farm with these details:
        Location: ${inputData.location}
        Soil Type: ${inputData.soilType}
        Water Source: ${inputData.waterSource}
        Field Size: ${inputData.fieldSize}
        Current Date: ${inputData.date} (Use this to determine the Season)
        
        Focus on crops that are profitable and suitable for this specific season and region.`;
      }
      
      prompt += `
      For each crop, provide a detailed analysis including scientific name, growth period, yield potential, and economic analysis.
      
      IMPORTANT: Provide all text content (descriptions, names, analysis) in ${languageName} language. 
      However, keep the JSON property keys exactly as specified in the schema (e.g. "name", "scientificName").
      Return the result as a JSON array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                scientificName: { type: Type.STRING },
                confidence: { type: Type.NUMBER, description: "Percentage match 0-100" },
                description: { type: Type.STRING, description: `A detailed description of why this crop fits in ${languageName}.` },
                imageUrl: { type: Type.STRING, description: "Leave empty, handled by frontend" },
                requirements: {
                  type: Type.OBJECT,
                  properties: {
                    water: { type: Type.STRING, description: `Water needs in ${languageName}` },
                    sun: { type: Type.STRING, description: `Sun needs in ${languageName}` },
                    soil: { type: Type.STRING, description: `Soil needs in ${languageName}` }
                  }
                },
                growthPeriod: { type: Type.STRING, description: `e.g., 90-120 days in ${languageName}` },
                yieldPotential: { type: Type.STRING, description: `e.g., 4-5 tons/hectare in ${languageName}` },
                economicAnalysis: { type: Type.STRING, description: `Short profitability analysis in ${languageName}` }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as CropRecommendation[];
    } catch (error) {
      console.error("Crop Rec Error:", error);
      throw error;
    }
  },

  /**
   * Analyze pest image
   */
  async analyzePestImage(base64Image: string, lang: Language = 'en'): Promise<PestAnalysisResult> {
    try {
      const languageName = LANGUAGES[lang];
      const prompt = `Analyze this image. If it contains a plant pest or disease, identify it, estimate severity, and provide treatments. If no pest is found, state that.
      IMPORTANT: Provide all text descriptions, names, and lists in ${languageName} language.
      Keep JSON keys in English.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pestName: { type: Type.STRING, description: `Name in ${languageName}` },
              confidence: { type: Type.NUMBER },
              severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
              description: { type: Type.STRING, description: `Description in ${languageName}` },
              treatments: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of treatments in ${languageName}` },
              preventions: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of preventions in ${languageName}` }
            }
          }
        }
      });

       const text = response.text;
       if (!text) throw new Error("No response text");
       return JSON.parse(text) as PestAnalysisResult;
    } catch (error) {
      console.error("Pest Analysis Error:", error);
      throw error;
    }
  },

  /**
   * Suggest fertilizer plan
   */
  async recommendFertilizer(cropName: string, soilCondition: string, lang: Language = 'en'): Promise<FertilizerPlan[]> {
    try {
      const languageName = LANGUAGES[lang];
      const prompt = `Recommend 2 detailed fertilizer plans for growing ${cropName} in ${soilCondition} soil conditions. Focus on organic and sustainable options if possible.
      IMPORTANT: Provide all text content (names, descriptions, dosage) in ${languageName} language.
      Keep JSON keys in English.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                applicationFrequency: { type: Type.STRING },
                dosage: { type: Type.STRING },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as FertilizerPlan[];
    } catch (error) {
      console.error("Fertilizer Rec Error:", error);
      throw error;
    }
  }
};
