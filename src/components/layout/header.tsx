"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="bg-background rounded-2xl shadow-sm mt-4 border border-border">
          <div className="px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-2 flex-shrink-0"
              aria-label="Oslavu Home"
            >
              <Calendar className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="text-2xl font-bold text-foreground">Oslavu</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav 
              className="hidden md:flex items-center space-x-8 ml-8"
              aria-label="Main navigation"
            >
              <Link 
                href="/#features" 
                className="text-foreground hover:text-primary transition-colors font-medium text-sm"
              >
                Features
              </Link>
              <Link 
                href="/#about" 
                className="text-foreground hover:text-primary transition-colors font-medium text-sm"
              >
                About
              </Link>
              <Link 
                href="/#faq" 
                className="text-foreground hover:text-primary transition-colors font-medium text-sm"
              >
                FAQ
              </Link>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-3 ml-auto">
              <Button 
                variant="default"
                size="sm" 
                asChild
              >
                <Link href="/#conflict-analyzer">Get your date</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center ml-auto">
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-foreground" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6 text-foreground" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-foreground/10 backdrop-blur-sm z-30"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          {/* Menu Content */}
          <div className="md:hidden fixed inset-x-0 top-[88px] bg-background z-40 shadow-lg border-t border-border">
            <nav 
              className="container mx-auto px-4 py-6 space-y-4"
              aria-label="Mobile navigation"
            >
              <Link 
                href="/#features" 
                className="block text-foreground hover:text-primary transition-colors font-medium text-base py-2"
                onClick={closeMobileMenu}
              >
                Features
              </Link>
              <Link 
                href="/#about" 
                className="block text-foreground hover:text-primary transition-colors font-medium text-base py-2"
                onClick={closeMobileMenu}
              >
                About
              </Link>
              <Link 
                href="/#faq" 
                className="block text-foreground hover:text-primary transition-colors font-medium text-base py-2"
                onClick={closeMobileMenu}
              >
                FAQ
              </Link>
              <div className="pt-4 border-t border-border">
                <Button 
                  variant="default"
                  size="sm" 
                  asChild
                  className="w-full"
                >
                  <Link href="/#conflict-analyzer" onClick={closeMobileMenu}>
                    Get your date
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}