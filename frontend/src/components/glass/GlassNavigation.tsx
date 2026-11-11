import React from 'react';

export interface GlassNavigationProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: 'header' | 'nav' | 'div';
  position?: 'top' | 'bottom' | 'sticky' | 'fixed' | 'static';
}

export const GlassNavigation: React.FC<GlassNavigationProps> = ({
  children,
  className = '',
  as = 'nav',
  position = 'static',
  ...props
}) => {
  const Component = as as any;

  const positionClasses = {
    top: 'sticky top-0 z-40',
    bottom: 'fixed bottom-0 left-0 right-0 z-40',
    sticky: 'sticky z-30',
    fixed: 'fixed z-40',
    static: 'relative',
  }[position];

  return (
    <Component
      className={`glass-nav ${positionClasses} transition-all ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

