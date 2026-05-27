import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Camera, 
  RefreshCw, 
  Leaf, 
  Trash2, 
  Sparkles, 
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Droplet,
  ChevronRight,
  Info,
  X,
  Zap,
  Bot
} from "lucide-react";
import { DiagnosisResult } from "./components/DiagnosisResult";
import { HistoryList } from "./components/HistoryList";
import type { DiagnosisResponse, SavedDiagnosis } from "./types";

// Premium Curated Seed Leaf Photos representing typical phytopathological patterns
const DEMO_PLANTS = [
  {
    name: "Costela-de-Adão",
    scientific: "Monstera deliciosa",
    condition: "Stress Hídrico",
    imageUrl: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=800",
    mimeType: "image/jpeg",
    description: "Folhamento murcho e pontas castanhas desidratadas."
  },
  {
    name: "Tomateiro",
    scientific: "Solanum lycopersicum",
    condition: "Míldio Fúngico",
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=800",
    mimeType: "image/jpeg",
    description: "Sintomas de manchas escuras com halos amarelos nas folhas."
  },
  {
    name: "Pilea Peperomioides",
    scientific: "Pilea peperomioides",
    condition: "Saudável",
    imageUrl: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=800",
    mimeType: "image/jpeg",
    description: "Folhas turgidas, verdejantes e sem patologias visíveis."
  }
];

// Helper to compress/downscale a base64 image below 120px max dimension for storage conservation
function compressImage(dataUrl: string, maxWidth = 120, maxHeight = 120): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || dataUrl.startsWith("http")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

