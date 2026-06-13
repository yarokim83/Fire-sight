import React, { useState } from 'react';
import { Maximize2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageCarousel({ images, onZoom, onDelete, isEditMode }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black/80 rounded-[2rem] overflow-hidden border-2 border-slate-800 group/carousel shadow-2xl select-none mb-6">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-white text-[10px] font-black tracking-widest flex items-center gap-2 pointer-events-none border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={14} /> TAP TO ENLARGE
            </div>
            
            {isEditMode && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(images[index]); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="absolute top-6 right-6 bg-red-500/80 hover:bg-red-500 text-white p-3.5 rounded-xl shadow-xl z-50 transition-all active:scale-95 flex items-center justify-center"
                    aria-label="Delete image"
                >
                    <Trash2 size={20} />
                </button>
            )}

            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-hover:opacity-100 border border-white/5"><ChevronLeft size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-hover:opacity-100 border border-white/5"><ChevronRight size={32} /></button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl px-6 py-2 rounded-full text-emerald-400 text-xs font-black border border-emerald-500/20 shadow-2xl tracking-widest">{index + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
}
