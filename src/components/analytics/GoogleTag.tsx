import Script from 'next/script';

interface GoogleTagProps {
  measurementId: string;
}

/**
 * Component for direct Google Tag (gtag.js) implementation
 * This is for Google Analytics 4 (GA4) with Measurement ID format G-XXXXXXXXXX
 * Use this if you want direct GA4 implementation instead of GTM
 */
export function GoogleTag({ measurementId }: GoogleTagProps) {
  if (!measurementId) return null;

  return (
    <>
      {/* CRITICAL: Consent Mode MUST load before Google Tag */}
      <Script
        id="gtag-consent-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_personalization': 'denied',
              'ad_user_data': 'denied',
              'wait_for_update': 500
            });
          `
        }}
      />
      
      {/* Google Tag (gtag.js) - must be in head, using beforeInteractive to ensure it's in head */}
      <Script
        id="gtag-script-loader"
        strategy="beforeInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="gtag-script-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `
        }}
      />
    </>
  );
}

