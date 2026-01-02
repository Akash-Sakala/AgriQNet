// src/components/PestAlerts.tsx

import React, { useState, useRef } from "react";
import {
  Siren, ExternalLink, ShieldAlert, Upload, Loader2, ScanLine, Bug,
  AlertTriangle, CheckCircle, BellRing, Phone, ChevronDown,
  MapPin, Send, Radio, X
} from "lucide-react";

import { Language } from "../types";
import { getTranslation } from "../utils/translations";
import { GeminiService } from "../services/geminiService";
import { TwilioService } from "../services/twilioService";
import { DBService } from "../services/dbService";

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


const PestAlerts: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = getTranslation(lang);

  /* ---------- Pest detection ---------- */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] =
    useState<{ pestType: string; confidence: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Subscription ---------- */
  const [subStep, setSubStep] =
    useState<"idle" | "input" | "otp" | "success">("idle");
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  const [subForm, setSubForm] = useState({
    countryCode: "+91",
    phone: "",
    district: "",
  });

  const [otpInput, setOtpInput] = useState("");

  /* ---------- File handling ---------- */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ---------- Pest detection ---------- */
  const handleDetect = async () => {
    if (!preview) return;
    setLoading(true);

    try {
      const base64 = preview.split(",")[1];
      const res = await GeminiService.analyzePestImage(base64, lang);
      setDetectionResult({
        pestType: res.pestName,
        confidence: res.confidence,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Start subscription ---------- */
  const handleSubscribeStart = async () => {
    setSubError("");

    if (subForm.phone.length < 10 || !subForm.district) {
      setSubError("Please enter a valid phone number and district.");
      return;
    }

    setSubLoading(true);
    const phone = `${subForm.countryCode}${subForm.phone}`;

    try {
      await TwilioService.sendOTP(phone);
      setSubStep("otp");
    } catch {
      setSubError("Failed to send OTP.");
    } finally {
      setSubLoading(false);
    }
  };

  /* ---------- Verify OTP ---------- */
  const handleVerifySub = async () => {
    setSubError("");
    setSubLoading(true);

    const phone = `${subForm.countryCode}${subForm.phone}`;

    try {
      await TwilioService.verifyOTP(phone, otpInput);
      DBService.addPestSubscriber(subForm.district, phone);
      setSubStep("success");
    } catch {
      setSubError("Invalid OTP.");
    } finally {
      setSubLoading(false);
    }
  };

  /* ---------- Broadcast alerts ---------- */
  const handleBroadcast = async (phones: string[], message: string) => {
    for (const phone of phones) {
      await TwilioService.sendSms(phone, message);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-8">

      {/* ---- subscription UI unchanged except OTP section ---- */}

      {subStep === "otp" && (
        <div className="space-y-4 text-center">
          <p>
            Enter the OTP sent to{" "}
            <strong>{subForm.countryCode}{subForm.phone}</strong>
          </p>

          <input
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            maxLength={6}
            className="text-center text-2xl p-3 border rounded w-full"
          />

          {subError && <p className="text-red-500">{subError}</p>}

          <button
            onClick={handleVerifySub}
            className="bg-indigo-600 text-white px-6 py-3 rounded"
          >
            Verify & Subscribe
          </button>
        </div>
      )}

    </div>
  );
};
};
export default PestAlerts;
