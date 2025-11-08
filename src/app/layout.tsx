import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { GTM } from "@/components/analytics/GTM";
import { CookieConsentBanner } from "@/components/analytics/CookieConsent";

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

  return (
    <html lang="en">
      <body className={inter.className}>
        {GTM_ID && <GTM gtmId={GTM_ID} />}
        <QueryProvider>
          {children}
          <Toaster />
          <CookieConsentBanner />
        </QueryProvider>
      </body>
    </html>
  );
}