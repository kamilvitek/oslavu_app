import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, TrendingUp, Users, Shield } from "lucide-react";

export function Hero() {
  return (
    <section id="hero" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Pick the Perfect 
            <span className="text-primary"> Event Date</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Oslavu scores your event date against conferences, meetups, and festivals in your city - backed by data-driven conflict analysis to maximize attendance and ensure your event stands out.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-3" asChild>
              <Link href="#conflict-analyzer">Get Your Date</Link>
            </Button>
            {/* <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              View Demo
            </Button> */}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center max-w-3xl mx-auto">
            {/* <div className="flex flex-col items-center">
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">15% Higher Attendance</h3>
              <p className="text-gray-600 text-sm">Validated increase in event turnout</p>
            </div> */}
            
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Avoid Conflicts</h3>
              <p className="text-gray-600 text-sm">Smart analysis prevents scheduling conflicts</p>
            </div>
            
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Data-Driven</h3>
              <p className="text-gray-600 text-sm">Data-based recommendations for success</p>
            </div>
          </div>
      </div>
    </section>
  );
}