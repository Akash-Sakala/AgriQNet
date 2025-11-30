
import React, { useState } from 'react';
import { Leaf, Phone, Lock, User, MapPin, ArrowRight, Loader2, CheckCircle, ShieldCheck, AlertTriangle, ChevronDown, MonitorPlay } from 'lucide-react';
import { Language, Farmer } from '../types';
import { getTranslation } from '../utils/translations';
import { TwilioService } from '../services/twilioService';
import { DBService } from '../services/dbService';

interface AuthPageProps {
  lang: Language;
  onLogin: (user: Farmer) => void;
}

const COUNTRIES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
];

const AuthPage: React.FC<AuthPageProps> = ({ lang, onLogin }) => {
  const t = getTranslation(lang);
  const [view, setView] = useState<'login' | 'signup' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Country Code State
  const [countryCode, setCountryCode] = useState('+91');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '', // This will hold only the 10 digit number
    password: ''
  });
  
  // OTP State
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [mockOtpDisplay, setMockOtpDisplay] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const getFullPhoneNumber = () => {
    return `${countryCode}${formData.phone}`;
  };

  const handleDemoLogin = () => {
    const demoUser: Farmer = {
        id: 'demo-user',
        name: 'Demo Farmer',
        location: 'Green Valley',
        phone: '+910000000000',
        password: ''
    };
    DBService.cacheUser(demoUser);
    onLogin(demoUser);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const fullPhone = getFullPhoneNumber();

    // Simulate slight network delay
    setTimeout(async () => {
      const user = await DBService.verifyLogin(fullPhone, formData.password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid credentials or user not found.");
      }
      setLoading(false);
    }, 800);
  };

  const handleSignupStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMockOtpDisplay(null);

    const fullPhone = getFullPhoneNumber();

    // Basic Validation
    if (formData.phone.length < 4) {
        setError("Please enter a valid phone number.");
        setLoading(false);
        return;
    }

    // Check DB for existing user
    const existingUser = await DBService.findUserByPhone(fullPhone);
    if (existingUser) {
      setError(t.userExists);
      setLoading(false);
      return;
    }

    // Send OTP with specific context message
    const authMessage = "AgriQNet Authentication Service";
    const result = await TwilioService.sendOTP(fullPhone, authMessage);
    
    if (result.success && result.otp) {
      setGeneratedOtp(result.otp);
      setView('otp');
      
      // If API failed (Mock Mode), show the OTP to the user so they aren't blocked
      if (result.isMock) {
        setMockOtpDisplay(result.otp);
      }
    } else {
      setError("Failed to send OTP. Please check the number format.");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (otp === generatedOtp) {
      // Register User
      const fullPhone = getFullPhoneNumber();
      
      const newUser: Farmer = {
        id: Date.now().toString(),
        name: formData.name,
        location: formData.location,
        phone: fullPhone,
        password: formData.password
      };
      
      await DBService.createUser(newUser);
      DBService.cacheUser(newUser); // Auto login
      
      // Show success briefly
      setTimeout(() => {
        onLogin(newUser);
      }, 500);
    } else {
      setError(t.invalidOtp);
      setLoading(false);
    }
  };

  // Helper component for Country Dropdown
  const CountrySelect = () => (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsCountryOpen(!isCountryOpen)}
        className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-l-xl px-3 py-3 h-full text-gray-900 font-medium hover:bg-gray-200 transition-colors"
      >
        <span>{COUNTRIES.find(c => c.code === countryCode)?.flag}</span>
        <span>{countryCode}</span>
        <ChevronDown size={14} className="text-gray-500" />
      </button>

      {isCountryOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in zoom-in-95 duration-200">
          {COUNTRIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setCountryCode(c.code);
                setIsCountryOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-agri-50 flex items-center gap-2 text-sm text-gray-900"
            >
              <span>{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="text-gray-500 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agri-50 to-blue-50 p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Left Side: Visuals */}
        <div className="w-full md:w-1/2 bg-agri-600 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-agri-600 shadow-lg">
                <Leaf size={28} />
              </div>
              <span className="text-3xl font-bold tracking-tight">AgriQNet</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">{t.welcomeAgri}</h1>
            <p className="text-agri-100 text-lg">{t.authDesc}</p>
          </div>

          <div className="mt-12 space-y-4 relative z-10">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="text-agri-200" size={24} />
              <div>
                <h3 className="font-bold">Secure Verification</h3>
                <p className="text-xs text-agri-100">Powered by Twilio</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <CheckCircle className="text-agri-200" size={24} />
              <div>
                <h3 className="font-bold">Database</h3>
                <p className="text-xs text-agri-100">Secure Cloud Storage (MongoDB Atlas)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center">
          {view === 'login' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.login}</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">{t.phone}</label>
                  <div className="flex relative">
                    <CountrySelect />
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-4 p-3 bg-gray-50 border border-gray-200 border-l-0 rounded-r-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">{t.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-agri-600 text-white py-3.5 rounded-xl font-bold hover:bg-agri-700 transition-colors shadow-lg hover:shadow-agri-500/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : t.login}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => setView('signup')} className="text-agri-600 font-semibold hover:underline">
                  {t.newFarmer}
                </button>
              </div>
            </div>
          )}

          {view === 'signup' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.signup}</h2>
               <form onSubmit={handleSignupStart} className="space-y-4">
                 {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                 
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-gray-600">{t.fullName}</label>
                   <div className="relative">
                     <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                     <input 
                       type="text" 
                       name="name"
                       value={formData.name}
                       onChange={handleInputChange}
                       className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                       required
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-gray-600">{t.location}</label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                     <input 
                       type="text" 
                       name="location"
                       value={formData.location}
                       onChange={handleInputChange}
                       className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                       required
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600">{t.phone}</label>
                      <div className="flex relative">
                        <CountrySelect />
                        <input 
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full pl-4 p-3 bg-gray-50 border border-gray-200 border-l-0 rounded-r-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                            placeholder="Mobile Number"
                            required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-600">{t.password}</label>
                      <input 
                        type="password" 
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-agri-500 outline-none transition-all text-gray-900 font-medium"
                        required
                      />
                    </div>
                 </div>

                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full bg-agri-600 text-white py-3.5 rounded-xl font-bold hover:bg-agri-700 transition-colors shadow-lg hover:shadow-agri-500/30 flex items-center justify-center gap-2"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : t.sendOtp} <ArrowRight size={18} />
                 </button>
               </form>
               <div className="mt-6 text-center">
                 <button onClick={() => setView('login')} className="text-agri-600 font-semibold hover:underline">
                   {t.haveAccount}
                 </button>
               </div>
             </div>
          )}

          {view === 'otp' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.enterOtp}</h2>
                <p className="text-gray-500 mb-6">{t.otpSent} <span className="font-bold text-gray-800">{getFullPhoneNumber()}</span></p>

                {/* DEMO MODE BANNER - Appears if Twilio Fails */}
                {mockOtpDisplay && (
                  <div className="mb-6 mx-auto max-w-sm p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-left shadow-sm flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-yellow-800 mb-1">Demo / Simulation Mode</p>
                      <p className="text-xs text-yellow-700 mb-2 leading-relaxed">
                        SMS sending failed due to Twilio account restrictions (Trial/Region). 
                        Use this code to verify:
                      </p>
                      <div className="inline-block bg-white px-3 py-1 rounded border border-yellow-300 font-mono font-bold text-yellow-900 tracking-widest select-all">
                        {mockOtpDisplay}
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">{error}</div>}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-3xl font-bold tracking-[0.5em] p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : t.verifyRegister}
                  </button>
                </form>
                
                <button onClick={() => setView('signup')} className="mt-6 text-sm text-gray-400 hover:text-gray-600">
                  Wrong number? Go back
                </button>
             </div>
          )}

          {/* Demo Button */}
          {view !== 'otp' && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center">
               <button 
                  onClick={handleDemoLogin}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full text-sm transition-all hover:scale-105 active:scale-95"
               >
                  <MonitorPlay size={16} />
                  <span>Try Demo Mode (Skip Login)</span>
               </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
