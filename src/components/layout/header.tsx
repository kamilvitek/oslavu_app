"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Users, Target } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/#hero" className="flex items-center space-x-2">
          <Calendar className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">Oslavu</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">
            Features
          </Link>
          {/* <Link href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </Link> */}
          <Link href="#about" className="text-muted-foreground hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/test-ticketmaster" className="text-muted-foreground hover:text-primary transition-colors">
            Test Ticketmaster
          </Link>
          <Link href="/test-eventbrite" className="text-muted-foreground hover:text-primary transition-colors">
            Test Eventbrite
          </Link>
          <Link href="/test-conflict-analysis" className="text-muted-foreground hover:text-primary transition-colors">
            Test Analysis
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