'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    
    if (!consent) {
      setShow(true);
    }
    
    // If user previously granted consent, update consent mode
    if (consent === 'granted') {
      updateConsentMode('granted');
    }
  }, []);

  const updateConsentMode = (value: 'granted' | 'denied') => {
    if (typeof window === 'undefined') return;
    
    // Update Google Consent Mode
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: value,
        ad_storage: value
      });
    }
    
    // Push event to dataLayer for GTM
    if (value === 'granted' && window.dataLayer) {
      window.dataLayer.push({
        event: 'cookie_consent_granted'
      });
    }
  };

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

