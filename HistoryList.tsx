import React from "react";
import { 
  Trash2, 
  Leaf, 
  Droplet, 
  CheckCircle,
  Activity,
  AlertTriangle,
  Clock,
  ClipboardList
} from "lucide-react";
import type { SavedDiagnosis } from "../types";

interface HistoryListProps {
  history: SavedDiagnosis[];
  selectedId: string | null;
  onSelect: (diagnosis: SavedDiagnosis) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export function HistoryList({ history, selectedId, onSelect, onDelete }: HistoryListProps) {
  
  const getBadgeColor = (status: string) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("saudável") || normalized.includes("saudavel")) {
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
    } else if (normalized.includes("stress hídrico") || normalized.includes("hidrico") || normalized.includes("água") || normalized.includes("agua")) {
      return "bg-blue-500/10 text-blue-300 border border-blue-500/20";
    } else if (normalized.includes("nutriente") || normalized.includes("deficiência") || normalized.includes("deficiencia")) {
      return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
    } else {
      return "bg-rose-500/10 text-rose-300 border border-rose-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("saudável") || normalized.includes("saudavel")) return "Saudável";
    if (normalized.includes("stress hídrico") || normalized.includes("hidrico") || normalized.includes("água") || normalized.includes("agua")) return "Stress Hídrico";
    if (normalized.includes("nutriente") || normalized.includes("deficiência") || normalized.includes("deficiencia")) return "Nutrientes";
    return "Doente";
  };

  if (history.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center py-8">
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
          <Clock className="w-5 h-5" />
        </div>
        <p className="text-white/80 text-sm font-medium">Histórico Vazio</p>
        <p className="text-white/40 text-xs mt-1 leading-relaxed">
          Os diagnósticos serão guardados localmente no seu computador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
      {history.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`group relative flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-200 border text-left ${
              isSelected
                ? "bg-emerald-500/10 text-emerald-100 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                : "bg-white/5 text-white/80 hover:bg-white/10 border-white/5 hover:border-white/10"
            }`}
          >
            {/* Imagem Thumbnail */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img
                src={item.image}
                alt={item.planta}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Nome e Info */}
            <div className="flex-1 min-w-0 pr-6">
              <h4 className="font-semibold text-sm truncate text-white/90">
                {item.planta}
              </h4>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase ${getBadgeColor(item.estado_saude)}`}>
                  {getStatusLabel(item.estado_saude)}
                </span>
                <span className="text-white/40 text-[9px] truncate font-mono">
                  {item.date}
                </span>
                {item.notas && (
                  <span className="text-emerald-400 text-[9px] flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1 py-0.5 border border-emerald-500/10" title="Contém anotações pessoais">
                    <ClipboardList className="w-2.5 h-2.5" />
                    Notas
                  </span>
                )}
              </div>
            </div>

            {/* Botão Eliminar */}
            <button
              onClick={(e) => onDelete(item.id, e)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all duration-150"
              title="Apagar do histórico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

