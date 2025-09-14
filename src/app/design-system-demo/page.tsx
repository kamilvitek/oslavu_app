"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressIndicator, ProgressStep } from "@/components/ui/progress-indicator";
import { StatusBadge, SuccessBadge, WarningBadge, ErrorBadge, InfoBadge, PendingBadge } from "@/components/ui/status-badge";
import { ConflictHeatmap, ConflictDataPoint } from "@/components/data-visualization/conflict-heatmap";
import { AnalyticsChart, ChartDataPoint } from "@/components/data-visualization/analytics-chart";
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Shield, 
  BarChart3, 
  Target, 
  Zap, 
  Clock, 
  Building,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function DesignSystemDemo() {
  const [selectedStep, setSelectedStep] = useState('step2');

  // Sample data for demonstrations
  const sampleMetrics = [
    { title: "Total Events", value: 1247, change: 12.5, icon: Calendar, colorScheme: "info" as const },
    { title: "Conflict Score", value: 23, change: -8.2, icon: AlertTriangle, colorScheme: "warning" as const },
    { title: "Success Rate", value: "94%", change: 2.1, icon: CheckCircle, colorScheme: "success" as const },
    { title: "Processing Time", value: "24s", change: -15.3, icon: Zap, colorScheme: "neutral" as const }
  ];

  const progressSteps: ProgressStep[] = [
    { id: 'step1', label: 'Initialize', description: 'Setting up analysis', status: 'completed' },
    { id: 'step2', label: 'Fetch Data', description: 'Gathering event information', status: 'in-progress' },
    { id: 'step3', label: 'Analyze', description: 'Processing conflicts', status: 'pending' },
    { id: 'step4', label: 'Generate', description: 'Creating recommendations', status: 'pending' },
    { id: 'step5', label: 'Complete', description: 'Analysis finished', status: 'pending' }
  ];

  const heatmapData: ConflictDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2024, 2, i + 1).toISOString(),
    conflictScore: Math.random() * 100,
    riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High',
    eventCount: Math.floor(Math.random() * 10) + 1,
    dayOfWeek: new Date(2024, 2, i + 1).toLocaleDateString('en-US', { weekday: 'long' })
  }));

  const chartData: ChartDataPoint[] = [
    { label: 'Jan', value: 45, trend: 'up' },
    { label: 'Feb', value: 38, trend: 'down' },
    { label: 'Mar', value: 52, trend: 'up' },
    { label: 'Apr', value: 61, trend: 'up' },
    { label: 'May', value: 43, trend: 'down' },
    { label: 'Jun', value: 67, trend: 'up' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Design System
            <span className="gradient-primary bg-clip-text text-transparent"> Demo</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Showcase of the enhanced Oslavu design system with data visualization components, 
            interactive elements, and modern styling.
          </p>
        </div>

        <div className="space-y-12">
          {/* Metric Cards Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Metric Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sampleMetrics.map((metric, index) => (
                <MetricCard
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  change={metric.change}
                  changeLabel="vs last month"
                  icon={metric.icon}
                  colorScheme={metric.colorScheme}
                  trend={metric.change > 0 ? 'up' : 'down'}
                  className="interactive-element"
                />
              ))}
            </div>
          </section>

          {/* Status Badges Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Status Badges</h2>
            <Card className="glass-effect">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <SuccessBadge label="Analysis Complete" />
                    <WarningBadge label="High Risk Date" />
                    <ErrorBadge label="API Error" />
                    <InfoBadge label="Processing" />
                    <PendingBadge label="In Queue" />
                    <StatusBadge status="neutral" label="Neutral" />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <SuccessBadge label="Success" variant="outline" />
                    <WarningBadge label="Warning" variant="outline" />
                    <ErrorBadge label="Error" variant="outline" />
                    <InfoBadge label="Info" variant="outline" />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SuccessBadge label="Large" size="lg" />
                    <WarningBadge label="Medium" size="md" />
                    <ErrorBadge label="Small" size="sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Progress Indicator Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Progress Indicators</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Horizontal Progress</CardTitle>
                  <CardDescription>Shows analysis progress horizontally</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressIndicator
                    steps={progressSteps}
                    currentStep={selectedStep}
                    variant="horizontal"
                  />
                  <div className="flex gap-2 mt-4">
                    {progressSteps.map(step => (
                      <Button
                        key={step.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStep(step.id)}
                        className={selectedStep === step.id ? 'bg-primary text-primary-foreground' : ''}
                      >
                        {step.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Vertical Progress</CardTitle>
                  <CardDescription>Shows analysis progress vertically</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressIndicator
                    steps={progressSteps}
                    currentStep={selectedStep}
                    variant="vertical"
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Data Visualization Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Data Visualization</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsChart
                data={chartData}
                title="Monthly Conflict Trends"
                description="Event conflict scores over time"
                type="bar"
                showTrend={true}
                formatValue={(value) => `${value}%`}
              />

              <AnalyticsChart
                data={chartData}
                title="Risk Assessment Timeline"
                description="Trend analysis of event risks"
                type="area"
                showTrend={false}
                formatValue={(value) => `${value} events`}
              />
            </div>
          </section>

          {/* Conflict Heatmap Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Conflict Heatmap</h2>
            <ConflictHeatmap
              data={heatmapData}
              title="March 2024 Conflict Analysis"
              description="Daily conflict scores and risk levels"
              onDateClick={(date) => console.log('Selected date:', date)}
            />
          </section>

          {/* Interactive Elements Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Interactive Elements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="interactive-element glass-effect">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="h-8 w-8 text-chart-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Hover Effect</h3>
                    <p className="text-muted-foreground text-sm">Interactive card with hover animations</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="metric-card metric-card--success">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-chart-success" />
                    <h3 className="font-semibold text-lg mb-2">Success State</h3>
                    <p className="text-muted-foreground text-sm">Success-themed metric card</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="metric-card metric-card--warning">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-chart-warning" />
                    <h3 className="font-semibold text-lg mb-2">Warning State</h3>
                    <p className="text-muted-foreground text-sm">Warning-themed metric card</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Color Palette Section */}
          <section className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-foreground mb-6">Color Palette</h2>
            <Card className="glass-effect">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-primary rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Primary</p>
                    <p className="text-xs text-muted-foreground">Chart Primary</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-secondary rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Secondary</p>
                    <p className="text-xs text-muted-foreground">Chart Secondary</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-success rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Success</p>
                    <p className="text-xs text-muted-foreground">Chart Success</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-warning rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Warning</p>
                    <p className="text-xs text-muted-foreground">Chart Warning</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-error rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Error</p>
                    <p className="text-xs text-muted-foreground">Chart Error</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-chart-info rounded-lg mx-auto mb-2"></div>
                    <p className="text-sm font-medium">Info</p>
                    <p className="text-xs text-muted-foreground">Chart Info</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
