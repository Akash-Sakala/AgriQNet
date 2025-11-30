
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sprout, FlaskConical, Bug, MessageCircle, Menu, X, Leaf, Globe, HelpCircle, CloudRain, Siren, LogOut, User } from 'lucide-react';
import { NavView, Language, Farmer } from './types';
import { TRANSLATIONS, LANGUAGES } from './utils/translations';
import Dashboard from './components/Dashboard';
import CropAdvisor from './components/CropAdvisor';
import FertilizerAdvisor from './components/FertilizerAdvisor';
import PestControl from './components/PestControl';
import ChatModule from './components/ChatModule';
import SmartWeather from './components/SmartWeather';
import PestAlerts from './components/PestAlerts';
import TourGuide, { TourStep } from './components/TourGuide';
import AuthPage from './components/AuthPage';
import { DBService } from './services/dbService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [activeLang, setActiveLang] = useState<Language>('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<Farmer | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const t = TRANSLATIONS[activeLang];

  useEffect(() => {
    const cachedUser = DBService.getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLogout = () => {
    DBService.logout();
    setUser(null);
  };

  const navItems: {id: NavView, label: string, icon: any}[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'weather_station', label: t.weatherStation, icon: CloudRain },
    { id: 'crops', label: t.cropAdvisor, icon: Sprout },
    { id: 'fertilizer', label: t.fertilizers, icon: FlaskConical },
    { id: 'pests', label: t.pestControl, icon: Bug },
    { id: 'pest_alerts', label: t.pestAlerts, icon: Siren },
    { id: 'chat', label: t.chat, icon: MessageCircle },
  ];

  const tourSteps: TourStep[] = [
    { targetId: 'lang-selector', titleKey: 'tourStep1Title', descKey: 'tourStep1Desc' },
    { targetId: 'nav-item-dashboard', titleKey: 'tourStep2Title', descKey: 'tourStep2Desc' },
    { targetId: 'weather-widget-container', titleKey: 'tourStep3Title', descKey: 'tourStep3Desc' },
    { targetId: 'nav-item-weather_station', titleKey: 'tourStep9Title', descKey: 'tourStep9Desc' },
    { targetId: 'nav-item-crops', titleKey: 'tourStep4Title', descKey: 'tourStep4Desc' },
    { targetId: 'nav-item-fertilizer', titleKey: 'tourStep5Title', descKey: 'tourStep5Desc' },
    { targetId: 'nav-item-pests', titleKey: 'tourStep6Title', descKey: 'tourStep6Desc' },
    { targetId: 'nav-item-pest_alerts', titleKey: 'tourStep7Title', descKey: 'tourStep7Desc' },
    { targetId: 'nav-item-chat', titleKey: 'tourStep8Title', descKey: 'tourStep8Desc' },
    { targetId: 'nav-item-dashboard', titleKey: 'tourStep10Title', descKey: 'tourStep10Desc' },
  ];

  const handleTourStepChange = (stepIndex: number) => {
    // Automatically switch views to show the component being explained
    const step = tourSteps[stepIndex];
    if (step.targetId.includes('weather') && !step.targetId.includes('widget') && activeView !== 'weather_station') {
        setActiveView('weather_station');
    } else if (step.targetId.includes('widget') && activeView !== 'dashboard') {
        setActiveView('dashboard');
    } else if (step.targetId.includes('crops') && activeView !== 'crops') {
        setActiveView('crops');
    } else if (step.targetId.includes('fertilizer') && activeView !== 'fertilizer') {
        setActiveView('fertilizer');
    } else if (step.targetId.includes('pests') && activeView !== 'pests') {
        setActiveView('pests');
    } else if (step.targetId.includes('pest_alerts') && activeView !== 'pest_alerts') {
        setActiveView('pest_alerts');
    } else if (step.targetId.includes('chat') && activeView !== 'chat') {
        setActiveView('chat');
    } else if (stepIndex === tourSteps.length - 1) {
        // Return home at last step
        setActiveView('dashboard');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard lang={activeLang} user={user} />;
      case 'weather_station': return <SmartWeather lang={activeLang} />;
      case 'crops': return <CropAdvisor lang={activeLang} />;
      case 'fertilizer': return <FertilizerAdvisor lang={activeLang} />;
      case 'pests': return <PestControl lang={activeLang} />;
      case 'pest_alerts': return <PestAlerts lang={activeLang} />;
      case 'chat': return <ChatModule lang={activeLang} />;
      default: return <Dashboard lang={activeLang} user={user} />;
    }
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-agri-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <AuthPage lang={activeLang} onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <TourGuide 
        steps={tourSteps} 
        isOpen={isTourOpen} 
        onClose={() => setIsTourOpen(false)} 
        lang={activeLang} 
        onStepChange={handleTourStepChange}
      />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 h-screen sticky top-0 p-6 z-20">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-agri-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-agri-200">
            <Leaf size={24} />
          </div>
          <span className="text-2xl font-bold text-agri-900 tracking-tight">AgriQNet</span>
        </div>

        {/* User Profile Snippet */}
        <div className="mb-8 p-4 bg-agri-50 rounded-2xl flex items-center gap-3 border border-agri-100">
           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-agri-600 font-bold border border-agri-200">
              {user.name.charAt(0)}
           </div>
           <div className="overflow-hidden">
             <p className="font-bold text-gray-800 text-sm truncate">{user.name}</p>
             <p className="text-xs text-gray-500 truncate">{user.location}</p>
           </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              id={`nav-item-${item.id}`}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                activeView === item.id 
                  ? 'bg-agri-50 text-agri-700 font-bold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={22} className={`transition-colors ${activeView === item.id ? 'text-agri-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="mt-4 flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors font-medium">
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white z-30 px-6 py-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-agri-600 rounded-lg flex items-center justify-center text-white">
              <Leaf size={18} />
            </div>
            <span className="text-xl font-bold text-agri-900">AgriQNet</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
           {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-white pt-20 px-6 animate-in slide-in-from-top-10 duration-200">
           <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-agri-600 font-bold">
                 {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.location}</p>
              </div>
           </div>
           <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg ${
                  activeView === item.id 
                    ? 'bg-agri-50 text-agri-700 font-bold' 
                    : 'text-gray-600'
                }`}
              >
                <item.icon size={24} className={activeView === item.id ? 'text-agri-600' : 'text-gray-400'} />
                {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg text-red-500 hover:bg-red-50">
               <LogOut size={24} />
               Logout
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-6 mt-16 lg:mt-0 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{navItems.find(n => n.id === activeView)?.label}</h1>
             <p className="text-gray-500 text-sm mt-1">Smart agricultural insights powered by Gemini AI</p>
           </div>
           
           <div className="flex items-center gap-3">
             {/* Take Tour Button */}
             <button
               onClick={() => setIsTourOpen(true)}
               className="flex items-center gap-2 bg-agri-100 px-4 py-2.5 rounded-xl text-agri-800 hover:bg-agri-200 transition-colors shadow-sm font-medium text-sm"
             >
               <HelpCircle size={18} />
               {t.takeTour}
             </button>

             {/* Language Selector */}
             <div className="relative" id="lang-selector">
               <button 
                 onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                 className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-agri-400 hover:text-agri-700 transition-colors shadow-sm"
               >
                 <Globe size={18} />
                 <span className="font-medium text-sm">{LANGUAGES[activeLang]}</span>
               </button>
               
               {isLangMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                   {(Object.keys(LANGUAGES) as Language[]).map((code) => (
                     <button
                       key={code}
                       onClick={() => {
                         setActiveLang(code);
                         setIsLangMenuOpen(false);
                       }}
                       className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                         activeLang === code 
                           ? 'bg-agri-50 text-agri-700' 
                           : 'text-gray-600 hover:bg-gray-50'
                       }`}
                     >
                       {LANGUAGES[code]}
                     </button>
                   ))}
                 </div>
               )}
             </div>
           </div>
        </header>

        <div className="min-h-[500px]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
