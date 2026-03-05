import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut, Loader2, ExternalLink } from 'lucide-react';
import { LeadDocument } from '../types';

interface CatalystMediaViewerProps {
  file: LeadDocument & { url: string };
  onClose: () => void;
}

export const CatalystMediaViewer: React.FC<CatalystMediaViewerProps> = ({ file, onClose }) => {
  const isPDF = file.file_type === 'application/pdf';
  const [isLoading, setIsLoading] = React.useState(true);
  const [rotation, setRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-zinc-950/98 backdrop-blur-xl flex flex-col"
    >
      {/* Top Bar */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
            <Maximize2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm tracking-tight truncate max-w-[200px] md:max-w-md">
              {file.file_name}
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type.split('/')[1].toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPDF && (
            <div className="hidden md:flex items-center gap-1 mr-4 border-r border-white/10 pr-4">
              <button 
                onClick={handleZoomOut}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-[10px] font-bold text-white/40 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={handleZoomIn}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button 
                onClick={handleRotate}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all ml-2"
                title="Rotate"
              >
                <RotateCw size={18} />
              </button>
            </div>
          )}
          
          <a 
            href={file.url} 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-xl transition-all flex items-center gap-2"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink size={20} />
            <span className="hidden sm:inline text-xs font-bold">Pantalla Completa</span>
          </a>

          <a 
            href={file.url} 
            download={file.file_name}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all flex items-center gap-2"
            title="Descargar"
          >
            <Download size={20} />
            <span className="hidden sm:inline text-xs font-bold">Descargar</span>
          </a>
          
          <button 
            onClick={onClose} 
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 md:p-12">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
            >
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
                Procesando Stream Seguro...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full h-full flex items-center justify-center relative">
          {isPDF ? (
            <object 
              data={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`} 
              type="application/pdf"
              className="w-full h-full max-w-5xl rounded-2xl shadow-2xl bg-white border-none overflow-hidden"
              onLoad={() => setIsLoading(false)}
            >
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 bg-zinc-900/50 rounded-2xl p-8 text-center">
                <p className="font-bold mb-4">Tu navegador no puede previsualizar el PDF directamente.</p>
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                >
                  Abrir en nueva pestaña
                </a>
              </div>
            </object>
          ) : (
            <motion.div
              animate={{ 
                rotate: rotation,
                scale: zoom
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative"
            >
              <img 
                src={file.url} 
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg" 
                alt={file.file_name}
                onLoad={() => setIsLoading(false)}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-10 px-6 flex items-center justify-between bg-zinc-900/80 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            Conexión Encriptada • Supabase Storage
          </span>
        </div>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          Catalyst Secure Viewer v1.0
        </span>
      </div>
    </motion.div>
  );
};
