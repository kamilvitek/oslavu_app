"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  TrendingUp, 
  Zap, 
  Shield, 
  Globe, 
  Clock,
  BarChart3,
  Users
} from "lucide-react";
import { useUSPMetrics } from "@/lib/hooks/use-usp-data";
import { DataSourcesList } from "@/components/data-visualization/data-sources-list";

export function Features() {
  const { metrics, isLoading } = useUSPMetrics();
  
  const features = [
    {
      icon: Calendar,
      title: "Multi-Source Data Ingestion",
      description: isLoading 
        ? "Loading data sources..." 
        : `Automatically pulls events from ${metrics?.activeAPIs || 0} APIs and over a thousand local sources`,
    },
    {
      icon: Shield,
      title: "Smart Deduplication",
      description: "Advanced algorithms detect and merge duplicate events across platforms for accurate analysis.",
    },
    {
      icon: TrendingUp,
      title: "Conflict Score Engine",
      description: "Proprietary scoring system calculates risk levels based on audience overlap and event proximity.",
    },
    {
      icon: Globe,
      title: "Global City Coverage",
      description: isLoading 
        ? "Loading coverage data..." 
        : `Covering ${metrics?.coverage?.cities || 0} cities across ${metrics?.coverage?.countries || 0} regions with comprehensive data sources.`,
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Event Success
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to make data-driven decisions about your event dates
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Sources Section */}
        <div className="mt-16">
          <DataSourcesList />
        </div>

        <div className="mt-16 text-center">
          <Card className="w-full mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Optimize Your Event Dates?</CardTitle>
              <CardDescription className="text-lg">
                Join event organizers who wants to increase attendance and revenue with Oslavu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center justify-items-center">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {isLoading ? "..." : (metrics?.activeAPIs || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Active APIs monitored</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">Real-time conflict monitoring</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}