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
        className="relative z-20 w-full max-w-lg bg-white dark:bg-[#141416] rounded-3xl shadow-2xl border border-[#E4E4E7] dark:border-[#2A2A2E] overflow-hidden text-center p-6 sm:p-8 transform transition-all duration-300 scale-100 animate-in zoom-in-95"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] hover:bg-[#F4F4F5] dark:hover:bg-[#1B1B1E] rounded-full transition-colors focus:outline-none cursor-pointer"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            {/* Subtle Green Circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#DDF5E5] dark:bg-[#16834A]/20 flex items-center justify-center border border-[#BCEAC8] dark:border-[#22C55E]/30">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-[#16834A] dark:text-[#4ADE80] stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Subtitle / Delight Message */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DDF5E5] dark:bg-[#16834A]/20 text-[#16834A] dark:text-[#4ADE80] text-xs font-semibold rounded-full border border-[#BCEAC8] dark:border-[#22C55E]/30 mb-2">
          <span>Trip Created Successfully</span>
        </div>

        <h2
          id="celebration-title"
          className="text-2xl sm:text-3xl font-extrabold text-[#18181B] dark:text-[#F5F5F7] tracking-tight mb-2"
        >
          {trip.name}
        </h2>

        <p id="celebration-subtitle" className="text-sm text-[#71717A] dark:text-[#A1A1AA] font-normal mb-6">
          Your journey is ready. Invite members and start tracking expenses.
        </p>

        {/* Trip Summary Details Card */}
        <div className="bg-[#FAFAF8] dark:bg-[#1B1B1E] rounded-2xl p-4 mb-6 border border-[#E4E4E7] dark:border-[#2A2A2E] text-left space-y-2.5">
          {trip.destination && (
            <div className="flex items-center text-sm text-[#18181B] dark:text-[#F5F5F7]">
              <MapPin className="w-4 h-4 text-[#16834A] dark:text-[#22C55E] mr-2.5 flex-shrink-0" />
              <span className="font-medium">{trip.destination}</span>
            </div>
          )}

          {datesFormatted && (
            <div className="flex items-center text-sm text-[#71717A] dark:text-[#A1A1AA]">
              <Calendar className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA] mr-2.5 flex-shrink-0" />
              <span>{datesFormatted}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA] pt-2 border-t border-[#E4E4E7] dark:border-[#2A2A2E]">
            <span className="flex items-center gap-1 font-mono">
              Invite Code: <strong className="text-[#18181B] dark:text-[#F5F5F7] tracking-wider text-sm">{trip.invite_code}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
              1 Member (Owner)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleView}
            className="flex-1 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0B0B0C] font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>View Trip</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleDashboard}
            className="flex-1 bg-[#F4F4F5] dark:bg-[#1B1B1E] hover:bg-[#E4E4E7] dark:hover:bg-[#222226] text-[#18181B] dark:text-[#F5F5F7] border border-[#E4E4E7] dark:border-[#2A2A2E] font-medium py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
