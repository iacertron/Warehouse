import React from 'react';
import { X, Target } from 'lucide-react';

export default function PalletDetail({ seleccionado, onClose }) {
  if (!seleccionado) return null;

  return (
    <div className="absolute bottom-8 right-6 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-80 z-30">
      <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-3">
        <h3 className="font-black text-blue-400 tracking-widest text-sm flex items-center gap-2">
          <Target size={16} /> UBICACIÓN {seleccionado.ubi.ubicacion}
        </h3>
        <X
          className="cursor-pointer text-slate-400 hover:text-white transition-colors"
          onClick={onClose}
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
        {seleccionado.pallets.map((p, i) => (
          <div key={i} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-colors">
            <p className="font-bold text-white text-xs leading-snug mb-2">{p.descripcion}</p>
            <p className="text-[10px] text-blue-400 font-mono font-bold mb-3 tracking-wider">SKU: {p.material}</p>
            <div className="flex justify-between items-end bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Lote</span>
                <span className="text-xs text-slate-300 font-mono">{p.lote || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="font-black text-xl text-emerald-400">{p.cantidad}</span>
                <span className="text-[10px] text-slate-500 font-bold ml-1">{p.unidad}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
