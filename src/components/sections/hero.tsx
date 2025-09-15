"use client";

import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import Link from "next/link";
import { Calendar, TrendingUp, Users, Shield, BarChart3, Target, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useUSPMetrics } from "@/lib/hooks/use-usp-data";

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const { metrics, isLoading } = useUSPMetrics();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Background with gradient and subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>
      
      {/* Floating elements for visual interest */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-chart-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-32 h-32 bg-chart-secondary/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-chart-success/10 rounded-full blur-xl animate-pulse delay-2000"></div>

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="text-center">
          {/* Main heading with animation */}
          <div className={`transition-all duration-1000 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Pick the Perfect 
              <span className="gradient-primary bg-clip-text text-transparent"> Event Date</span>
            </h1>
          </div>
          
          {/* Subtitle with delay animation */}
          <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'}`}>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Oslavu scores your event date against conferences, meetups, and festivals in your city - backed by 
              <span className="text-chart-primary font-medium"> AI-powered conflict analysis</span> to maximize attendance and ensure your event stands out.
            </p>
          </div>
          
          {/* CTA buttons with animation */}
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'}`}>
            <div className="flex justify-center mb-16">
              <Button size="lg" className="text-lg px-8 py-4 h-auto interactive-element shadow-lg" asChild>
                <Link href="#conflict-analyzer">
                  <Target className="mr-2 h-5 w-5" />
                  Get Your Date
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Feature highlights with metric cards */}
          <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <MetricCard
                title="Conflict Prevention"
                value="100%"
                icon={Shield}
                colorScheme="success"
                description="Automated detection of scheduling conflicts"
                className="interactive-element"
              />
              
              <MetricCard
                title="Data Sources"
                value={isLoading ? "..." : (metrics?.activeAPIs || 0).toString()}
                icon={BarChart3}
                colorScheme="info"
                description={`${metrics?.activeAPIs || 0} APIs covering events, meetups, and festivals`}
                className="interactive-element"
              />
              
              <MetricCard
                title="Analysis Speed"
                value="<30s"
                icon={Zap}
                colorScheme="warning"
                description="Lightning-fast conflict score calculation"
                className="interactive-element"
              />
            </div>
          </div>

          {/* Key benefits with enhanced visuals */}
          <div className={`transition-all duration-1000 delay-900 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-8'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-chart-success/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-chart-success" />
                  </div>
                  <div className="absolute inset-0 bg-chart-success/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Higher Attendance</h3>
                <p className="text-muted-foreground text-sm text-center">Maximize turnout with optimal date selection</p>
              </div>
              
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-chart-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-chart-primary" />
                  </div>
                  <div className="absolute inset-0 bg-chart-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Smart Analysis</h3>
                <p className="text-muted-foreground text-sm text-center">AI-powered conflict detection and prevention</p>
              </div>
              
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-chart-info/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-8 w-8 text-chart-info" />
                  </div>
                  <div className="absolute inset-0 bg-chart-info/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Risk Mitigation</h3>
                <p className="text-muted-foreground text-sm text-center">Protect your investment with data-driven insights</p>
              </div>
              
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-chart-warning/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-8 w-8 text-chart-warning" />
                  </div>
                  <div className="absolute inset-0 bg-chart-warning/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Time Savings</h3>
                <p className="text-muted-foreground text-sm text-center">Skip manual research with automated analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}