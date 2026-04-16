import React from 'react';

interface PageContainerProps {
 children: React.ReactNode;
 className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="w-full p-4 md:p-8 xl:p-12">
      <div className={`w-full max-w-7xl mx-auto relative z-10 ${className}`}>
        {children}
      </div>
    </div>
  );
}
