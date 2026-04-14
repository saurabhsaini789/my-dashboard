import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="w-full px-4 md:px-8 xl:px-12 pt-6 md:pt-10">
      <div className={`w-full max-w-7xl mx-auto flex flex-col gap-8 md:gap-10 relative z-10 ${className}`}>
        {children}
      </div>
    </div>
  );
}
