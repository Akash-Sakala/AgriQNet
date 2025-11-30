
import React, { useState, useEffect } from 'react';
import { FlaskConical, Leaf, AlertCircle, Loader2, Calendar, Scale, BrainCircuit, Activity, Sprout } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { FertilizerPlan, Language } from '../types';
import { getTranslation } from '../utils/translations';

interface FertilizerAdvisorProps {
  lang: Language;
}

const STORAGE_KEY = 'agriqnet_fertilizer_advisor';

type AdvisorMode = 'genai' | 'ml';

const FertilizerAdvisor: React.FC<FertilizerAdvisorProps> = ({ lang }) => {
  const t = getTranslation(lang);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AdvisorMode>('genai');

  // Initialize state from localStorage
  const savedData = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  })();

  // GenAI Mode State
  const [crop, setCrop] = useState(savedData.crop || '');
  const [soilType, setSoilType] = useState(savedData.soilType || 'Loamy');
  const [plans, setPlans] = useState<FertilizerPlan[]>(savedData.plans || []);

  // ML Mode State
  const [mlParams, setMlParams] = useState({
    nitrogen: 40,
    phosphorus: 40,
    potassium: 40
  });
  const [mlResult, setMlResult] = useState<{prediction: string, details: {confidence: number}} | null>(null);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ crop, soilType, plans, mlParams }));
  }, [crop, soilType, plans, mlParams]);

  const handleRecommend = async () => {
    if(!crop) return;
    setLoading(true);
    setPlans([]); // Clear previous plans
    try {
      const results = await GeminiService.recommendFertilizer(crop, soilType, lang);
      setPlans(results);
    } catch (err) {
      console.error(err);
      alert("Unable to generate recommendations. Please check your API key or connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleMLPredict = async () => {
    setLoading(true);
    setMlResult(null);
    try {
      const payload = {
        Nitrogen: mlParams.nitrogen,
        Potassium: mlParams.potassium,
        Phosphorous: mlParams.phosphorus // API expects 'Phosphorous'
      };

      const response = await fetch('https://agro-backend-ns2o.onrender.com/api/fertilizer_recommender/predict', {
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
      alert("Failed to connect to Precision Fertilizer Model. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleMlParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMlParams({ ...mlParams, [e.target.name]: parseFloat(e.target.value) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={16} />
            {t.fertilizerPrecision}
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className={`bg-white rounded-3xl p-8 shadow-lg border ${mode === 'ml' ? 'border-yellow-200' : 'border-agri-100'}`}>
        <div className="text-center max-w-2xl mx-auto mb-8">
           <div className={`inline-flex p-3 rounded-full mb-4 ${mode === 'ml' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
             {mode === 'ml' ? <Activity size={32} /> : <FlaskConical size={32} />}
           </div>
           <h2 className="text-3xl font-bold text-gray-800">{mode === 'ml' ? t.fertilizerPrecision : t.calcTitle}</h2>
           <p className="text-gray-500 mt-2">{mode === 'ml' ? t.fertilizerPrecisionDesc : t.calcDesc}</p>
        </div>

        {mode === 'ml' ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.nitrogen}</label>
                <input type="range" name="nitrogen" min="0" max="140" value={mlParams.nitrogen} onChange={handleMlParamChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                <div className="text-right text-xs font-bold text-orange-600">{mlParams.nitrogen} kg/ha</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.phosphorus}</label>
                <input type="range" name="phosphorus" min="0" max="140" value={mlParams.phosphorus} onChange={handleMlParamChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                <div className="text-right text-xs font-bold text-orange-600">{mlParams.phosphorus} kg/ha</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.potassium}</label>
                <input type="range" name="potassium" min="0" max="140" value={mlParams.potassium} onChange={handleMlParamChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                <div className="text-right text-xs font-bold text-orange-600">{mlParams.potassium} kg/ha</div>
              </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div className="space-y-2">
               <label className="text-sm font-semibold text-gray-700">{t.targetCrop}</label>
               <input 
                type="text" 
                placeholder="e.g. Tomato, Corn, Wheat"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-gray-900 placeholder-gray-400"
              />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-semibold text-gray-700">{t.soilCond}</label>
               <select 
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-gray-900"
               >
                 <option value="Loamy">{t.loamy}</option>
                 <option value="Clay">{t.clay}</option>
                 <option value="Sandy">{t.sandy}</option>
                 <option value="Silt">{t.silt}</option>
                 <option value="Peaty">{t.peaty}</option>
               </select>
             </div>
          </div>
        )}

        <button 
          onClick={mode === 'ml' ? handleMLPredict : handleRecommend}
          disabled={loading || (mode === 'genai' && !crop)}
          className={`w-full font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            mode === 'ml' 
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-xl hover:shadow-red-500/20' 
            : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-xl hover:shadow-orange-500/20'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" /> : (mode === 'ml' ? <Activity /> : <FlaskConical />)}
          {loading ? t.analyzing : (mode === 'ml' ? t.predictFert : t.genPlan)}
        </button>
      </div>

      {/* Results Section */}
      {mode === 'ml' ? (
         <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {mlResult && (
               <div className="bg-white rounded-3xl p-8 shadow-lg border border-orange-100 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/3 flex justify-center">
                     <div className="w-40 h-40 bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                        <Sprout size={80} className="text-orange-500" />
                     </div>
                  </div>
                  <div className="w-full md:w-2/3 space-y-4 text-center md:text-left">
                     <div className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full w-fit mx-auto md:mx-0 flex items-center gap-1">
                        <Activity size={12} /> {t.predictionResult}
                     </div>
                     <h3 className="text-4xl font-bold text-gray-800 capitalize">{mlResult.prediction}</h3>
                     <div className="flex items-center justify-center md:justify-start gap-4">
                        <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                           <span className="block text-xs text-green-600 font-bold uppercase">{t.confidence}</span>
                           <span className="text-xl font-bold text-green-700">{(mlResult.details.confidence * 100).toFixed(1)}%</span>
                        </div>
                     </div>
                     <p className="text-gray-500 text-sm">
                        Based on your NPK values ({mlParams.nitrogen}, {mlParams.phosphorus}, {mlParams.potassium}), 
                        our model identifies <strong>{mlResult.prediction}</strong> as the most suitable fertilizer type.
                     </p>
                  </div>
               </div>
            )}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 flex flex-col h-full hover:border-yellow-300 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                <div className="p-2 bg-green-50 rounded-full text-green-600 group-hover:bg-green-100 transition-colors">
                  <Leaf size={20} />
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
              </div>
              
              <div className="mt-auto space-y-4">
                <div className="bg-yellow-50 rounded-xl p-4 space-y-4 border border-yellow-100">
                  {/* Frequency Section */}
                  <div className="flex gap-4 items-start">
                      <div className="bg-white p-2 rounded-lg text-yellow-600 shadow-sm shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t.appFreq}</h4>
                        <p className="text-gray-900 font-medium text-sm">{plan.applicationFrequency}</p>
                      </div>
                  </div>

                  <div className="h-px bg-yellow-200 w-full opacity-50"></div>

                  {/* Dosage Section */}
                  <div className="flex gap-4 items-start">
                      <div className="bg-white p-2 rounded-lg text-yellow-600 shadow-sm shrink-0">
                        <Scale size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t.dosage}</h4>
                        <p className="text-gray-900 font-medium text-sm">{plan.dosage}</p>
                      </div>
                  </div>
                </div>

                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-red-700 font-bold text-xs uppercase tracking-wide">
                      <AlertCircle size={14} />
                      <span>{t.warnings}</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.warnings.map((w, i) => (
                        <li key={i} className="flex gap-2 text-xs text-red-800 leading-snug">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FertilizerAdvisor;
