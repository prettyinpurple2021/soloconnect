import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { playSound } from '../lib/sounds';

export function useSoundFX() {
  const location = useLocation();
  const lastPathname = useRef(location.pathname);

  // Play retro chime on page navigation after the user has interacted at least once
  useEffect(() => {
    if (location.pathname !== lastPathname.current) {
      lastPathname.current = location.pathname;
      
      // Page navigation gets a premium lo-fi success wave chime
      playSound('success');
    }
  }, [location.pathname]);

  // Global event delegation for clicks and hover effects to minimize DOM listeners
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]');
      if (clickable) {
        playSound('click');
      }
    };

    const handleGlobalMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const hoverable = target.closest('button, a, [role="button"]');
      
      if (hoverable) {
        // Track last hovered element on global window registry to avoid repetitive audio spam
        const lastHovered = (window as any).__lastHoveredElement;
        if (lastHovered !== hoverable) {
          (window as any).__lastHoveredElement = hoverable;
          playSound('hover');
        }
      } else {
        (window as any).__lastHoveredElement = null;
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    document.addEventListener('mouseover', handleGlobalMouseOver, { capture: true });

    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      document.removeEventListener('mouseover', handleGlobalMouseOver, { capture: true });
    };
  }, []);
}
