import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InfoTooltip({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center ml-2" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-slate-500 hover:text-[#D1A054] transition-colors focus:outline-none"
        aria-label="Mais informações"
      >
        <Info className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 sm:w-64 p-3 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl pointer-events-none"
          >
            <div className="text-xs text-slate-300 font-sans leading-relaxed font-normal normal-case tracking-normal">
              {text}
            </div>
            {/* simple arrow/triangle pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700/80 rotate-45 -mt-1.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
