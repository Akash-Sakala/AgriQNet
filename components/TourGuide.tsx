
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

export interface TourStep {
  targetId: string;
  titleKey: string;
  descKey: string;
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onStepChange?: (index: number) => void;
}

const TourGuide: React.FC<TourGuideProps> = ({ steps, isOpen, onClose, lang, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const t = getTranslation(lang);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const findTarget = () => {
      const step = steps[currentStep];
      const element = document.getElementById(step.targetId);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Disconnect old observer
        if (observerRef.current) observerRef.current.disconnect();

        // Create new observer for this element to handle resizes/moves
        observerRef.current = new ResizeObserver(() => {
            if(element) setTargetRect(element.getBoundingClientRect());
        });
        observerRef.current.observe(element);
      } else {
        // Retry briefly if element is mounting (e.g. view switch)
        const timer = setTimeout(() => {
             const retryEl = document.getElementById(step.targetId);
             if (retryEl) {
                setTargetRect(retryEl.getBoundingClientRect());
             }
        }, 300);
        return () => clearTimeout(timer);
      }
    };

    // Small delay to allow layout shifts/view changes to settle
    const timeout = setTimeout(findTarget, 100);

    return () => {
        clearTimeout(timeout);
        if (observerRef.current) observerRef.current.disconnect();
    };
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
     if(onStepChange) {
         onStepChange(currentStep);
     }
  }, [currentStep]);

  if (!isOpen || !targetRect) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const stepData = steps[currentStep];
  const title = (t as any)[stepData.titleKey];
  const desc = (t as any)[stepData.descKey];

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
        {/* Dark Overlay with "Hole" using clip-path could be complex. 
            Simpler approach: Full dim background with high z-index, 
            and we'll render a "highlight box" around the target. */}
        <div className="absolute inset-0 bg-black/50 transition-colors duration-500" />

        {/* Highlight Box */}
        <div 
            className="absolute border-2 border-yellow-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out pointer-events-none"
            style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                zIndex: 101 // Above overlay
            }}
        >
             {/* Cursor Animation */}
            <div className="absolute -bottom-8 -right-8 animate-bounce">
                <div className="bg-white p-2 rounded-full shadow-lg">
                    <div className="w-4 h-4 bg-agri-600 rounded-full"></div>
                </div>
            </div>
        </div>

        {/* Tooltip Card */}
        <div 
            className="absolute z-[102] transition-all duration-500 ease-in-out"
            style={{
                top: targetRect.bottom + 20 > window.innerHeight - 200 ? targetRect.top - 200 : targetRect.bottom + 20,
                left: Math.max(16, Math.min(window.innerWidth - 340, targetRect.left)),
            }}
        >
            <div className="w-80 bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                    <span className="bg-agri-100 text-agri-700 text-xs font-bold px-2 py-1 rounded-md">
                        {t.tourNext} {currentStep + 1} / {steps.length}
                    </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    {desc}
                </p>

                <div className="flex justify-between items-center">
                    <button 
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className="text-gray-500 hover:text-agri-600 text-sm font-medium flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} /> {t.tourBack}
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        className="bg-agri-600 hover:bg-agri-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-md transition-transform active:scale-95"
                    >
                        {currentStep === steps.length - 1 ? t.tourFinish : t.tourNext}
                        {currentStep !== steps.length - 1 && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
};

export default TourGuide;
