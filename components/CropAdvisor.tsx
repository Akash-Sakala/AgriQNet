

import React, { useState, useEffect } from 'react';
import { Sprout, Droplets, FlaskConical, MapPin, Loader2, CheckCircle, Clock, TrendingUp, DollarSign, X, Sun, Info, Leaf, Activity, BrainCircuit } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SoilData, CropRecommendation, Language } from '../types';
import { getTranslation } from '../utils/translations';
import appleImg from '../images/apple.jpeg';
import bananaImg from '../images/banana.jpeg';
import blackgramImg from '../images/blackgram.jpeg';
import chickpeaImg from '../images/chickpea.jpeg';
import coconutImg from '../images/coconut.jpeg';
import coffeeImg from '../images/coffee.jpeg';
import cottonImg from '../images/cotton.jpeg';
import grapesImg from '../images/grapes.jpg';
import juteImg from '../images/jute.jpeg';
import kidneybeansImg from '../images/kidneybeans.jpeg';
import lentilImg from '../images/lentil.jpeg';
import maizeImg from '../images/maize.jpeg';
import mangoImg from '../images/mango.jpeg';
import mothbeansImg from '../images/mothbeans.jpeg';
import mungbeanImg from '../images/mungbean.jpeg';
import muskmelonImg from '../images/muskmelon.jpeg';
import orangeImg from '../images/orange.jpeg';
import papayaImg from '../images/papaya.jpeg';
import pigeonpeasImg from '../images/pigeonpeas.jpeg';
import pomegranateImg from '../images/pomegranate.jpeg';
import riceImg from '../images/rice.jpeg';
import watermelonImg from '../images/watermelon.jpeg';
import wheatImg from '../images/wheat.jpeg';
import cornImg from '../images/corn.jpeg';
import sugarcaneImg from '../images/sugarcane.jpeg'

interface CropAdvisorProps {
  lang: Language;
}

// Predefined dictionary for common crops to ensure high-quality, relevant images
const CROP_IMAGES: Record<string, string> = {
  'wheat': wheatImg,
  'corn': cornImg,
  // 'potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
  // 'tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
  'sugarcane': sugarcaneImg,
  // 'soybean': 'https://images.unsplash.com/photo-1526346698789-22fd84310124?auto=format&fit=crop&w=800&q=80',
  // 'barley': 'https://images.unsplash.com/photo-1518563259397-59c23b3eb981?auto=format&fit=crop&w=800&q=80',
  // 'tea': 'https://images.unsplash.com/photo-1558230263-5490726d691e?auto=format&fit=crop&w=800&q=80',
  // 'sunflower': 'https://images.unsplash.com/photo-1471193945509-9adadd0974ce?auto=format&fit=crop&w=800&q=80',
  // 'carrot': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80',
  // 'onion': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
  // 'chilli': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
  'maize': maizeImg,
  'apple': appleImg,
  'banana': bananaImg,
  'blackgram': blackgramImg,
  'chickpea': chickpeaImg,
  'coconut': coconutImg,
  'coffee': coffeeImg,
  'cotton': cottonImg,
  'grapes': grapesImg,
  'jute': juteImg,
  'kidneybeans': kidneybeansImg,
  'lentil': lentilImg,
  'mango': mangoImg,
  'mothbeans': mothbeansImg,
  'mungbean': mungbeanImg,
  'muskmelon': muskmelonImg,
  'orange': orangeImg,
  'papaya': papayaImg,
  'pigeonpeas': pigeonpeasImg,
  'pomegranate': pomegranateImg,
  'rice': riceImg,
  'watermelon': watermelonImg,
};

const STORAGE_KEY = 'agriqnet_crop_advisor';

type AdvisorMode = 'genai' | 'ml';

