import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { GTMHead, GTMNoscript } from "@/components/analytics/GTM";
import { GoogleTag } from "@/components/analytics/GoogleTag";
import { CookieConsentBanner } from "@/components/analytics/CookieConsent";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oslavu - Pick the Perfect Event Date",
  description: "Data-backed event date optimization to avoid conflicts and maximize attendance",
  keywords: ["event planning", "conference dates", "event conflicts", "date optimization"],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Google Tag Manager (GTM) - if GTM_ID is set */}
        {GTM_ID && (
          <>
            <GTMHead gtmId={GTM_ID} />
            <GTMNoscript gtmId={GTM_ID} />
          </>
        )}
        {/* Direct Google Tag (gtag.js) - if GA_MEASUREMENT_ID is set (alternative to GTM) */}
        {!GTM_ID && GA_MEASUREMENT_ID && <GoogleTag measurementId={GA_MEASUREMENT_ID} />}
        <QueryProvider>
          <Header />
          {children}
          <Toaster />
          <CookieConsentBanner />
        </QueryProvider>
      </body>
    </html>
  );
}