export default function App() {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeMimeType, setActiveMimeType] = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<DiagnosisResponse | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedDiagnosis[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("todos");

  // Webcam States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("botanica_ia_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        // Automatically make the most recent diagnostic active if available
        if (parsed.length > 0) {
          const latest = parsed[0];
          setActiveResult(latest);
          setActiveImage(latest.image);
          setSelectedHistoryId(latest.id);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  }, []);

  // Save history helper
  const saveToHistory = async (newDiagnosis: DiagnosisResponse, imageBase64: string) => {
    let storedImage = imageBase64;
    
    if (imageBase64 && imageBase64.startsWith("data:image")) {
      try {
        storedImage = await compressImage(imageBase64, 150, 150);
      } catch (err) {
        console.warn("Falha ao compactar miniatura:", err);
      }
    }

    const freshItem: SavedDiagnosis = {
      ...newDiagnosis,
      id: "diag_" + Date.now(),
      image: storedImage,
      date: new Date().toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    const updatedHistory = [freshItem, ...history.filter(h => h.planta !== freshItem.planta || h.estado_saude !== freshItem.estado_saude)].slice(0, 15);
    setHistory(updatedHistory);
    setSelectedHistoryId(freshItem.id);
    
    try {
      localStorage.setItem("botanica_ia_history", JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("Storage Quota Exceeded. Reducing history capacity...", e);
      // Fallback: decrease historical entries until storage complies
      let trimmed = [...updatedHistory];
      while (trimmed.length > 1) {
        trimmed = trimmed.slice(0, trimmed.length - 1);
        try {
          localStorage.setItem("botanica_ia_history", JSON.stringify(trimmed));
          setHistory(trimmed);
          break;
        } catch (innerErr) {
          // Keep shedding oldest entries
        }
      }
    }
  };

  // Convert files to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorStatus("Por favor, selecione um ficheiro de imagem válido.");
      return;
    }

    setActiveMimeType(file.type);
    setErrorStatus(null);
    setSelectedHistoryId(null);
    
    // Stop camera if running
    stopCamera();

    const reader = new FileReader();
    reader.onloadstart = () => {
      setUploadProgress("A ler ficheiro...");
    };
    reader.onload = () => {
      setActiveImage(reader.result as string);
      setActiveResult(null); // Clear previous output to prepare for scan
      setUploadProgress("");
    };
    reader.onerror = () => {
      setErrorStatus("Erro ao ler o ficheiro de imagem.");
      setUploadProgress("");
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Webcam triggers
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setActiveResult(null);
    setSelectedHistoryId(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Erro câmera:", err);
      setCameraError(
        "Não foi possível aceder à câmera. Dica: Se estiver num iframe, clique para abrir em nova janela ou use o carregamento direto."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setActiveImage(dataUrl);
        setActiveMimeType("image/jpeg");
        stopCamera();
      }
    }
  };

  // Trigger analysis on server
  const runDiagnosis = async () => {
    if (!activeImage) return;

    setIsAnalyzing(true);
    setErrorStatus(null);
    
    // Fun status messages to show detailed botanical tracking
    const messageIntervals = [
      "A calibrar espectro fotosintético...",
      "A analisar densidade de clorofila nas células foliares...",
      "A mapear padrões necróticos e nervuras...",
      "Processamento de Inteligência Botânica Ativo...",
      "A inferir fitopatologia do espécime..."
    ];
    let msgIndex = 0;
    setUploadProgress(messageIntervals[0]);

    const statusTimer = setInterval(() => {
      msgIndex = (msgIndex + 1) % messageIntervals.length;
      setUploadProgress(messageIntervals[msgIndex]);
    }, 2000);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: activeImage,
          mimeType: activeMimeType
        })
      });

      clearInterval(statusTimer);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro interno do processador Botânica IA.");
      }

      const result: DiagnosisResponse = await response.json();
      setActiveResult(result);
      await saveToHistory(result, activeImage);
    } catch (err: any) {
      clearInterval(statusTimer);
      console.error(err);
      setErrorStatus(err.message || "Não foi possível ligar ao servidor de diagnósticos.");
    } finally {
      setIsAnalyzing(false);
      setUploadProgress("");
    }
  };

  // Click on quick test seedlings
  const selectDemoPlant = (demo: typeof DEMO_PLANTS[0]) => {
    stopCamera();
    setErrorStatus(null);
    setActiveResult(null);
    setSelectedHistoryId(null);
    setIsAnalyzing(true);
    setUploadProgress("A descarregar imagem de amostra para simulação...");

    // Convert the demo URL into base64 via our backend proxy bypass, or use directly
    setActiveImage(demo.imageUrl);
    setActiveMimeType(demo.mimeType);

    setTimeout(() => {
      setIsAnalyzing(false);
      setUploadProgress("");
    }, 700);
  };

  // Navigate history
  const handleSelectHistoryItem = (item: SavedDiagnosis) => {
    stopCamera();
    setSelectedHistoryId(item.id);
    setActiveImage(item.image);
    setActiveResult({
      planta: item.planta,
      estado_saude: item.estado_saude,
      diagnostico: item.diagnostico,
      tratamento: item.tratamento
    });
    setErrorStatus(null);
  };

  // Save/Update user notes for a specific history item
  const handleSaveNotesForActiveItem = (newNotesText: string) => {
    if (!selectedHistoryId) return;
    const updatedHistory = history.map(item => {
      if (item.id === selectedHistoryId) {
        return { ...item, notas: newNotesText };
      }
      return item;
    });
    setHistory(updatedHistory);
    try {
      localStorage.setItem("botanica_ia_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Erro ao guardar notas no localStorage:", err);
    }
  };

  // Toggle a treatment task completion status for the selected history item
  const handleToggleStepForActiveItem = (step: string) => {
    if (!selectedHistoryId) return;
    const updatedHistory = history.map(item => {
      if (item.id === selectedHistoryId) {
        const currentSteps = item.completed_steps || [];
        const nextSteps = currentSteps.includes(step)
          ? currentSteps.filter(s => s !== step)
          : [...currentSteps, step];
        return { ...item, completed_steps: nextSteps };
      }
      return item;
    });
    setHistory(updatedHistory);
    try {
      localStorage.setItem("botanica_ia_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Erro ao guardar tarefas de tratamento no localStorage:", err);
    }
  };

  // Delete history item
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter(item => item.id !== id);
    setHistory(filtered);
    localStorage.setItem("botanica_ia_history", JSON.stringify(filtered));
    
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
      setActiveResult(null);
      setActiveImage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#06100c] text-white relative font-sans overflow-x-hidden p-3 md:p-6 flex items-center justify-center selection:bg-emerald-500 selection:text-white">
      
      {/* Absolute Decorative Blurred Ambient Mesh Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-emerald-900/30 rounded-full blur-[100px] md:blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-lime-900/20 rounded-full blur-[100px] md:blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-emerald-400/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Frosted Glass Center Container */}
      <div className="w-full max-w-6xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative z-10">
        
        {/* Subtle glass reflection overlay */}
        <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        {/* Header / Brand Nav */}
        <header className="px-6 md:px-10 h-20 border-b border-white/10 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-400 to-lime-300 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5.5 h-5.5 text-[#06100c] stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm md:text-base font-extrabold tracking-wider font-display uppercase">
                BOTÂNICA <span className="text-emerald-400">AI</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] font-mono tracking-[0.2em] text-white/40 ml-2.5 border-l border-white/15 pl-2.5">
                BIO-SPECTRUM V4.2
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold tracking-wider font-mono uppercase">
            <span className="text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Diagnóstico Ativo
            </span>
          </div>
        </header>

        {/* Content Workspace Grid */}
        <main className="flex-1 p-5 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 md:max-h-[750px] overflow-y-auto">
          
          {/* LEFT SECTION: Imaging input (Upload / Camera) */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Image display / Capture zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative h-[280px] md:h-[350px] rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col items-center justify-center ${
                isDragActive 
                  ? "border-emerald-400 bg-emerald-500/15" 
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              
              {/* Camera Feed */}
              {isCameraActive ? (
                <div className="absolute inset-0 bg-black">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    muted 
                  />
                  
                  {/* Floating Action within Live Video */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                    <button
                      onClick={capturePhoto}
                      className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 active:scale-95 transition-all text-xs font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar Foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : activeImage ? (
                /* Selected / Processed Image Display */
                <div className="absolute inset-0">
                  <img 
                    src={activeImage} 
                    alt="Espécime" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06100c]/80 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Action icons on active preview */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => {
                        setActiveImage(null);
                        setActiveResult(null);
                      }}
                      className="p-2 rounded-xl bg-black/60 hover:bg-red-500/50 hover:text-white text-white/80 transition-all border border-white/10 backdrop-blur-md"
                      title="Apagar imagem"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Scientific scanner overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden">
                      <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_15px_#4ade80] animate-[bounce_3s_infinite]" />
                      <div className="absolute inset-x-0 bottom-4 text-center px-4">
                        <span className="inline-block bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] uppercase tracking-[0.2em] py-1.5 px-3 rounded-md backdrop-blur-md">
                          Análise Espectral de Clorofila
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Primary Upload Prompt State */
                <div className="text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90 text-sm tracking-wide">
                      Carregue a foto da folha
                    </h3>
                    <p className="text-white/40 text-xs mt-1 max-w-[250px] mx-auto leading-relaxed">
                      Arrastar e soltar ficheiro ou tirar foto instantânea
                    </p>
                  </div>

                  {/* Interactive Button Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 transition-all text-xs font-bold text-white uppercase tracking-wider"
                    >
                      Selecionar Ficheiro
                    </button>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      Tirar Foto
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden Standard File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Error notifications and Camera fallback */}
            {cameraError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{cameraError}</p>
              </div>
            )}

            {/* Diagnóstico Process Button */}
            {activeImage && !activeResult && !isAnalyzing && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={runDiagnosis}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-sm tracking-[0.08em] uppercase shadow-lg shadow-emerald-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4.5 h-4.5" />
                Iniciar Análise de IA
              </motion.button>
            )}

            {/* Analyzing progress indicator */}
            {isAnalyzing && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-sm">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white/90 text-[13px] tracking-wide truncate">A processar laudo...</p>
                  <p className="text-white/40 text-xs mt-0.5 font-mono truncate">{uploadProgress}</p>
                </div>
              </div>
            )}

            {/* Error fallback display */}
            {errorStatus && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">Falha de Análise</span>
                </div>
                <p className="leading-relaxed text-white/80">{errorStatus}</p>
                <p className="text-white/40 text-[10px] leading-tight">Por favor, garanta que a imagem carregada exibe claramente as folhas e a sua textura.</p>
              </div>
            )}

            {/* Amo-estradores / Demo seedlings */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/30 block">
                Amostras Rápidas para Teste
              </span>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_PLANTS.map((demo, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectDemoPlant(demo)}
                    className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all rounded-2xl p-2 flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden mb-1.5 border border-white/10 bg-black/40">
                      <img src={demo.imageUrl} alt={demo.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[10px] font-bold text-white/90 truncate w-full">{demo.name}</span>
                    <span className="text-[9px] text-emerald-400 italic truncate w-full">{demo.condition}</span>
                  </button>
                ))}
              </div>
            </div>

          </section>

          {/* RIGHT SECTION: Diagnosis Result Panel and Local Cache History */}
          <section className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
            
            <div className="flex-1 space-y-6">
              
              {/* Show active analysis outputs */}
              {activeResult ? (
                <DiagnosisResult 
                  result={activeResult} 
                  date={history.find(h => h.image === activeImage)?.date} 
                  notes={history.find(h => h.id === selectedHistoryId || h.image === activeImage)?.notas}
                  onSaveNotes={selectedHistoryId ? handleSaveNotesForActiveItem : undefined}
                  completedSteps={history.find(h => h.id === selectedHistoryId || h.image === activeImage)?.completed_steps || []}
                  onToggleStep={selectedHistoryId ? handleToggleStepForActiveItem : undefined}
                />
              ) : (
                /* Sleek Empty Diagnostic Card */
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-gray-300 flex flex-col items-center justify-center min-h-[350px]">
                  <div className="w-16 h-16 bg-white/[0.03] rounded-2xl border border-white/10 flex items-center justify-center mb-4 text-emerald-400">
                    <Bot className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.3)]" />
                  </div>
                  <h3 className="text-2xl font-light tracking-wide text-white font-display">
                    Aguarda <span className="font-bold italic">Laudo Botânico</span>
                  </h3>
                  <p className="text-white/40 text-xs mt-2 max-w-[340px] leading-relaxed">
                    Selecione um dos exemplares de amostra para simular, ou carregue uma imagem original para identificar doenças, obter análises fitossanitárias e as recomendações de tratamento.
                  </p>
                </div>
              )}

              {/* Cache History Section */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
                  <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Histórico de Diagnósticos
                  </span>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem("botanica_ia_history");
                        setActiveResult(null);
                        setActiveImage(null);
                        setSelectedHistoryId(null);
                      }}
                      className="text-[10px] font-mono hover:text-red-400 text-white/40 flex items-center gap-1 uppercase tracking-wider transition-colors"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>

                {/* Filtro & Procura do Histórico se houver itens */}
                {history.length > 0 && (
                  <div className="space-y-2.5">
                    {/* Input de Procura embutido */}
                    <input
                      type="text"
                      placeholder="Pesquisar por planta ou estado..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-hidden focus:ring-1 focus:ring-emerald-550 transition-all font-sans"
                    />

                    {/* Botões de Filtro Rápido */}
                    <div className="flex flex-row items-center gap-1.5 flex-wrap">
                      {[
                        { id: "todos", label: "Todos" },
                        { id: "saudavel", label: "Saudáveis" },
                        { id: "doente", label: "Patologia" },
                        { id: "stress", label: "Stress Hídrico" }
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => setHistoryFilter(btn.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-mono tracking-wider transition-all select-none border ${
                            historyFilter === btn.id
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold"
                              : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <HistoryList 
                  history={history.filter(item => {
                    const matchesSearch = item.planta.toLowerCase().includes(historySearch.toLowerCase()) || 
                                          (item.estado_saude || "").toLowerCase().includes(historySearch.toLowerCase()) ||
                                          (item.diagnostico || "").toLowerCase().includes(historySearch.toLowerCase());
                    
                    if (historyFilter === "todos") return matchesSearch;
                    
                    const normStatus = (item.estado_saude || "").toLowerCase();
                    if (historyFilter === "saudavel") {
                      return matchesSearch && (normStatus.includes("saudável") || normStatus.includes("saudavel"));
                    }
                    if (historyFilter === "doente") {
                      return matchesSearch && !(normStatus.includes("saudável") || normStatus.includes("saudavel") || normStatus.includes("hídrico") || normStatus.includes("hidrico") || normStatus.includes("água") || normStatus.includes("agua"));
                    }
                    if (historyFilter === "stress") {
                      return matchesSearch && (normStatus.includes("stress hídrico") || normStatus.includes("hidrico") || normStatus.includes("água") || normStatus.includes("agua"));
                    }
                    return matchesSearch;
                  })}
                  selectedId={selectedHistoryId}
                  onSelect={handleSelectHistoryItem}
                  onDelete={handleDeleteHistoryItem}
                />
              </div>

            </div>

          </section>

        </main>

        {/* Glossy Bio-Neural System Status Bar Requested in the theme instructions */}
        <footer className="h-12 bg-black/40 border-t border-white/10 px-6 md:px-10 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 shrink-0 select-none">
          <div>Sistema Bio-Neural v4.2</div>
          <div className="flex gap-4 md:gap-8">
            <span className="hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 
              Online
            </span>
            <span className="hidden md:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 
              Latência: 12ms
            </span>
            <span className="text-emerald-400 font-mono">
              Pronto para novo Scan
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
