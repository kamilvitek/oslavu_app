'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ConsentRecord {
  status: 'granted' | 'denied';
  timestamp: string;
  version: string;
}

const CONSENT_VERSION = '1.0';

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);
  const declineButtonRef = useRef<HTMLButtonElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  const updateConsentMode = useCallback((value: 'granted' | 'denied') => {
    if (typeof window === 'undefined') return;
    
    // Wait for gtag to be available (with retry logic)
    const updateConsent = () => {
      // Ensure dataLayer exists
      if (!window.dataLayer) {
        window.dataLayer = [];
      }
      
      // Update Google Consent Mode v2 using gtag
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
      
      // Push event to dataLayer for GTM tracking (both granted and denied)
      if (window.dataLayer) {
        try {
          window.dataLayer.push({
            event: value === 'granted' ? 'cookie_consent_granted' : 'cookie_consent_denied',
            consent_status: value,
            consent_timestamp: new Date().toISOString()
          });
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
    const consentStr = localStorage.getItem('cookieConsent');
    
    if (!consentStr) {
      setShow(true);
      // Focus management for accessibility
      setTimeout(() => {
        declineButtonRef.current?.focus();
      }, 100);
    } else {
      // Parse stored consent record
      try {
        const consent: ConsentRecord = JSON.parse(consentStr);
        if (consent.status === 'granted') {
          updateConsentMode('granted');
        }
      } catch {
        // Fallback for old format
        if (consentStr === 'granted') {
          updateConsentMode('granted');
        }
      }
    }
  }, [updateConsentMode]);

  const saveConsent = (status: 'granted' | 'denied') => {
    const consentRecord: ConsentRecord = {
      status,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consentRecord));
    updateConsentMode(status);
    setShow(false);
  };

  const handleAccept = () => {
    saveConsent('granted');
  };

  const handleDecline = () => {
    saveConsent('denied');
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  if (!show) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fade-in-up"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent banner"
      aria-modal="true"
    >
      <div className="max-w-7xl mx-auto glass-effect-subtle border rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm md:text-base text-foreground">
              We use cookies to analyze site usage and improve your experience.{' '}
              <a 
                href="/privacy-policy" 
                className="text-primary underline hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            </p>
          </div>
          <div className="flex gap-3 shrink-0 w-full sm:w-auto">
            <Button 
              ref={declineButtonRef}
              variant="outline" 
              onClick={handleDecline}
              onKeyDown={(e) => handleKeyDown(e, handleDecline)}
              className="flex-1 sm:flex-none"
              aria-label="Decline cookies"
            >
              Decline
            </Button>
            <Button 
              ref={acceptButtonRef}
              onClick={handleAccept}
              onKeyDown={(e) => handleKeyDown(e, handleAccept)}
              className="flex-1 sm:flex-none"
              aria-label="Accept cookies"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

