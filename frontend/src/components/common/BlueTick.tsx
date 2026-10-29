import React from 'react';

interface BlueTickProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const BlueTick: React.FC<BlueTickProps> = ({
  size = 'md',
  className = '',
  animate = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-5 h-5', stroke: 2.6, viewBox: '0 0 20 20', r: 9, d: 'M5.5 10.2L8.5 13.2L14.5 7.2' },
    md: { box: 'w-7 h-7', stroke: 2.8, viewBox: '0 0 28 28', r: 12.5, d: 'M7.5 14.3L11.8 18.6L20.5 9.9' },
    lg: { box: 'w-10 h-10', stroke: 3.0, viewBox: '0 0 40 40', r: 18, d: 'M11 20.5L17 26.5L29 14.5' },
    xl: { box: 'w-14 h-14', stroke: 3.2, viewBox: '0 0 56 56', r: 25, d: 'M15.5 28.5L24 37L40.5 20.5' },
  };

  const current = sizeMap[size];

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
        className="w-full h-full overflow-visible drop-shadow-[0_2px_6px_rgba(34,197,94,0.25)]"
      >
        {/* Solid Brand Green Circle */}
        <circle
          cx={size === 'sm' ? 10 : size === 'md' ? 14 : size === 'lg' ? 20 : 28}
          cy={size === 'sm' ? 10 : size === 'md' ? 14 : size === 'lg' ? 20 : 28}
          r={current.r}
          className="fill-[#16834A] dark:fill-[#22C55E]"
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
            strokeDasharray: 36,
            strokeDashoffset: animate ? undefined : 0,
          }}
        />
      </svg>
    </div>
  );
};
