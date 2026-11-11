import React from 'react';

export interface BlueTickProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animate?: boolean;
  color?: 'blue' | 'green';
}

export const BlueTick: React.FC<BlueTickProps> = ({
  size = 'md',
  className = '',
  animate = true,
  color = 'blue',
}) => {
  const sizeMap = {
    sm: { box: 'w-5 h-5', stroke: 2.6, viewBox: '0 0 20 20', cx: 10, cy: 10, r: 9, d: 'M5.5 10.2L8.5 13.2L14.5 7.2' },
    md: { box: 'w-7 h-7', stroke: 2.8, viewBox: '0 0 28 28', cx: 14, cy: 14, r: 12.5, d: 'M7.5 14.3L11.8 18.6L20.5 9.9' },
    lg: { box: 'w-10 h-10', stroke: 3.0, viewBox: '0 0 40 40', cx: 20, cy: 20, r: 18, d: 'M11 20.5L17 26.5L29 14.5' },
    xl: { box: 'w-14 h-14', stroke: 3.4, viewBox: '0 0 56 56', cx: 28, cy: 28, r: 25, d: 'M15.5 28.5L24 37L40.5 20.5' },
    '2xl': { box: 'w-20 h-20 sm:w-24 sm:h-24', stroke: 4.2, viewBox: '0 0 80 80', cx: 40, cy: 40, r: 36, d: 'M22 41L34 53L58 29' },
  };

  const current = sizeMap[size];

  const colorStyles =
    color === 'green'
      ? {
          fill: 'fill-[#16834A] dark:fill-[#22C55E]',
          glow: 'drop-shadow-[0_2px_8px_rgba(34,197,94,0.35)]',
        }
      : {
          fill: 'fill-[#2563EB] dark:fill-[#3B82F6]',
          glow: 'drop-shadow-[0_4px_16px_rgba(37,99,235,0.45)]',
        };

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 select-none ${current.box} ${
        animate ? 'animate-blue-tick-pop motion-reduce:animate-none' : ''
      } ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox={current.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible ${colorStyles.glow}`}
      >
        {/* Solid Circle */}
        <circle
          cx={current.cx}
          cy={current.cy}
          r={current.r}
          className={colorStyles.fill}
        />

        {/* Animated Self-Drawing White Checkmark */}
        <path
          d={current.d}
          stroke="#FFFFFF"
          strokeWidth={current.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? 'animate-blue-check-draw motion-reduce:animate-none' : ''}
          style={{
            strokeDasharray: 54,
            strokeDashoffset: animate ? undefined : 0,
          }}
        />
      </svg>
    </div>
  );
};
