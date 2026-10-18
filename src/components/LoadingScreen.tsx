import { useState, useEffect } from 'react';
import logoImg from '@/assets/realtech-logo.png';
import { RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  minimal?: boolean;
  message?: string;
  logoUrl?: string;
}

export function LoadingScreen({ minimal = false, message, logoUrl }: LoadingScreenProps) {
  const [statusStep, setStatusStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [imgErrorCount, setImgErrorCount] = useState(0);

  const getInitialLogo = () => {
    if (logoUrl) return logoUrl;
    try {
      const stored = localStorage.getItem('site_logo_url');
      if (stored && stored.trim()) return stored;
    } catch {}
    return logoImg;
  };

  const [currentLogo, setCurrentLogo] = useState<string>(getInitialLogo);

  const handleImageError = () => {
    setImgErrorCount((prev) => {
      const next = prev + 1;
      if (next === 1) {
        setCurrentLogo(logoImg);
      } else if (next === 2) {
        setCurrentLogo('/realtech-logo.png');
      }
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const step1 = setTimeout(() => setStatusStep(1), 1500);
    const step2 = setTimeout(() => setStatusStep(2), 3500);
    const step3 = setTimeout(() => setStatusStep(3), 6000);

    return () => {
      clearInterval(timer);
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, []);

  const getStatusText = () => {
    if (message) return message;
    switch (statusStep) {
      case 0:
        return 'Starting Realtech Computer…';
      case 1:
        return 'Connecting to store services…';
      case 2:
        return 'Preparing products & catalog…';
      case 3:
      default:
        return 'Almost ready, finalizing connection…';
    }
  };

  if (minimal) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-9 h-9 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">{message || "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-7 px-4">
        {/* Logo with pulse ring */}
        <div className="relative">
          {/* Outer ring animation */}
          <div className="absolute -inset-3.5 rounded-2xl border border-primary/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30" />
          <div className="absolute -inset-1.5 rounded-xl border border-primary/15 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-20" />
          
          {/* Logo container */}
          <div className="w-16 h-16 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-center overflow-hidden p-2">
            {imgErrorCount >= 3 ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-sky-600 flex items-center justify-center text-primary-foreground font-black text-xl shadow-inner">
                R
              </div>
            ) : (
              <img 
                src={currentLogo} 
                alt="Realtech Logo" 
                className="w-full h-full object-contain animate-fade-in"
                onError={handleImageError}
              />
            )}
          </div>
        </div>

        {/* Brand & Loading bar */}
        <div className="w-56 flex flex-col items-center space-y-3">
          <div className="text-sm font-semibold text-foreground tracking-tight">Realtech Computer</div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 rounded-full"
              style={{
                width: '45%',
                animation: 'loading-bar 1.3s ease-in-out infinite',
              }}
            />
          </div>

          {/* Active Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 border border-border/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <p className="text-[12px] font-medium text-muted-foreground transition-all duration-200">
              {getStatusText()}
            </p>
          </div>

          {/* Long wait helper */}
          {elapsed >= 8 && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Taking a moment? Tap to refresh</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(220%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

