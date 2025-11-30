
import React, { useState } from 'react';
import { CloudRain, ExternalLink, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

interface SmartWeatherProps {
  lang: Language;
}

const SmartWeather: React.FC<SmartWeatherProps> = ({ lang }) => {
  const t = getTranslation(lang);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
               <CloudRain size={24} />
             </div>
             {t.weatherStationTitle}
          </h2>
          <p className="text-gray-500 mt-1 ml-14">{t.weatherStationDesc}</p>
        </div>
        
        <a 
          href="https://weather-app-kker.onrender.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30 font-bold"
        >
          {t.launchWeather}
          <ExternalLink size={18} />
        </a>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">{t.loadingWeather}</p>
          </div>
        )}
        <iframe 
          src="https://weather-app-kker.onrender.com" 
          className="w-full h-full border-0"
          title="Smart Weather Station"
          onLoad={() => setIsLoading(false)}
          allow="geolocation; microphone; camera"
        />
      </div>
    </div>
  );
};

export default SmartWeather;
