"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Target, 
  Repeat, 
  CircleDollarSign, 
  ShoppingBasket,
  BookMarked
} from 'lucide-react';

export function FloatingNavbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show navbar when scrolled down more than 100px
      if (window.scrollY > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Habits', href: '/habits', icon: Repeat },
    { name: 'Books', href: '/books', icon: BookMarked },
    { name: 'Finances', href: '/finances', icon: CircleDollarSign },
    { name: 'Pantry', href: '/pantry', icon: ShoppingBasket },
  ];

  return (
    <div 
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      }`}
    >
      <nav className="flex items-center gap-1.5 p-2 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => {
          // Handle trailing slashes and potential basePath differences
          const normalizedPathname = pathname?.replace(/\/$/, '') || '/';
          const normalizedHref = item.href.replace(/\/$/, '') || '/';
          const isActive = normalizedPathname === normalizedHref;
          
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg shadow-zinc-900/20 dark:shadow-white/10' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon size={20} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} />
              <span className={`text-xs font-bold overflow-hidden transition-all duration-500 ease-in-out ${
                isActive ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0'
              }`}>
                {item.name}
              </span>
              
              {/* Tooltip for non-active items */}
              {!isActive && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-white/10 dark:border-zinc-900/10 uppercase tracking-[0.15em] font-black translate-y-1 group-hover:translate-y-0">
                  {item.name}
                </div>
              )}

              {/* Ping effect for active item */}
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-teal-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
