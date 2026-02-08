import React, { useState, useCallback, useRef } from 'react';

type ServerFirst = 'A' | 'B';

const TOGGLE_MS = 80;
const TOGGLE_COUNT = 12;

export interface ServerSelectorProps {
  nameA: string;
  nameB: string;
  onConfirm: (serverFirst: ServerFirst) => void;
  drawButtonLabel: string;
  startButtonLabel: string;
  servesFirstLabel: string;
  chooseSelfLabel?: string;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  nameA,
  nameB,
  onConfirm,
  drawButtonLabel,
  startButtonLabel,
  servesFirstLabel,
  chooseSelfLabel = 'Or tap a player to choose',
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerFirst | null>(null);
  const [highlight, setHighlight] = useState<ServerFirst | null>(null);
  const [snap, setSnap] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const chooseDirectly = useCallback((side: ServerFirst) => {
    if (selectedServer != null || isDrawing) return;
    setHighlight(side);
    setSelectedServer(side);
  }, [selectedServer, isDrawing]);

  const runDraw = useCallback(() => {
    if (isDrawing || selectedServer != null) return;
    setIsDrawing(true);
    setHighlight(null);

    let count = 0;
    const interval = setInterval(() => {
      setHighlight(c => (c === 'A' ? 'B' : 'A'));
      count++;
      if (count > TOGGLE_COUNT) {
        clearInterval(interval);
        const winner: ServerFirst = Math.random() > 0.5 ? 'A' : 'B';
        setHighlight(winner);
        setSelectedServer(winner);
        setSnap(true);
        setTimeout(() => {
          setSnap(false);
          setIsDrawing(false);
        }, 500);
      }
    }, TOGGLE_MS);
    return () => clearInterval(interval);
  }, [isDrawing, selectedServer]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col min-h-[50vh] rounded-2xl border-2 border-slate-200 bg-slate-100 overflow-hidden transition-transform duration-300 ${snap ? 'animate-serve-decide-snap' : ''}`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <button
          type="button"
          onClick={() => chooseDirectly('A')}
          disabled={isDrawing}
          className={`flex-1 min-h-[22vh] flex items-center justify-center px-6 py-6 border-b border-slate-200/80 transition-all duration-200 w-full text-left disabled:pointer-events-none ${
            highlight === 'A'
              ? 'bg-lime-500 text-slate-900'
              : 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between w-full max-w-sm">
            <span className={`text-sm font-mono uppercase tracking-wider shrink-0 mr-3 ${highlight === 'A' ? 'text-slate-800' : 'text-slate-500'}`}>
              {highlight === 'A' ? 'Serve' : 'A'}
            </span>
            <h2 className="text-xl font-bold uppercase tracking-tight truncate max-w-[70%]">
              {nameA}
            </h2>
            {selectedServer === 'A' && (
              <span className="text-xs font-mono border border-current px-2 py-1 rounded shrink-0 ml-2">
                {servesFirstLabel}
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => chooseDirectly('B')}
          disabled={isDrawing}
          className={`flex-1 min-h-[22vh] flex items-center justify-center px-6 py-6 transition-all duration-200 w-full text-left disabled:pointer-events-none ${
            highlight === 'B'
              ? 'bg-lime-500 text-slate-900'
              : 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-between w-full max-w-sm">
            <span className={`text-sm font-mono uppercase tracking-wider shrink-0 mr-3 ${highlight === 'B' ? 'text-slate-800' : 'text-slate-500'}`}>
              {highlight === 'B' ? 'Serve' : 'B'}
            </span>
            <h2 className="text-xl font-bold uppercase tracking-tight truncate max-w-[70%]">
              {nameB}
            </h2>
            {selectedServer === 'B' && (
              <span className="text-xs font-mono border border-current px-2 py-1 rounded shrink-0 ml-2">
                {servesFirstLabel}
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="shrink-0 border-t border-slate-200">
        {selectedServer == null ? (
          <>
            <button
              type="button"
              className="w-full h-20 bg-slate-900 text-white font-bold text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              onClick={runDraw}
              disabled={isDrawing}
            >
              {drawButtonLabel}
            </button>
            <p className="text-center text-slate-500 text-xs py-2 px-3">
              {chooseSelfLabel}
            </p>
          </>
        ) : (
          <button
            type="button"
            className="w-full h-20 bg-slate-900 text-white font-bold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center"
            onClick={() => onConfirm(selectedServer)}
          >
            {startButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
};
