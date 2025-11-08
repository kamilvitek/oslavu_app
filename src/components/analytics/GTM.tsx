import Script from 'next/script';

interface GTMProps {
  gtmId: string;
}

// Component for GTM scripts that go in the <head>
// This is a server component so Next.js can properly place scripts in the head
export function GTMHead({ gtmId }: GTMProps) {
  return (
    <>
      {/* CRITICAL: Consent Mode MUST load before GTM */}
      <Script
        id="gtm-consent-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'wait_for_update': 500
            });
          `
        }}
      />
      
      {/* GTM Script - must be in head, using beforeInteractive to ensure it's in head */}
      <Script
        id="gtm-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `
        }}
      />
    </>
  );
}

// Component for GTM noscript that goes right after <body> tag
export function GTMNoscript({ gtmId }: GTMProps) {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}

// Legacy export for backwards compatibility
export function GTM({ gtmId }: GTMProps) {
  return (
    <>
      <GTMHead gtmId={gtmId} />
      <GTMNoscript gtmId={gtmId} />
    </>
  );
}

