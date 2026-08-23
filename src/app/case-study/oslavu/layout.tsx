import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.oslavu.com"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

interface CaseStudyLayoutProps {
  children: ReactNode;
}

export default function CaseStudyLayout({ children }: CaseStudyLayoutProps) {
  return children;
}
