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
  BookMarked,
  Rocket,
  ChevronUp
} from 'lucide-react';

export function FloatingNavbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show navbar when scrolled down more than 100px
      if (window.scrollY > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const checkModals = () => {
      // Look for common modal patterns in the app
      const modal = document.querySelector('.fixed.inset-0.z-\\[100\\]') || 
                    document.querySelector('.fixed.inset-0.z-\\[101\\]');
      setIsModalOpen(!!modal);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial checks
    handleScroll();
    checkModals();

    // Use MutationObserver to detect modal additions/removals
    const observer = new MutationObserver(() => {
      checkModals();
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributeFilter: ['class'] 
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Habits', href: '/habits', icon: Repeat },
    { name: 'Books', href: '/books', icon: BookMarked },
    { name: 'Finances', href: '/finances', icon: CircleDollarSign },
    { name: 'Businesses', href: '/businesses', icon: Rocket },
    { name: 'Pantry', href: '/pantry', icon: ShoppingBasket },
  ];

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div 
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        isVisible && !isModalOpen 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      }`}
    >
      <nav className="flex items-center gap-1 p-1.5 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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
              className={`relative flex items-center justify-center p-2.5 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 dark:shadow-white/10' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon size={22} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`} />

              {/* Ping effect for active item */}
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-teal-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
              )}
            </Link>
          );
        })}

        {/* Scroll to Top Button */}
        <div className="w-px h-6 bg-zinc-200/50 dark:bg-zinc-800/50 mx-0.5" />
        <button
          onClick={scrollToTop}
          className="flex items-center justify-center p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 group"
          aria-label="Scroll to top"
        >
          <ChevronUp size={22} className="group-hover:-translate-y-1 transition-transform duration-300" />
        </button>
      </nav>
    </div>
  );
}