const CropAdvisor: React.FC<CropAdvisorProps> = ({ lang }) => {
  const t = getTranslation(lang);
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | null>(null);
  const [mode, setMode] = useState<AdvisorMode>('genai');

  // GenAI Simple Mode State
  const [genAIParams, setGenAIParams] = useState({
    location: '',
    soilType: 'Red Soil',
    waterSource: 'Rainfed',
    fieldSize: ''
  });

  // ML Model State
  const [soilData, setSoilData] = useState<SoilData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).soilData : {
        nitrogen: 40,
        phosphorus: 50,
        potassium: 40,
        ph: 6.5,
        rainfall: 1200
      };
    } catch {
      return {
        nitrogen: 40,
        phosphorus: 50,
        potassium: 40,
        ph: 6.5,
        rainfall: 1200
      };
    }
  });

  const [extraParams, setExtraParams] = useState({
    temperature: 25,
    humidity: 70
  });
  
  const [mlResult, setMlResult] = useState<{prediction: string, details: {confidence: number}} | null>(null);

  // Initialize recommendations from localStorage
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).recommendations : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ recommendations, soilData, genAIParams }));
  }, [recommendations, soilData, genAIParams]);

  // const handleRecommend = async () => {
  //   setLoading(true);
  //   try {
  //     // For GenAI, we pass the simplified params + current date
  //     const currentDate = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'en-IN', {
  //       weekday: 'long',
  //       year: 'numeric',
  //       month: 'long',
  //       day: 'numeric'
  //     });
      
  //     const payload = {
  //       ...genAIParams,
  //       date: currentDate
  //     };

  //     const results = await GeminiService.recommendCrops(payload, lang);
  //     setRecommendations(results);
  //   } catch (err) {
  //     alert("Failed to get recommendations. Check API Key.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleRecommend = async () => {
  setLoading(true);
  try {
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'en-IN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Detailed prompt construction
    const prompt = `
      CONTEXT:
      - Location: ${genAIParams.location}
      - Current Date: ${dateString}
      - Soil: ${genAIParams.soilType}
      - Water: ${genAIParams.waterSource}
      - Farm Size: ${genAIParams.fieldSize}
      - Preferred Language: ${lang}

      INSTRUCTIONS:
      1. Analyze the agro-climatic zone of ${genAIParams.location}. Identify typical historical crops and current market demand in this specific region.
      2. Factor in the current season (e.g., Kharif, Rabi, or Zaid in India) based on the date: ${dateString}.
      3. Filter these crops based on the user's ${genAIParams.soilType} and ${genAIParams.waterSource}.
      4. Provide 4-5 high-probability recommendations.

      OUTPUT FORMAT:
      Return ONLY a JSON array. Translate all values (except JSON keys) to the language: ${lang}.
      Structure:
      [{
        "name": "string",
        "scientificName": "string",
        "confidence": number,
        "description": "Why this works for ${genAIParams.location} in this season",
        "growthPeriod": "string",
        "yieldPotential": "string",
        "economicAnalysis": "Market demand and price trends for this region",
        "requirements": {
          "water": "string",
          "sun": "string",
          "soil": "string"
        }
      }]
    `;

    const results = await GeminiService.recommendCrops(prompt, lang);
    setRecommendations(results);
  } catch (err) {
    console.error(err);
    alert("Recommendation failed.");
  } finally {
    setLoading(false);
  }
};

  const handleMLPredict = async () => {
    setLoading(true);
    setMlResult(null);
    try {
      const payload = {
        N: soilData.nitrogen,
        P: soilData.phosphorus,
        K: soilData.potassium,
        temperature: extraParams.temperature,
        humidity: extraParams.humidity,
        ph: soilData.ph,
        rainfall: soilData.rainfall
      };

      const response = await fetch('https://agro-backend-ns2o.onrender.com/api/crop_recommender/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('ML API Error');
      }

      const data = await response.json();
      setMlResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Precision Model. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSoilData({ ...soilData, [e.target.name]: parseFloat(e.target.value) });
  };
  
  const handleGenAIChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setGenAIParams({ ...genAIParams, [e.target.name]: e.target.value });
  };

  const handleExtraParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExtraParams({ ...extraParams, [e.target.name]: parseFloat(e.target.value) });
  };

  const getCropImage = (cropName: string) => {
    const normalizedName = cropName.toLowerCase().trim();
    const keys = Object.keys(CROP_IMAGES);
    for (const key of keys) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return CROP_IMAGES[key];
      }
    }
    const tags = `agriculture,plant,crop`;
    return `https://loremflickr.com/800/600/${tags}?lock=${cropName.length}`; 
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Detailed View Modal */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setSelectedCrop(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="relative h-64 md:h-80">
               <img 
                 src={getCropImage(selectedCrop.name)} 
                 alt={selectedCrop.name} 
                 className="w-full h-full object-cover" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                  <h2 className="text-4xl font-bold text-white mb-1">{selectedCrop.name}</h2>
                  <p className="text-green-300 font-medium italic text-lg">{selectedCrop.scientificName}</p>
               </div>
            </div>

            <div className="p-8 space-y-8">
               {/* Quick Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                    <CheckCircle className="mx-auto text-green-600 mb-2" size={24} />
                    <div className="text-xs text-gray-500 uppercase font-bold">{t.confidence}</div>
                    <div className="text-xl font-bold text-gray-800">{selectedCrop.confidence}%</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <Clock className="mx-auto text-blue-600 mb-2" size={24} />
                    <div className="text-xs text-gray-500 uppercase font-bold">{t.growthTime}</div>
                    <div className="text-xl font-bold text-gray-800 leading-tight text-sm md:text-base mt-1">{selectedCrop.growthPeriod}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                    <TrendingUp className="mx-auto text-orange-600 mb-2" size={24} />
                    <div className="text-xs text-gray-500 uppercase font-bold">{t.yield}</div>
                    <div className="text-xl font-bold text-gray-800 leading-tight text-sm md:text-base mt-1">{selectedCrop.yieldPotential}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 text-center">
                    <DollarSign className="mx-auto text-yellow-600 mb-2" size={24} />
                    <div className="text-xs text-gray-500 uppercase font-bold">{t.economy}</div>
                    <div className="text-xl font-bold text-gray-800 leading-tight text-sm md:text-base mt-1 line-clamp-2">{selectedCrop.economicAnalysis.split('.')[0]}</div>
                  </div>
               </div>

               {/* Detailed Analysis */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     <Info size={20} className="text-agri-600" /> {t.analysis}
                   </h3>
                   <p className="text-gray-600 leading-relaxed text-justify">
                     {selectedCrop.description}
                   </p>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-gray-700 mb-2 text-sm">{t.economy}</h4>
                      <p className="text-sm text-gray-600">{selectedCrop.economicAnalysis}</p>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     <Leaf size={20} className="text-agri-600" /> {t.requirements}
                   </h3>
                   <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Droplets size={18} /></div>
                        <div>
                          <span className="text-xs text-gray-400 font-bold uppercase">{t.waterNeeds}</span>
                          <p className="text-sm font-medium text-gray-700">{selectedCrop.requirements.water}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Sun size={18} /></div>
                        <div>
                          <span className="text-xs text-gray-400 font-bold uppercase">{t.sunlight}</span>
                          <p className="text-sm font-medium text-gray-700">{selectedCrop.requirements.sun}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><MapPin size={18} /></div>
                        <div>
                          <span className="text-xs text-gray-400 font-bold uppercase">{t.soilPref}</span>
                          <p className="text-sm font-medium text-gray-700">{selectedCrop.requirements.soil}</p>
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1.5 rounded-full inline-flex items-center shadow-inner">
          <button
            onClick={() => setMode('genai')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'genai' 
                ? 'bg-white text-agri-700 shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BrainCircuit size={16} />
            {t.aiModel}
          </button>
          <button
            onClick={() => setMode('ml')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'ml' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={16} />
            {t.precisionModel}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Input Section */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className={`bg-white rounded-3xl p-6 shadow-lg border ${mode === 'ml' ? 'border-blue-100' : 'border-agri-100'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${mode === 'ml' ? 'bg-blue-100 text-blue-600' : 'bg-agri-100 text-agri-600'}`}>
                {mode === 'ml' ? <Activity size={24} /> : <Leaf size={24} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{mode === 'ml' ? t.precisionModel : t.soilData}</h2>
                <p className="text-sm text-gray-500">{mode === 'ml' ? t.precisionDesc : t.genAiDesc}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {mode === 'ml' ? (
                // ML Mode Inputs (Technical)
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.nitrogen}</label>
                    <input type="range" name="nitrogen" min="0" max="140" value={soilData.nitrogen} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <div className="text-right text-xs font-bold text-blue-600">{soilData.nitrogen} mg/kg</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.phosphorus}</label>
                    <input type="range" name="phosphorus" min="0" max="100" value={soilData.phosphorus} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <div className="text-right text-xs font-bold text-blue-600">{soilData.phosphorus} mg/kg</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.potassium}</label>
                    <input type="range" name="potassium" min="0" max="100" value={soilData.potassium} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <div className="text-right text-xs font-bold text-blue-600">{soilData.potassium} mg/kg</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t.temperature}</label>
                       <input type="number" name="temperature" value={extraParams.temperature} onChange={handleExtraParamChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t.humidity} (%)</label>
                       <input type="number" name="humidity" value={extraParams.humidity} onChange={handleExtraParamChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.phLevel}</label>
                      <input type="number" name="ph" step="0.1" value={soilData.ph} onChange={handleInputChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 outline-none focus:ring-blue-500 text-gray-900" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">{t.rainfall}</label>
                      <input type="number" name="rainfall" value={soilData.rainfall} onChange={handleInputChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 outline-none focus:ring-blue-500 text-gray-900" />
                    </div>
                  </div>
                </>
              ) : (
                // GenAI Mode Inputs (Farmer Friendly) - UPDATED TEXT COLORS
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t.farmLocation}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        name="location" 
                        value={genAIParams.location} 
                        onChange={handleGenAIChange} 
                        placeholder="e.g. Mandya, Karnataka"
                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none text-gray-900 placeholder-gray-500 font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t.soilType}</label>
                    <select 
                      name="soilType"
                      value={genAIParams.soilType}
                      onChange={handleGenAIChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none appearance-none text-gray-900 font-medium"
                    >
                      <option value="Red Soil">{t.soilRed}</option>
                      <option value="Black Soil">{t.soilBlack}</option>
                      <option value="Alluvial Soil">{t.soilAlluvial}</option>
                      <option value="Clay Soil">{t.soilClay}</option>
                      <option value="Sandy Soil">{t.soilSandy}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t.waterSource}</label>
                    <select 
                      name="waterSource"
                      value={genAIParams.waterSource}
                      onChange={handleGenAIChange}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none appearance-none text-gray-900 font-medium"
                    >
                      <option value="Rainfed">{t.waterRain}</option>
                      <option value="Borewell">{t.waterBore}</option>
                      <option value="Canal Irrigation">{t.waterCanal}</option>
                      <option value="River">{t.waterRiver}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t.fieldSize}</label>
                    <input 
                      type="text" 
                      name="fieldSize" 
                      value={genAIParams.fieldSize} 
                      onChange={handleGenAIChange} 
                      placeholder="e.g. 2 Acres"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none text-gray-900 placeholder-gray-500 font-medium"
                    />
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={mode === 'ml' ? handleMLPredict : handleRecommend}
              disabled={loading}
              className={`w-full mt-8 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'ml' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30'
                  : 'bg-gradient-to-r from-agri-600 to-agri-500 hover:shadow-lg hover:shadow-agri-500/30'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : (mode === 'ml' ? <Activity /> : <Sprout />)}
              {loading ? t.analyzing : (mode === 'ml' ? t.predict : t.analyze)}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="w-full md:w-2/3">
          {/* ML Result Display */}
          {mode === 'ml' ? (
             <div className="h-full">
                {!mlResult && !loading && (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white/50 border-2 border-dashed border-blue-200 rounded-3xl p-12">
                     <BrainCircuit size={48} className="mb-4 text-blue-300" />
                     <p className="text-lg text-center max-w-sm">{t.precisionDesc}</p>
                   </div>
                )}
                
                {mlResult && (
                  <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-blue-100 animate-in zoom-in-95 duration-500">
                      <div className="h-64 overflow-hidden relative group">
                        <img 
                          src={getCropImage(mlResult.prediction)} 
                          alt={mlResult.prediction} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                           <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 flex items-center gap-1">
                              <Activity size={12} /> {t.predictionResult}
                           </div>
                           <h2 className="text-4xl font-bold text-white capitalize">{mlResult.prediction}</h2>
                           <p className="text-blue-200 font-medium">Confidence Score: {(mlResult.details.confidence * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="p-8">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
                               <span className="text-xs font-bold text-blue-600 uppercase">Input Summary</span>
                               <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100 text-gray-600">N: {soilData.nitrogen}</span>
                                  <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100 text-gray-600">P: {soilData.phosphorus}</span>
                                  <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100 text-gray-600">K: {soilData.potassium}</span>
                                  <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100 text-gray-600">Temp: {extraParams.temperature}°C</span>
                               </div>
                            </div>
                         </div>
                         <p className="text-gray-600 leading-relaxed">
                            Based on your precise soil and environmental metrics, our Machine Learning model has identified 
                            <strong className="text-gray-900 capitalize"> {mlResult.prediction} </strong> 
                            as the optimal crop for your field. This prediction is calculated using historical agricultural data patterns.
                         </p>
                      </div>
                  </div>
                )}
             </div>
          ) : (
            // GenAI Results Grid
            <div className="h-full">
              {recommendations.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-12">
                  <Sprout size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg text-center">{t.noCrops}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((crop, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedCrop(crop)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group cursor-pointer transform hover:-translate-y-1"
                    >
                        <div className="h-40 overflow-hidden relative">
                          <img 
                            src={getCropImage(crop.name)} 
                            alt={crop.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-agri-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle size={12} /> {crop.confidence}% Match
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{crop.name}</h3>
                          <p className="text-xs text-gray-400 italic mb-3">{crop.scientificName}</p>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{crop.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Droplets size={14} className="text-blue-500" />
                              <span>{crop.requirements.water}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Sun size={14} className="text-orange-500" />
                              <span>{crop.requirements.sun}</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center">
                            <span className="text-xs font-bold text-agri-600 uppercase tracking-wide group-hover:underline">{t.clickAnalysis}</span>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropAdvisor;