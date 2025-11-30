
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Leaf, Sparkles, FileText, Mic, MicOff, Volume2, StopCircle, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeminiService } from '../services/geminiService';
import { ChatMessage, Language } from '../types';
import { getTranslation, LANGUAGES } from '../utils/translations';

interface ChatModuleProps {
  lang: Language;
}

const STORAGE_KEY = 'agriqnet_chat_history';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ChatModule: React.FC<ChatModuleProps> = ({ lang }) => {
  const t = getTranslation(lang);
  // Initialize messages from localStorage
  const savedMessages = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const [messages, setMessages] = useState<ChatMessage[]>(savedMessages || [
    { id: '1', role: 'model', text: 'Hello! I am your AgriQNet assistant. Ask me anything about farming, soil health, or market prices!', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Speech State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null); // ID of message being spoken
  const [speechLang, setSpeechLang] = useState<string>('native'); // 'native' or 'en'
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Save messages to localStorage and scroll to bottom on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  // Language Code Mapping for Web Speech API
  const getBCP47Code = (l: Language) => {
    switch (l) {
      case 'hi': return 'hi-IN';
      case 'kn': return 'kn-IN';
      case 'te': return 'te-IN';
      default: return 'en-US';
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare history for context
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // NOTE: We pass 'lang' to GeminiService, but if the user explicitly spoke in English via toggle,
      // the input text is English. Gemini handles this gracefully.
      const responseText = await GeminiService.chat(userMsg.text, history, lang);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Speech Recognition Logic ---
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Determine language: If speechLang is 'en', force English, else use App Language
    recognition.lang = speechLang === 'en' ? 'en-US' : getBCP47Code(lang);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // --- Text to Speech Logic ---
  const speakText = (text: string, msgId: string) => {
    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any current speech
    
    // Strip markdown symbols for cleaner reading
    const cleanText = text.replace(/[*#_`]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getBCP47Code(lang);
    
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(msgId);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel(); // Cleanup on unmount
    };
  }, []);

  const getDailyTip = () => {
    const tips = (t as any).tipsList;
    if (!tips || tips.length === 0) return "Farming is life.";
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return tips[dayIndex % tips.length];
  };

  const dailyTip = getDailyTip();

  const MarkdownComponents = {
    p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li: ({ ...props }) => <li className="pl-1" {...props} />,
    h1: ({ ...props }) => <h1 className="text-xl font-bold mb-2 text-agri-800" {...props} />,
    h2: ({ ...props }) => <h2 className="text-lg font-bold mb-2 text-agri-700" {...props} />,
    h3: ({ ...props }) => <h3 className="text-md font-bold mb-1 text-agri-700" {...props} />,
    strong: ({ ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-agri-300 pl-4 italic bg-agri-50 py-1 rounded-r mb-2" {...props} />,
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-agri-400 to-agri-600 rounded-full flex items-center justify-center text-white shadow-md">
               <Bot size={20} />
             </div>
             <div>
               <h3 className="font-bold text-gray-800">{t.chatTitle}</h3>
               <div className="flex items-center gap-1.5">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <span className="text-xs text-green-600 font-medium">{t.online}</span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Agri-RAG Link Button */}
             <a 
               href="http://127.0.0.1:5000" 
               target="_blank" 
               rel="noopener noreferrer"
               className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:shadow-md transition-all text-sm font-bold border border-blue-100"
             >
               <FileText size={16} />
               <span>{t.agriRag}</span>
             </a>

             <button 
                onClick={() => {
                    const initialMsg = { id: '1', role: 'model', text: 'Hello! I am your AgriQNet assistant. Ask me anything about farming, soil health, or market prices!', timestamp: Date.now() } as ChatMessage;
                    setMessages([initialMsg]);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialMsg]));
                }} 
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
             >
                {t.clearChat}
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.map((msg) => {
            return (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[90%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-agri-100 text-agri-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Leaf size={16} />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`p-4 rounded-2xl shadow-sm relative group ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'}`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                      ) : (
                        <div className="text-sm leading-relaxed markdown-content">
                          <ReactMarkdown components={MarkdownComponents}>{msg.text}</ReactMarkdown>
                        </div>
                      )}

                      {/* Read Aloud Button for Model Messages */}
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => speakText(msg.text, msg.id)}
                          className={`absolute -right-8 bottom-0 p-1.5 rounded-full text-gray-400 hover:text-agri-600 hover:bg-agri-50 transition-all opacity-0 group-hover:opacity-100 ${isSpeaking === msg.id ? 'opacity-100 text-agri-600 bg-agri-50 ring-2 ring-agri-200' : ''}`}
                          title="Read Aloud"
                        >
                           {isSpeaking === msg.id ? <StopCircle size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && (
             <div className="flex justify-start">
               <div className="flex gap-3 max-w-[80%]">
                 <div className="w-8 h-8 rounded-full bg-agri-100 text-agri-600 flex items-center justify-center shrink-0">
                   <Leaf size={16} />
                 </div>
                 <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                   <div className="flex gap-1">
                     <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></span>
                     <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></span>
                   </div>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="relative flex items-center bg-gray-50 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-agri-200 focus-within:border-agri-400 transition-all">
            
            {/* Mic / Language Toggle - Ensured Visible */}
            <div className="flex items-center pl-2 gap-1">
               {/* Language Switcher for Voice (Visible if app is not in English) */}
               {lang !== 'en' && (
                 <button 
                   onClick={() => setSpeechLang(prev => prev === 'native' ? 'en' : 'native')}
                   className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-gray-500 hover:text-agri-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                   title="Switch Voice Language"
                 >
                   <Globe size={14} />
                   {speechLang === 'native' ? LANGUAGES[lang].split(' ')[0] : 'ENG'}
                 </button>
               )}

               <button 
                 onClick={toggleListening}
                 className={`p-2.5 rounded-full transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-lg' : 'text-gray-500 hover:text-agri-600 hover:bg-agri-50'}`}
                 title={isListening ? "Stop Listening" : "Voice Input"}
               >
                 {isListening ? <MicOff size={20} /> : <Mic size={20} />}
               </button>
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? "Listening..." : t.typeMsg}
              className="flex-1 bg-transparent px-3 py-4 outline-none text-gray-700 placeholder-gray-400 min-w-0"
            />
            
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="mr-2 p-3 bg-agri-600 text-white rounded-full hover:bg-agri-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
          {isListening && <p className="text-xs text-red-500 mt-2 ml-4 animate-pulse font-medium">Recording ({speechLang === 'en' ? 'English' : LANGUAGES[lang]})...</p>}
        </div>
      </div>

      {/* Right Sidebar Knowledge Panel */}
      <div className="hidden lg:block w-80 space-y-4">
        <div className="bg-gradient-to-b from-agri-50 to-white p-6 rounded-3xl border border-agri-100 h-full">
           <h4 className="font-bold text-agri-900 mb-4 flex items-center gap-2">
             <Sparkles size={18} className="text-yellow-500" />
             {t.suggested}
           </h4>
           <div className="space-y-3">
             {['Best fertilizer for tomatoes?', 'How to treat aphid infestation?', 'Water requirements for corn', 'Organic pest control methods', 'Current wheat market trends'].map((topic, i) => (
               <button 
                key={i}
                onClick={() => setInput(topic)} 
                className="w-full text-left p-3 rounded-xl bg-white border border-agri-100 hover:border-agri-300 hover:shadow-md transition-all text-sm text-gray-600 hover:text-agri-700"
               >
                 {topic}
               </button>
             ))}
           </div>

           <div className="mt-8 pt-6 border-t border-agri-100">
             <h4 className="font-bold text-gray-800 text-sm mb-3">{t.tip}</h4>
             <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
               <p className="text-xs text-orange-800 italic">"{dailyTip}"</p>
             </div>
           </div>
           
           <div className="mt-4 pt-4 border-t border-agri-100 lg:hidden">
              <a 
                 href="http://127.0.0.1:5000" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 text-sm font-bold border border-blue-100"
               >
                 <FileText size={16} />
                 <span>{t.agriRag}</span>
               </a>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModule;
