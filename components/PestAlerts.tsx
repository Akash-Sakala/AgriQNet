
import React, { useState, useRef } from 'react';
import { Siren, ExternalLink, ShieldAlert, Upload, Loader2, ScanLine, Bug, AlertTriangle, CheckCircle, WifiOff, BellRing, Phone, ChevronDown, MapPin, Send, Radio, X } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { GeminiService } from '../services/geminiService';
import { TwilioService } from '../services/twilioService';
import { DBService } from '../services/dbService';

interface PestAlertsProps {
  lang: Language;
}

// Karnataka Districts Adjacency List
const KARNATAKA_ADJACENCY: Record<string, string[]> = {
    "Bagalkot": ["Belagavi", "Gadag", "Koppal", "Raichur", "Vijayapura"],
    "Ballari": ["Chitradurga", "Vijayanagara"],
    "Belagavi": ["Bagalkot", "Dharwad", "Gadag", "Uttara Kannada", "Vijayapura"],
    "Bengaluru Rural": ["Bengaluru Urban", "Chikkaballapura", "Ramanagara", "Tumakuru"],
    "Bengaluru Urban": ["Bengaluru Rural", "Ramanagara"],
    "Bidar": ["Kalaburagi"],
    "Chamarajanagara": ["Mandya", "Mysuru", "Ramanagara"],
    "Chikkaballapura": ["Bengaluru Rural", "Kolar", "Tumakuru"],
    "Chikkamagaluru": ["Chitradurga", "Dakshina Kannada", "Davanagere", "Hassan", "Shivamogga", "Tumakuru", "Udupi"],
    "Chitradurga": ["Ballari", "Chikkamagaluru", "Davanagere", "Tumakuru", "Vijayanagara"],
    "Dakshina Kannada": ["Chikkamagaluru", "Hassan", "Kodagu", "Udupi"],
    "Davanagere": ["Chikkamagaluru", "Chitradurga", "Haveri", "Shivamogga", "Vijayanagara"],
    "Dharwad": ["Belagavi", "Gadag", "Haveri", "Uttara Kannada"],
    "Gadag": ["Bagalkot", "Belagavi", "Dharwad", "Haveri", "Koppal", "Vijayanagara"],
    "Hassan": ["Chikkamagaluru", "Dakshina Kannada", "Kodagu", "Mandya", "Mysuru", "Tumakuru"],
    "Haveri": ["Davanagere", "Dharwad", "Gadag", "Shivamogga", "Uttara Kannada", "Vijayanagara"],
    "Kalaburagi": ["Bidar", "Vijayapura", "Yadgir"],
    "Kodagu": ["Dakshina Kannada", "Hassan", "Mysuru"],
    "Kolar": ["Chikkaballapura", "Bengaluru Rural"],
    "Koppal": ["Bagalkot", "Gadag", "Raichur", "Vijayanagara"],
    "Mandya": ["Chamarajanagara", "Hassan", "Mysuru", "Ramanagara", "Tumakuru"],
    "Mysuru": ["Chamarajanagara", "Hassan", "Kodagu", "Mandya"],
    "Raichur": ["Bagalkot", "Koppal", "Yadgir"],
    "Ramanagara": ["Bengaluru Rural", "Bengaluru Urban", "Chamarajanagara", "Mandya", "Tumakuru"],
    "Shivamogga": ["Chikkamagaluru", "Davanagere", "Haveri", "Udupi", "Uttara Kannada"],
    "Tumakuru": ["Bengaluru Rural", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Hassan", "Mandya", "Ramanagara"],
    "Udupi": ["Chikkamagaluru", "Dakshina Kannada", "Shivamogga", "Uttara Kannada"],
    "Uttara Kannada": ["Belagavi", "Dharwad", "Haveri", "Shivamogga", "Udupi"],
    "Vijayanagara": ["Ballari", "Chitradurga", "Davanagere", "Gadag", "Haveri", "Koppal"],
    "Vijayapura": ["Bagalkot", "Belagavi", "Kalaburagi", "Raichur", "Yadgir"],
    "Yadgir": ["Kalaburagi", "Raichur", "Vijayapura"]
};

const DISTRICTS = Object.keys(KARNATAKA_ADJACENCY).sort();

const COUNTRIES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
];

