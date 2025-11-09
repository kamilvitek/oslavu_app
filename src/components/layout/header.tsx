"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Users, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when at top of page
      if (currentScrollY < 10) {
        setIsVisible(true);
      } 
      // Hide header when scrolling down, show when scrolling up
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className={`border-b bg-white/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Calendar className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">Oslavu</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="/#about" className="text-muted-foreground hover:text-primary transition-colors">
            About
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {/* <Button variant="ghost" size="sm">
            Sign In
          </Button> */}
          <Button size="sm" asChild>
            <Link href="/#conflict-analyzer">Get your date</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}