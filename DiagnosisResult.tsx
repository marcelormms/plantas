import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  CheckCircle, 
  AlertTriangle, 
  Droplet, 
  Leaf, 
  Activity, 
  Calendar,
  Sparkles,
  ShieldAlert,
  Bot,
  Save,
  ClipboardList,
  Copy,
  Check
} from "lucide-react";
import type { DiagnosisResponse } from "../types";

interface DiagnosisResultProps {
  result: DiagnosisResponse;
  date?: string;
  notes?: string;
  onSaveNotes?: (text: string) => void;
  completedSteps?: string[];
  onToggleStep?: (step: string) => void;
}

export function DiagnosisResult({ 
  result, 
  date, 
  notes = "", 
  onSaveNotes,
  completedSteps = [],
  onToggleStep
}: DiagnosisResultProps) {
  const [noteText, setNoteText] = useState(notes);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localCompleted, setLocalCompleted] = useState<string[]>(completedSteps);

  // Sync state with incoming notes prop (e.g. when changing selected history item)
  useEffect(() => {
    setNoteText(notes);
    setIsSaved(false);
  }, [notes, result]);

  // Sync state with incoming completedSteps
  useEffect(() => {
    setLocalCompleted(completedSteps);
  }, [completedSteps, result]);

  const toggleStepInternal = (step: string) => {
    let next;
    if (localCompleted.includes(step)) {
      next = localCompleted.filter(s => s !== step);
    } else {
      next = [...localCompleted, step];
    }
    setLocalCompleted(next);
    if (onToggleStep) {
      onToggleStep(step);
    }
  };

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(noteText);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const copyToClipboard = () => {
    const formattedText = `🌱 botÂnica AI - RELATÓRIO FITOSSANITÁRIO

📋 Planta: ${result.planta}
🩺 Estado de Saúde: ${result.estado_saude}
📅 Data de Registo: ${date || "N/A"}

🔍 DIAGNÓSTICO:
${result.diagnostico}

💊 TRATAMENTO RECOMENDADO:
${result.tratamento}

${notes ? `📝 NOTAS PESSOAIS:\n${notes}` : ""}`;

    navigator.clipboard.writeText(formattedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Helper to parse treatments into individual checklist tasks
  const parseTratamentoToSteps = (texto: string): string[] => {
    if (!texto) return [];
    return texto
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Strip common list prefixes: Bullet (•, -, *, •), numbered lists (1., 2.), etc
        return line.replace(/^([•\-\*\s]+|[0-9]+\.\s*)/, "").trim();
      })
      .filter(line => line.length > 3);
  };

  const steps = parseTratamentoToSteps(result.tratamento);

  // Determine standard glassmorphism color mapping based on health status
  const getStatusConfig = (status: string) => {
    const normalized = (status || "").toLowerCase();
    
    if (normalized.includes("saudável") || normalized.includes("saudavel")) {
      return {
        bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        badgeBg: "bg-emerald-500 text-emerald-950 shadow-[0_0_12px_#10b981]",
        icon: CheckCircle,
        label: "Saudável",
        textColor: "text-emerald-400",
        iconContainer: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      };
    } else if (normalized.includes("stress hídrico") || normalized.includes("hidrico") || normalized.includes("água") || normalized.includes("agua")) {
      return {
        bg: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        badgeBg: "bg-blue-500 text-blue-950 shadow-[0_0_12px_#3b82f6]",
        icon: Droplet,
        label: "Stress Hídrico",
        textColor: "text-blue-400",
        iconContainer: "bg-blue-500/20 text-blue-400 border border-blue-500/30"
      };
    } else if (normalized.includes("nutriente") || normalized.includes("deficiência") || normalized.includes("deficiencia")) {
      return {
        bg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        badgeBg: "bg-amber-500 text-amber-950 shadow-[0_0_12px_#f59e0b]",
        icon: Activity,
        label: "Deficiência Nutricional",
        textColor: "text-amber-400",
        iconContainer: "bg-amber-500/20 text-amber-400 border border-amber-500/30"
      };
    } else {
      return {
        bg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        badgeBg: "bg-rose-500 text-rose-950 shadow-[0_0_12px_#f43f5e]",
        icon: ShieldAlert,
        label: result.estado_saude || "Doente / Patologia",
        textColor: "text-rose-400",
        iconContainer: "bg-rose-500/20 text-rose-400 border border-rose-500/30"
      };
    }
  };

  const statusConfig = getStatusConfig(result.estado_saude);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
      id="diagnosis-result-panel"
    >
      {/* Decorative inner glow */}
      <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* State banner banner */}
      <div className={`p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 relative z-10 ${statusConfig.bg}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl flex items-center justify-center ${statusConfig.iconContainer}`}>
            <StatusIcon className="w-8 h-8 filter drop-shadow-[0_0_8px_currentColor]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig.badgeBg}`}>
                {statusConfig.label}
              </span>
              {date && (
                <span className="text-white/40 text-xs flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {date}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1.5 font-display">
              {result.planta || "Planta Desconhecida"}
            </h2>
          </div>
        </div>
        
        {/* Humble AI Botanist Badge & Actions */}
        <div className="flex flex-row items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold transition-all duration-200 active:scale-95"
            title="Copiar laudo completo para partilhar"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="font-mono">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="font-mono">Copiar Laudo</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-emerald-400 select-none">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono tracking-wider uppercase">Relatório IA</span>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8 relative z-10 w-full">
        {/* Observações de Diagnóstico */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
            <Bot className="w-4 h-4 text-emerald-400" />
            Laudo Técnico / Diagnóstico
          </h3>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/5 text-white/95 leading-relaxed text-sm md:text-base whitespace-pre-line font-sans">
            {result.diagnostico}
          </div>
        </div>

        {/* Recomendações de Tratamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
              <Leaf className="w-4 h-4 text-emerald-400" />
              Prescrição & Plano de Ação
            </h3>
            {steps.length > 0 && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
                Checklist Interativo
              </span>
            )}
          </div>
          
          <div className="bg-emerald-400/[0.02] rounded-2xl p-5 border border-emerald-400/10 text-white/90">
            {steps.length > 0 ? (
              <div className="space-y-2.5 font-sans">
                {steps.map((step, idx) => {
                  const isCompleted = localCompleted.includes(step);
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleStepInternal(step)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border select-none cursor-pointer transition-all duration-200 ${
                        isCompleted 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-white/40" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-white/90 active:scale-[0.99]"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                        isCompleted 
                          ? "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                          : "border-white/20 hover:border-white/40 text-transparent"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className={`text-sm leading-relaxed transition-all ${isCompleted ? "line-through opacity-60" : ""}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 whitespace-pre-line font-sans border-l-2 border-emerald-400/40 pl-4 text-sm leading-relaxed">
                {result.tratamento}
              </div>
            )}
          </div>
        </div>

        {/* Anotações do Utilizador / Histórico de Cuidados */}
        {onSaveNotes && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                Diário da Planta & Acompanhamento
              </h3>
              <span className="text-[10px] text-white/35 font-mono">Guarda local no histórico</span>
            </div>
            
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="Exemplo: Reguei hoje às 09h. Adicionei fertilizante rico em nitrogénio. Evolução foliar..."
                className="w-full h-24 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/10 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-hidden focus:ring-1 focus:ring-emerald-550 resize-none transition-all duration-200"
              />
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                    isSaved
                      ? "bg-emerald-500 text-emerald-950 font-extrabold"
                      : "bg-white/10 hover:bg-white/15 text-emerald-400 border border-white/10"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Guardado com Sucesso!
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Gravar Minhas Notas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-black/30 border-t border-white/5 text-center text-[10px] tracking-wider font-mono text-white/30 uppercase">
        Processamento Bio-Digital de Dados Fitossanitários realtime
      </div>
    </motion.div>
  );
}