const PestAlerts: React.FC<PestAlertsProps> = ({ lang }) => {
  const t = getTranslation(lang);
  
  // Pest Detection State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<{pestType: string, confidence: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscription State
  const [subStep, setSubStep] = useState<'idle' | 'input' | 'otp' | 'success'>('idle');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [subForm, setSubForm] = useState({
    countryCode: '+91',
    phone: '',
    district: ''
  });
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [mockOtpDisplay, setMockOtpDisplay] = useState<string | null>(null);

  // Alert System State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertDistrict, setAlertDistrict] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [affectedStats, setAffectedStats] = useState({ red: 0, orange: 0, yellow: 0 });
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setDetectionResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetect = async () => {
    if (!preview) return;
    setLoading(true);
    setDetectionResult(null);
    setError(null);

    try {
      // Extract base64 part
      const base64Data = preview.split(',')[1];
      const result = await GeminiService.analyzePestImage(base64Data, lang);
      
      setDetectionResult({
        pestType: result.pestName,
        confidence: result.confidence
      });
    } catch (error) {
      console.error("Pest Detection Error:", error);
      setError("AI Analysis failed. Please try a clearer image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeStart = async () => {
    setSubError('');
    if (!subForm.phone || subForm.phone.length < 10) {
      setSubError("Please enter a valid mobile number.");
      return;
    }
    if (!subForm.district) {
      setSubError("Please select a district.");
      return;
    }

    setSubLoading(true);
    const fullPhone = `${subForm.countryCode}${subForm.phone}`;
    
    // Verification message per prompt requirements
    const verificationMessage = "AgriQNet Pest Alerts Subscription Service";

    const result = await TwilioService.sendOTP(fullPhone, verificationMessage);

    if (result.success && result.otp) {
      setGeneratedOtp(result.otp);
      setSubStep('otp');
      if (result.isMock) {
        setMockOtpDisplay(result.otp);
      }
    } else {
      setSubError("Failed to send OTP. Please check the number.");
    }
    setSubLoading(false);
  };

  const handleVerifySub = () => {
    if (otpInput === generatedOtp) {
      setSubLoading(true);
      const fullPhone = `${subForm.countryCode}${subForm.phone}`;
      
      // Save to persistent hash map storage
      DBService.addPestSubscriber(subForm.district, fullPhone);
      
      setTimeout(() => {
        setSubStep('success');
        setSubLoading(false);
      }, 500);
    } else {
      setSubError("Invalid OTP. Please try again.");
    }
  };

  const resetSubscription = () => {
    setSubStep('idle');
    setSubForm({ countryCode: '+91', phone: '', district: '' });
    setOtpInput('');
    setSubError('');
    setMockOtpDisplay(null);
  };

  // --- Alert System Logic ---

  const calculateZones = (center: string) => {
    const redZone = [center];
    const orangeZone = KARNATAKA_ADJACENCY[center] || [];
    
    const yellowZone = new Set<string>();
    orangeZone.forEach(neighbor => {
        const neighborsOfNeighbor = KARNATAKA_ADJACENCY[neighbor] || [];
        neighborsOfNeighbor.forEach(n => {
            if (n !== center && !orangeZone.includes(n)) {
                yellowZone.add(n);
            }
        });
    });

    return {
        red: redZone,
        orange: orangeZone,
        yellow: Array.from(yellowZone)
    };
  };

  const handleBroadcast = async () => {
    if (!alertDistrict || !detectionResult) return;
    setBroadcastStatus('sending');
    setIsSimulationMode(false);

    const zones = calculateZones(alertDistrict);
    const subscribers = DBService.getPestSubscribers();
    
    let redCount = 0;
    let orangeCount = 0;
    let yellowCount = 0;
    let simulated = false;

    // Send to Red Zone (Critical)
    for (const district of zones.red) {
        const phones = subscribers[district] || [];
        for (const phone of phones) {
            const msg = `[AgriQNet ALERT] RED ZONE: Critical ${detectionResult.pestType} outbreak detected in ${district}. Take immediate action!`;
            const res = await TwilioService.sendSms(phone, msg);
            if (res.success) redCount++;
            if (res.isMock) simulated = true;
        }
    }

    // Send to Orange Zone (High Risk)
    for (const district of zones.orange) {
        const phones = subscribers[district] || [];
        for (const phone of phones) {
            const msg = `[AgriQNet WARNING] ORANGE ZONE: ${detectionResult.pestType} detected in neighbor ${alertDistrict}. Be vigilant!`;
            const res = await TwilioService.sendSms(phone, msg);
             if (res.success) orangeCount++;
             if (res.isMock) simulated = true;
        }
    }

    // Send to Yellow Zone (Precautionary)
    for (const district of zones.yellow) {
        const phones = subscribers[district] || [];
        for (const phone of phones) {
            const msg = `[AgriQNet ADVISORY] YELLOW ZONE: ${detectionResult.pestType} activity reported in nearby districts. Monitor crops.`;
            const res = await TwilioService.sendSms(phone, msg);
             if (res.success) yellowCount++;
             if (res.isMock) simulated = true;
        }
    }

    setIsSimulationMode(simulated);
    setAffectedStats({ red: redCount, orange: orangeCount, yellow: yellowCount });
    setBroadcastStatus('success');
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto pb-8">
      
      {/* Top Section - External Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
             <div className="bg-red-100 p-2 rounded-xl text-red-600">
               <Siren size={24} />
             </div>
             {t.pestAlertsTitle}
          </h2>
          <p className="text-gray-500 mt-1 ml-14 max-w-lg">{t.pestAlertsDesc}</p>
        </div>
        
        <a 
          href="http://localhost:3001/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/30 font-bold shrink-0"
        >
          {t.launchPestAlerts}
          <ExternalLink size={18} />
        </a>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
         <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
            <ShieldAlert size={48} className="text-red-400" />
         </div>
         <h3 className="text-xl font-bold text-gray-800 mb-2">{t.pestAlertsTitle}</h3>
         <p className="text-gray-500 max-w-md mb-4 leading-relaxed text-sm">
           The real-time pest monitoring system is running on a dedicated local server. 
           Please click the button above to access the full dashboard in a new window.
         </p>
      </div>
      
      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Instant Pest Identification Section */}
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 relative">
         <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
               <ScanLine size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-bold text-gray-800">{t.pestDetectTitle}</h2>
               <p className="text-gray-500">{t.pestDetectDesc}</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Upload Area */}
            <div className="flex flex-col gap-4">
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all h-64 relative overflow-hidden group ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:bg-orange-50 hover:border-orange-300'}`}
               >
                  {preview ? (
                     <>
                        <img src={preview} alt="Selected" className="absolute inset-0 w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                             <Upload size={16} /> {t.changePhoto}
                           </span>
                        </div>
                     </>
                  ) : (
                     <>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${error ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-600'}`}>
                           {error ? <WifiOff size={32} /> : <Upload size={32} />}
                        </div>
                        <p className={`font-medium ${error ? 'text-red-600' : 'text-gray-600'}`}>{error ? "Analysis Failed" : t.upload}</p>
                        <p className="text-xs text-gray-400 mt-1">{error ? "Click to retry" : "Supports JPG, PNG"}</p>
                     </>
                  )}
               </div>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
               />
               
               {error && (
                 <div className="text-xs text-red-500 text-center px-4">
                    {error}
                 </div>
               )}

               <button 
                  onClick={handleDetect}
                  disabled={!selectedFile || loading}
                  className={`py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md ${
                     !selectedFile || loading
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-500/30'
                  }`}
               >
                  {loading ? <Loader2 className="animate-spin" /> : <Bug size={20} />}
                  {loading ? t.detecting : t.analyzeImage}
               </button>
            </div>

            {/* Right: Results Area */}
            <div className="flex flex-col justify-center">
               {!detectionResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center min-h-[250px]">
                     <ScanLine size={48} className="mb-4 opacity-20" />
                     <p>Upload an image and click analyze to see detection results here.</p>
                  </div>
               ) : (
                  <div className="bg-white border border-orange-100 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                           <Bug size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold uppercase tracking-wide">{t.pestDetected}</h3>
                     </div>
                     <div className="p-8 space-y-6">
                        <div className="text-center">
                           <p className="text-sm text-gray-500 font-bold uppercase mb-1">Identified As</p>
                           <h2 className="text-4xl font-bold text-gray-800 capitalize">{detectionResult.pestType}</h2>
                        </div>
                        
                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <CheckCircle className="text-green-600" size={20} />
                              <span className="text-green-800 font-bold">{t.confidenceScore}</span>
                           </div>
                           <span className="text-2xl font-bold text-green-600">
                              {(detectionResult.confidence * 100).toFixed(1)}%
                           </span>
                        </div>

                        <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col gap-3">
                           <div className="flex gap-2 items-start">
                             <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                             <p className="text-sm text-red-800 leading-snug font-bold">
                                Action Required: Send an alert to registered farmers in the affected region immediately.
                             </p>
                           </div>
                           <button 
                             onClick={() => {
                                 setAlertDistrict('');
                                 setBroadcastStatus('idle');
                                 setIsAlertModalOpen(true);
                             }}
                             className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                           >
                             <Radio size={18} className="animate-pulse" />
                             {t.broadcastAlert}
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Pest Alert Subscription Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl shadow-lg border border-indigo-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <BellRing size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pest Alert System</h2>
            <p className="text-gray-500">Subscribe for SMS alerts on pest outbreaks in your district.</p>
          </div>
        </div>

        {subStep === 'success' ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-green-100 text-center animate-in zoom-in-95">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">Subscription Confirmed!</h3>
             <p className="text-gray-600 mb-6">
               You will receive real-time pest alerts for <strong>{subForm.district}</strong> at <strong>{subForm.countryCode}{subForm.phone}</strong>.
             </p>
             <button onClick={resetSubscription} className="text-indigo-600 font-bold hover:underline">
               Register another number
             </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-100 max-w-2xl mx-auto">
             {subStep === 'idle' || subStep === 'input' ? (
               <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400"/> District (Karnataka)
                    </label>
                    <div className="relative">
                      <select 
                        value={subForm.district}
                        onChange={(e) => setSubForm({...subForm, district: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-gray-900"
                      >
                        <option value="">Select District</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                    </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                     <Phone size={16} className="text-gray-400"/> Phone Number
                   </label>
                   <div className="flex relative h-12">
                      {/* Country Dropdown */}
                      <div className="relative h-full">
                        <button 
                          type="button"
                          onClick={() => setIsCountryOpen(!isCountryOpen)}
                          className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-l-xl px-3 h-full text-gray-900 font-medium hover:bg-gray-200 transition-colors"
                        >
                          <span>{COUNTRIES.find(c => c.code === subForm.countryCode)?.flag}</span>
                          <span>{subForm.countryCode}</span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </button>

                        {isCountryOpen && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {COUNTRIES.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  setSubForm({...subForm, countryCode: c.code});
                                  setIsCountryOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-2 text-sm text-gray-900"
                              >
                                <span>{c.flag}</span>
                                <span className="font-medium">{c.code}</span>
                                <span className="text-gray-500 truncate">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <input 
                        type="tel" 
                        value={subForm.phone}
                        onChange={(e) => setSubForm({...subForm, phone: e.target.value})}
                        placeholder="Mobile Number"
                        className="flex-1 pl-4 p-3 bg-gray-50 border border-gray-200 border-l-0 rounded-r-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium h-full"
                      />
                   </div>
                 </div>

                 {subError && <p className="text-red-500 text-sm font-medium">{subError}</p>}

                 <button 
                   onClick={handleSubscribeStart}
                   disabled={subLoading}
                   className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                 >
                   {subLoading ? <Loader2 className="animate-spin" /> : "Subscribe to Pest Alerts"}
                 </button>
               </div>
             ) : (
               <div className="text-center space-y-6">
                 <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                   <ShieldAlert size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-800">Verify Your Number</h3>
                 <p className="text-gray-500 text-sm">
                   Enter the code sent to <strong>{subForm.countryCode}{subForm.phone}</strong>
                 </p>

                 {mockOtpDisplay && (
                  <div className="mx-auto max-w-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left shadow-sm">
                    <p className="text-xs text-yellow-800 mb-1 font-bold">Demo Mode (Backend Unavailable):</p>
                    <p className="text-xs text-yellow-700">Use code: <span className="font-mono font-bold">{mockOtpDisplay}</span></p>
                  </div>
                 )}

                 <input 
                    type="text" 
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-full text-center text-2xl font-bold tracking-[0.5em] p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                    placeholder="••••••"
                    maxLength={6}
                 />

                 {subError && <p className="text-red-500 text-sm font-medium">{subError}</p>}

                 <div className="flex gap-3">
                   <button 
                     onClick={() => setSubStep('input')}
                     className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                   >
                     Back
                   </button>
                   <button 
                     onClick={handleVerifySub}
                     disabled={subLoading}
                     className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2"
                   >
                     {subLoading ? <Loader2 className="animate-spin" /> : "Verify & Subscribe"}
                   </button>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* ALERT BROADCAST MODAL */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <button 
                 onClick={() => setIsAlertModalOpen(false)}
                 className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <X size={24} />
              </button>
              
              <div className="p-8">
                 {broadcastStatus === 'idle' ? (
                   <>
                      <div className="flex items-center gap-3 mb-6">
                         <div className="bg-red-100 p-3 rounded-full text-red-600">
                           <Radio size={28} />
                         </div>
                         <h3 className="text-2xl font-bold text-gray-900">{t.broadcastAlert}</h3>
                      </div>
                      
                      <p className="text-gray-600 mb-6">
                        Select the epicenter district. Alerts will be automatically sent to the affected zones based on proximity.
                      </p>
                      
                      <div className="space-y-4 mb-8">
                         <label className="block text-sm font-semibold text-gray-700">Affected District (Epicenter)</label>
                         <div className="relative">
                            <select 
                                value={alertDistrict}
                                onChange={(e) => setAlertDistrict(e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none text-gray-900 font-medium"
                            >
                                <option value="">Select District</option>
                                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={20} />
                         </div>
                      </div>
                      
                      {alertDistrict && (
                        <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-100">
                           <h4 className="font-bold text-red-800 text-sm mb-2">Zone Projections:</h4>
                           <ul className="space-y-1 text-sm text-red-700">
                              <li>🔴 <strong>Red Zone:</strong> {alertDistrict}</li>
                              <li>🟠 <strong>Orange Zone:</strong> {KARNATAKA_ADJACENCY[alertDistrict]?.length || 0} neighboring districts</li>
                              <li>🟡 <strong>Yellow Zone:</strong> 2nd degree neighbors</li>
                           </ul>
                        </div>
                      )}

                      <button 
                         onClick={handleBroadcast}
                         disabled={!alertDistrict}
                         className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         <Send size={20} />
                         Confirm & Send Alerts
                      </button>
                   </>
                 ) : broadcastStatus === 'sending' ? (
                    <div className="flex flex-col items-center justify-center py-12">
                       <Loader2 size={64} className="text-red-500 animate-spin mb-6" />
                       <h3 className="text-xl font-bold text-gray-800">Broadcasting Alerts...</h3>
                       <p className="text-gray-500 mt-2">Connecting to subscriber network</p>
                    </div>
                 ) : (
                    <div className="text-center py-8">
                       <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CheckCircle size={40} />
                       </div>
                       <h3 className="text-2xl font-bold text-gray-900 mb-2">Alerts Sent Successfully!</h3>
                       <p className="text-gray-500 mb-4">
                          Notifications have been dispatched to all registered farmers in the danger zones.
                       </p>
                       
                       {isSimulationMode && (
                           <div className="bg-yellow-50 text-yellow-800 text-xs font-bold p-2 rounded mb-6 border border-yellow-200">
                               Note: Backend unavailable. Alerts were simulated locally.
                           </div>
                       )}

                       <div className="grid grid-cols-3 gap-3 mb-8">
                          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                             <div className="text-2xl font-bold text-red-600">{affectedStats.red}</div>
                             <div className="text-xs text-red-800 font-bold uppercase">Red Zone</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                             <div className="text-2xl font-bold text-orange-600">{affectedStats.orange}</div>
                             <div className="text-xs text-orange-800 font-bold uppercase">Orange Zone</div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                             <div className="text-2xl font-bold text-yellow-600">{affectedStats.yellow}</div>
                             <div className="text-xs text-yellow-800 font-bold uppercase">Yellow Zone</div>
                          </div>
                       </div>

                       <button 
                          onClick={() => setIsAlertModalOpen(false)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-bold transition-colors"
                       >
                          Close
                       </button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default PestAlerts;
