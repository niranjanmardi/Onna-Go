import React, { useEffect, useRef } from 'react';
import { Trip } from '@/types';
import { playSound } from '@/lib/sounds';
import { MapPin, Calendar, Users, ArrowRight, Home, X, Sparkles, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TripCelebrationModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  onViewTrip?: (trip: Trip) => void;
  onGoDashboard?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'rect';
}

export const TripCelebrationModal: React.FC<TripCelebrationModalProps> = ({
  trip,
  isOpen,
  onClose,
  onViewTrip,
  onGoDashboard,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundPlayedRef = useRef<string | null>(null);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Audio effect triggered once per trip creation
  useEffect(() => {
    if (isOpen && trip && soundPlayedRef.current !== trip.id) {
      soundPlayedRef.current = trip.id;
      // Play pleasant original celebration chime
      playSound('trip_success');
    }
  }, [isOpen, trip]);

  // Canvas particle celebration effect
  useEffect(() => {
    if (!isOpen) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
      '#2563EB', // Blue
      '#16A34A', // Emerald
      '#3B82F6', // Light blue
      '#10B981', // Mint
      '#F59E0B', // Amber
      '#6366F1', // Indigo
      '#EC4899', // Rose
    ];

    const particles: Particle[] = [];
    const particleCount = 75;
    const centerX = width / 2;
    const centerY = height * 0.42;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = 4 + Math.random() * 8;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 3,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      });
    }

    const startTime = Date.now();
    const duration = 2800; // 2.8 seconds

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const fadeProgress = elapsed / duration;
      const globalAlpha = Math.max(0, 1 - fadeProgress * 1.15);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.985; // drag
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.globalAlpha = p.opacity * globalAlpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen || !trip) return null;

  const formatDateRange = () => {
    if (!trip.start_date) return null;
    const start = new Date(trip.start_date);
    const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!trip.end_date) return startStr;
    const end = new Date(trip.end_date);
    const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  };

  const datesFormatted = formatDateRange();

  const handleView = () => {
    onClose();
    if (onViewTrip) {
      onViewTrip(trip);
    } else {
      navigate(`/trips/${trip.id}`);
    }
  };

  const handleDashboard = () => {
    onClose();
    if (onGoDashboard) {
      onGoDashboard();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-subtitle"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/60 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      {/* Particle Celebration Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-10 w-full h-full"
        aria-hidden="true"
      />

      {/* Main Card */}
      <div
        className="relative z-20 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden text-center p-6 sm:p-8 transform transition-all duration-300 scale-100 animate-in zoom-in-95"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            {/* Glowing Aura Ring */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-400 to-blue-500 rounded-full blur-lg opacity-40 animate-pulse" />
            
            {/* Success Check Badge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center shadow-xl ring-4 ring-white">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 text-white stroke-[3.2] animate-in zoom-in-50 duration-300" />
            </div>

            {/* Sparkle badge */}
            <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1.5 rounded-full shadow-md animate-bounce">
              <Sparkles className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
        </div>

        {/* Subtitle / Delight Message */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200/60 mb-2">
          <span>Trip Created Successfully</span>
        </div>

        <h2
          id="celebration-title"
          className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mb-2"
        >
          {trip.name}
        </h2>

        <p id="celebration-subtitle" className="text-sm sm:text-base text-neutral-600 font-medium mb-6">
          Your next adventure starts here!
        </p>

        {/* Trip Summary Details Card */}
        <div className="bg-neutral-50/80 rounded-2xl p-4 mb-6 border border-neutral-100 text-left space-y-2.5">
          {trip.destination && (
            <div className="flex items-center text-sm text-neutral-700">
              <MapPin className="w-4 h-4 text-emerald-600 mr-2.5 flex-shrink-0" />
              <span className="font-medium text-neutral-900">{trip.destination}</span>
            </div>
          )}

          {datesFormatted && (
            <div className="flex items-center text-sm text-neutral-700">
              <Calendar className="w-4 h-4 text-blue-600 mr-2.5 flex-shrink-0" />
              <span>{datesFormatted}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200/60">
            <span className="flex items-center gap-1 font-mono">
              Invite Code: <strong className="text-neutral-800 tracking-wider text-sm">{trip.invite_code}</strong>
            </span>
            <span className="flex items-center gap-1 text-neutral-600">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              1 Member (Owner)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleView}
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <span>View Trip</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleDashboard}
            className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-neutral-200/80 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            <Home className="w-4 h-4 text-neutral-500" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
