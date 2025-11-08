'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  const updateConsentMode = useCallback((value: 'granted' | 'denied') => {
    if (typeof window === 'undefined') return;
    
    // Wait for gtag to be available (with retry logic)
    const updateConsent = () => {
      // Update Google Consent Mode
      if (window.gtag) {
        try {
          window.gtag('consent', 'update', {
            analytics_storage: value,
            ad_storage: value
          });
        } catch (error) {
          console.warn('Failed to update consent mode:', error);
        }
      }
      
      // Push event to dataLayer for GTM
      if (window.dataLayer) {
        try {
          if (value === 'granted') {
            window.dataLayer.push({
              event: 'cookie_consent_granted'
            });
          } else {
            window.dataLayer.push({
              event: 'cookie_consent_denied'
            });
          }
        } catch (error) {
          console.warn('Failed to push to dataLayer:', error);
        }
      }
    };

    // Try immediately
    updateConsent();

    // If gtag not available yet, retry after a short delay
    if (!window.gtag && window.dataLayer) {
      setTimeout(updateConsent, 100);
    }
  }, []);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    
    if (!consent) {
      setShow(true);
    } else if (consent === 'granted') {
      // If user previously granted consent, update consent mode
      // Use setTimeout to ensure scripts are loaded
      setTimeout(() => {
        updateConsentMode('granted');
      }, 100);
    }
  }, [updateConsentMode]);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'granted');
    updateConsentMode('granted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'denied');
    updateConsentMode('denied');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm text-white p-4 md:p-6 z-50 border-t border-white/10"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent banner"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm md:text-base">
            We use cookies to analyze site usage and improve your experience.{' '}
            <a 
              href="/privacy-policy" 
              className="underline hover:text-gray-300 transition-colors"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleDecline}
            className="flex-1 sm:flex-none bg-transparent border-white/20 hover:bg-white/10 text-white"
          >
            Decline
          </Button>
          <Button 
            onClick={handleAccept}
            className="flex-1 sm:flex-none"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

