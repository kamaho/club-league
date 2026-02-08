import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const THRESHOLD_START = 90; // slide past 90% then release to start app

const goToNextScreen = (navigate: (path: string) => void) => {
  const user = authService.getCurrentUser();
  if (user) {
    navigate('/');
  } else {
    navigate('/login');
  }
};

export const Splash: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  progressRef.current = progress;

  // When user releases pointer outside the slider, still check threshold
  useEffect(() => {
    if (!isDragging) return;
    const onGlobalPointerUp = () => {
      setIsDragging(false);
      if (progressRef.current >= THRESHOLD_START) {
        goToNextScreen(navigate);
      }
    };
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  }, [isDragging, navigate]);

  const updateSlider = useCallback(
    (clientX: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const percent = (x / rect.width) * 100;
      setProgress(percent);
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updateSlider(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [updateSlider]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateSlider(e.clientX);
    },
    [isDragging, updateSlider]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
      if (progress >= THRESHOLD_START) {
        goToNextScreen(navigate);
      }
    },
    [navigate, progress]
  );

  // Serve speed (km/h) scales with slider progress
  const serveKmh = Math.round(80 + (progress / 100) * 140);

  return (
    <div
      className="splash-clay"
      style={{ ['--splash-progress' as string]: `${progress}%` }}
    >
      {/* SVG filters (must be in DOM for the track/trail effect) */}
      <svg aria-hidden className="absolute w-0 h-0 overflow-hidden">
        <defs>
          <filter id="splash-crush-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Grain overlay */}
      <div className="splash-texture-overlay" aria-hidden>
        <svg width="100%" height="100%">
          <rect width="100%" height="100%" filter="url(#splash-grain)" />
        </svg>
      </div>

      <div className="splash-court-container">
        <header className="splash-header">
          <div className="splash-header-left">
            <h1 className="splash-title">
              Court<br />King
            </h1>
            <div className="splash-stats-box">
              <div className="splash-label">Serve (km/h)</div>
              <div className="splash-value" aria-live="polite">
                {serveKmh}
              </div>
            </div>
          </div>
        </header>

        <div
          ref={sliderRef}
          className="splash-slider-wrapper"
          role="slider"
          aria-label="Slide to start the app"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
              e.preventDefault();
              setProgress((p) => Math.min(100, p + 15));
            }
            if (e.key === 'Enter' && progress >= THRESHOLD_START) {
              goToNextScreen(navigate);
            }
          }}
        >
          <div className="splash-terracotta-track">
            <div className="splash-clay-line" />
            <div className="splash-displacement-trail" />
          </div>
          <div
            className={`splash-tennis-ball ${isDragging ? 'splash-dragging' : ''}`}
            style={{
              transform: `translate(-50%, 0) rotate(${progress * 3.6}deg)`,
            }}
          />
        </div>

        <p className="splash-hint">Slide to start →</p>

        <div className="splash-footer-data">
          <div className="splash-data-point">
            <div className="splash-meta">Grip size</div>
            <div className="splash-readout">4 ¼"</div>
          </div>
          <div className="splash-data-point">
            <div className="splash-meta">Weight</div>
            <div className="splash-readout">300 g</div>
          </div>
          <div className="splash-data-point">
            <div className="splash-meta">Balance</div>
            <div className="splash-readout">Head light</div>
          </div>
        </div>
      </div>
    </div>
  );
};
