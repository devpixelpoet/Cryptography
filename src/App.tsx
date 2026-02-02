import React, { useState, useEffect, useMemo } from "react";
import { CipherType, Mode, type CipherResult } from "./types";
import * as CipherUtils from "./utils/ciphers";
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeCipher, setActiveCipher] = useState<CipherType>(
    CipherType.CAESAR,
  );
  const [mode, setMode] = useState<Mode>(Mode.ENCRYPT);
  const [inputText, setInputText] = useState("");
  const [key, setKey] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  // Load initial history from localStorage
  const [history, setHistory] = useState<CipherResult[]>(() => {
    try {
      const saved = localStorage.getItem("crypto_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      return [];
    }
  });

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("crypto_history", JSON.stringify(history));
  }, [history]);

  // Generate Playfair matrix for visualization
  const playfairMatrix = useMemo(() => {
    if (activeCipher !== CipherType.PLAYFAIR || !key.trim()) return null;
    try {
      return CipherUtils.createPlayfairMatrix(key);
    } catch (e) {
      return null;
    }
  }, [activeCipher, key]);

  const validateInput = (): boolean => {
    if (!inputText.trim()) {
      setError("Iltimos, ishlov berish uchun matn kiriting.");
      return false;
    }

    if (!key.trim()) {
      setError("Iltimos, kalitni (key) kiriting.");
      return false;
    }

    switch (activeCipher) {
      case CipherType.CAESAR:
        if (isNaN(parseInt(key))) {
          setError(
            "Caesar shifri uchun kalit butun son bo'lishi shart (masalan: 3).",
          );
          return false;
        }
        break;
      case CipherType.RAIL_FENCE:
        const rails = parseInt(key);
        if (isNaN(rails) || rails < 2) {
          setError(
            "Rail Fence uchun kalit 2 yoki undan katta butun son bo'lishi shart.",
          );
          return false;
        }
        break;
      case CipherType.TRANSPOSITION:
        if (!/[a-zA-Z]/.test(key)) {
          setError(
            "Transposition kaliti kamida bitta lotin harfidan iborat so'z bo'lishi shart.",
          );
          return false;
        }
        break;
      case CipherType.PLAYFAIR:
        if (!/[a-zA-Z]/.test(key)) {
          setError("Playfair kaliti harflardan iborat so'z bo'lishi shart.");
          return false;
        }
        if (mode === Mode.DECRYPT) {
          const charOnly = inputText
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .replace(/J/g, "I");
          if (charOnly.length % 2 !== 0) {
            setError(
              "Playfair deshifrlashda faqat harflar soni juft bo'lishi shart.",
            );
            return false;
          }
        }
        break;
    }
    return true;
  };

  const handleProcess = () => {
    setError("");
    setResult("");
    setAiAnalysis("");

    if (!validateInput()) return;

    try {
      let output = "";
      const text = inputText.trim();

      switch (activeCipher) {
        case CipherType.CAESAR: {
          const shift = parseInt(key);
          output = CipherUtils.caesarCipher(
            text,
            shift,
            mode === Mode.ENCRYPT ? "encrypt" : "decrypt",
          );
          break;
        }
        case CipherType.RAIL_FENCE: {
          const rails = parseInt(key);
          output =
            mode === Mode.ENCRYPT
              ? CipherUtils.railFenceEncrypt(text, rails)
              : CipherUtils.railFenceDecrypt(text, rails);
          break;
        }
        case CipherType.TRANSPOSITION: {
          output =
            mode === Mode.ENCRYPT
              ? CipherUtils.columnarTranspositionEncrypt(text, key)
              : CipherUtils.columnarTranspositionDecrypt(text, key);
          break;
        }
        case CipherType.PLAYFAIR: {
          output = CipherUtils.playfairCipher(
            text,
            key,
            mode === Mode.ENCRYPT ? "encrypt" : "decrypt",
          );
          break;
        }
      }

      setResult(output);

      const newEntry: CipherResult = {
        original: text,
        result: output,
        key: key,
        cipherType: activeCipher,
        mode: mode,
        timestamp: Date.now(),
      };
      setHistory((prev) => [newEntry, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "Kutilmagan xatolik yuz berdi.");
    }
  };

  const getAiExplanation = async () => {
    // Detailed validation for AI explanation
    if (!result) {
      setAiAnalysis(
        "Tahlil qilish uchun avval matnni shifrlashingiz yoki deshifrlashingiz kerak.",
      );
      return;
    }

    if (!inputText.trim()) {
      setAiAnalysis("Asl matn bo'sh bo'lishi mumkin emas.");
      return;
    }

    if (!key.trim()) {
      setAiAnalysis("Kalit (key) bo'sh bo'lishi mumkin emas.");
      return;
    }

    if (!activeCipher) {
      setAiAnalysis("Algoritm tanlanmagan.");
      return;
    }

    setIsAiProcessing(true);
    setAiAnalysis("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const prompt = `Men kriptografiya bo'yicha mutaxassisman. Quyidagi ma'lumotlarni tahlil qilib ber:
      Algoritm: ${activeCipher}
      Amal: ${mode === Mode.ENCRYPT ? "Shifrlash" : "Deshifrlash"}
      Asl matn: ${inputText}
      Natija: ${result}
      Kalit: ${key}
      Ushbu kriptografik amal qanday bajarilganini juda qisqa va faqat texnik jihatdan o'zbek tilida tushuntirib bering.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiAnalysis(response.text || "Tushuntirish olib bo'lmadi.");
    } catch (err) {
      setAiAnalysis("AI bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-6xl mx-auto text-slate-200">
      {/* Header */}
      <header className="w-full mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          <i className="fas fa-user-shield mr-4"></i>
          CryptoMaster
        </h1>
        <p className="text-slate-400">Professional kriptografiya yordamchisi</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cipher-card p-6 rounded-2xl shadow-2xl">
            {/* Algorithm Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.values(CipherType).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setActiveCipher(type);
                    setResult("");
                    setError("");
                    setAiAnalysis("");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeCipher === type
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 scale-105"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Mode Selector */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-slate-700">
              <button
                onClick={() => {
                  setMode(Mode.ENCRYPT);
                  setError("");
                  setResult("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  mode === Mode.ENCRYPT
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                SHIFRLASH
              </button>
              <button
                onClick={() => {
                  setMode(Mode.DECRYPT);
                  setError("");
                  setResult("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  mode === Mode.DECRYPT
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                DESHIFRLASH
              </button>
            </div>

            {/* Input Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider flex justify-between">
                  Kiruvchi Matn
                  {inputText.length > 0 && (
                    <span className="text-[10px] text-slate-500">
                      {inputText.length} belgi
                    </span>
                  )}
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={
                    mode === Mode.ENCRYPT
                      ? "Shifrlanadigan matnni kiriting..."
                      : "Shifrni yechish uchun matnni kiriting..."
                  }
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-slate-200"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Kalit (Key)
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder={
                      activeCipher === CipherType.CAESAR ||
                      activeCipher === CipherType.RAIL_FENCE
                        ? "Raqam kiriting (masalan: 3)"
                        : "Kalit so'zni kiriting (masalan: SECRET)"
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-200"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleProcess}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
                  >
                    <i
                      className={`fas ${mode === Mode.ENCRYPT ? "fa-lock" : "fa-unlock"} mr-2`}
                    ></i>
                    {mode === Mode.ENCRYPT ? "SHIFRLASH" : "YECHISH"}
                  </button>
                </div>
              </div>

              {/* Playfair Matrix Visualization */}
              {activeCipher === CipherType.PLAYFAIR && playfairMatrix && (
                <div className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-blue-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center">
                    <i className="fas fa-th mr-2"></i>
                    Playfair 5x5 Matritsasi
                  </h4>
                  <div className="grid grid-cols-5 gap-2 w-fit mx-auto md:mx-0">
                    {playfairMatrix.flat().map((char, i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg mono text-lg font-bold shadow-inner ${
                          key.toUpperCase().includes(char)
                            ? "text-blue-400 border-blue-500/50"
                            : "text-slate-400"
                        }`}
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 italic">
                    * 'J' harfi 'I' bilan almashtirilgan.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start animate-in slide-in-from-bottom-1">
                  <i className="fas fa-exclamation-circle mr-3 mt-1"></i>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          {result && (
            <div className="cipher-card p-6 rounded-2xl shadow-2xl border-l-4 border-l-blue-500 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-blue-400 uppercase tracking-widest flex items-center">
                  <i className="fas fa-check-circle mr-2 text-emerald-500"></i>
                  Natija
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setInputText(result);
                      setMode(
                        mode === Mode.ENCRYPT ? Mode.DECRYPT : Mode.ENCRYPT,
                      );
                      setResult("");
                      setError("");
                    }}
                    className="p-2 text-slate-400 hover:text-white transition-colors border border-slate-700 rounded-lg hover:bg-slate-800"
                    title="Natijani kirishga o'tkazish"
                  >
                    <i className="fas fa-reply"></i>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                      const btn = document.getElementById("copy-btn");
                      if (btn) {
                        const original = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => (btn.innerHTML = original), 2000);
                      }
                    }}
                    id="copy-btn"
                    className="p-2 text-slate-400 hover:text-white transition-colors border border-slate-700 rounded-lg hover:bg-slate-800"
                    title="Nusxa olish"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div className="bg-black/40 p-6 rounded-xl border border-slate-700 mb-4 group relative">
                <p className="mono break-words text-lg text-slate-100 selection:bg-blue-500">
                  {result}
                </p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    Uzunlik: {result.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  onClick={getAiExplanation}
                  disabled={isAiProcessing}
                  className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                >
                  <i
                    className={`fas ${isAiProcessing ? "fa-spinner fa-spin" : "fa-brain"}`}
                  ></i>
                  {isAiProcessing
                    ? "AI TAHLIL QILMOQDA..."
                    : "AI TUSHUNTIRISHI"}
                </button>

                {aiAnalysis && (
                  <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-slate-300 text-sm leading-relaxed animate-in slide-in-from-top-2 duration-500">
                    <p className="font-semibold text-blue-300 mb-1 border-b border-blue-500/20 pb-1 flex items-center">
                      <i className="fas fa-robot mr-2"></i>
                      AI Mutaxassis Tahlili:
                    </p>
                    <div className="mt-2 whitespace-pre-wrap">{aiAnalysis}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / History */}
        <div className="space-y-6">
          <div className="cipher-card p-6 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center text-slate-300">
              <i className="fas fa-history mr-3 text-blue-400"></i>
              AMALLAR TARIXI
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar text-slate-300">
              {history.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-slate-500">
                  <i className="fas fa-folder-open text-3xl mb-3 opacity-20"></i>
                  <p className="text-sm italic">Hozircha tarix bo'sh</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm hover:border-slate-600 transition-all cursor-pointer group hover:bg-slate-800/80"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.mode === Mode.ENCRYPT ? "bg-blue-900/40 text-blue-400" : "bg-emerald-900/40 text-emerald-400"}`}
                      >
                        {item.mode === Mode.ENCRYPT ? "SHIFR" : "YECHISH"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.result);
                          }}
                          className="text-slate-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Nusxa olish"
                        >
                          <i className="fas fa-copy text-[10px]"></i>
                        </button>
                        <span className="text-slate-600 text-[10px]">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-slate-300 mb-1 flex justify-between">
                      {item.cipherType}
                      <span className="text-[10px] text-slate-500">
                        Key: {item.key}
                      </span>
                    </div>
                    <div className="text-slate-500 truncate mb-1">
                      In: {item.original}
                    </div>
                    <div className="text-blue-400 truncate font-mono font-medium">
                      Out: {item.result}
                    </div>
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="w-full mt-4 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors border border-slate-800 rounded-lg hover:bg-red-900/10"
              >
                TARIXNI TOZALASH
              </button>
            )}
          </div>

          <div className="cipher-card p-6 rounded-2xl bg-gradient-to-br from-blue-900/10 to-transparent border border-blue-500/10">
            <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-tighter flex items-center">
              <i className="fas fa-shield-alt mr-2"></i>
              Algoritm Qoidalari
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-3 list-none">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Playfair:</strong> Kalit va matndagi 'J' harfi 'I' ga
                  almashtiriladi. Matn uzunligi juft bo'lishi shart.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Transposition:</strong> Kalit so'zidagi harflarning
                  alifbo tartibi ustunlarni o'qish navbatini belgilaydi.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Rail Fence:</strong> Rail soni 2 dan kam bo'lsa
                  shifrlanmaydi.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Caesar:</strong> Shift qiymati 26 dan katta bo'lsa
                  modulyar hisoblanadi.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="w-full mt-auto py-8 text-center text-slate-500 text-sm border-t border-slate-800/50">
        <p>
          &copy; {new Date().getFullYear()} CryptoMaster Professional Toolkit.
          Tarix brauzeringizda saqlanadi.
        </p>
      </footer>
    </div>
  );
};

export default App;
