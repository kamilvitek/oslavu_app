"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, SuccessBadge, WarningBadge, ErrorBadge, InfoBadge } from "@/components/ui/status-badge";
import { ProgressIndicator, ProgressStep } from "@/components/ui/progress-indicator";
import { MetricCard } from "@/components/ui/metric-card";
import { Calendar, MapPin, Users, Target, AlertTriangle, CheckCircle, Loader2, RefreshCw, Building, BarChart3, Clock, Zap } from "lucide-react";
import { ConflictAnalysisForm } from "@/components/forms/conflict-analysis-form";
import { conflictAnalysisService, ConflictAnalysisResult, DateRecommendation } from "@/lib/services/conflict-analysis";
// OpenAI service is now accessed via API endpoint

export function ConflictAnalyzer() {
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openaiAvailable, setOpenaiAvailable] = useState(false);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState<string>('');

  const analysisSteps: ProgressStep[] = [
    {
      id: 'initializing',
      label: 'Initializing',
      description: 'Setting up analysis parameters',
      status: 'pending'
    },
    {
      id: 'fetching-events',
      label: 'Fetching Events',
      description: 'Gathering event data from multiple sources',
      status: 'pending'
    },
    {
      id: 'analyzing-conflicts',
      label: 'Analyzing Conflicts',
      description: 'Calculating conflict scores and risk levels',
      status: 'pending'
    },
    {
      id: 'generating-recommendations',
      label: 'Generating Recommendations',
      description: 'Creating personalized date recommendations',
      status: 'pending'
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Analysis finished successfully',
      status: 'pending'
    }
  ];

  useEffect(() => {
    // Check if OpenAI is available via API
    const checkOpenAIStatus = async () => {
      try {
        const response = await fetch('/api/analyze/audience-overlap');
        const data = await response.json();
        setOpenaiAvailable(data.openaiAvailable || false);
      } catch (error) {
        console.error('Failed to check OpenAI status:', error);
        setOpenaiAvailable(false);
      }
    };
    
    checkOpenAIStatus();
  }, []);

  const updateAnalysisProgress = (stepId: string, status: 'pending' | 'in-progress' | 'completed' | 'error') => {
    setCurrentAnalysisStep(stepId);
  };

  const handleAnalysisComplete = async (formData: any) => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setCurrentAnalysisStep('initializing');

    try {
      // Simulate progress updates
      updateAnalysisProgress('initializing', 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 500));

      updateAnalysisProgress('fetching-events', 'in-progress');
      
      // Call the API endpoint instead of the service directly
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: formData.city,
          category: formData.category,
          subcategory: formData.subcategory,
          expectedAttendees: formData.expectedAttendees,
          dateRange: {
            start: formData.dateRangeStart,
            end: formData.dateRangeEnd
          },
          preferredDates: [formData.startDate, formData.endDate],
          enableAdvancedAnalysis: true, // Always enabled for best results
          enablePerplexityResearch: false // Disabled - toggle via terminal script
        })
      });

      updateAnalysisProgress('analyzing-conflicts', 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateAnalysisProgress('generating-recommendations', 'in-progress');
      const data = await response.json();
      
      if (response.ok && data.data) {
        updateAnalysisProgress('complete', 'completed');
        setAnalysisResult(data.data);
      } else {
        setError(data.error || 'Failed to analyze conflicts');
        setCurrentAnalysisStep('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze conflicts');
      setCurrentAnalysisStep('');
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-700';
      case 'Medium': return 'text-yellow-700';
      case 'High': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  const getRiskBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-50 border-green-200';
      case 'Medium': return 'bg-yellow-50 border-yellow-200';
      case 'High': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskTextColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-900';
      case 'Medium': return 'text-yellow-900';
      case 'High': return 'text-red-900';
      default: return 'text-gray-900';
    }
  };

  const getRiskDetailColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <section id="conflict-analyzer" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Analyze Your Event Date
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get instant AI-powered conflict analysis for your event. See competing events, 
            festivals, and major gatherings that could impact your attendance with detailed 
            risk assessments and recommendations.
          </p>
        </div>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass-effect-strong shadow-centered">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-chart-primary" />
                  <span>Event Details</span>
                </CardTitle>
                <CardDescription>
                  Tell us about your event to get personalized AI-powered conflict analysis with 
                  detailed risk assessments and venue intelligence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConflictAnalysisForm onAnalysisComplete={handleAnalysisComplete} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              {loading && (
                <Card className="glass-effect">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-chart-info animate-pulse" />
                      <span>Analysis in Progress</span>
                    </CardTitle>
                    <CardDescription>
                      Processing your event data and calculating conflict scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ProgressIndicator 
                      steps={analysisSteps.map(step => ({
                        ...step,
                        status: step.id === currentAnalysisStep ? 'in-progress' : 
                               analysisSteps.findIndex(s => s.id === step.id) < 
                               analysisSteps.findIndex(s => s.id === currentAnalysisStep) ? 'completed' : 'pending'
                      }))}
                      currentStep={currentAnalysisStep}
                      variant="vertical"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <MetricCard
                        title="Data Sources"
                        value="3+"
                        icon={BarChart3}
                        colorScheme="info"
                        description="APIs being queried"
                        isLoading={false}
                      />
                      <MetricCard
                        title="Processing Time"
                        value="~30s"
                        icon={Clock}
                        colorScheme="neutral"
                        description="Estimated completion"
                        isLoading={false}
                      />
                      <MetricCard
                        title="Analysis Depth"
                        value={openaiAvailable ? "AI+" : "STD"}
                        icon={Zap}
                        colorScheme={openaiAvailable ? "success" : "warning"}
                        description={openaiAvailable ? "AI-enhanced" : "Rule-based"}
                        isLoading={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card className="border-chart-error/20 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="py-8">
                    <div className="text-center space-y-4">
                      <AlertTriangle className="h-12 w-12 mx-auto text-chart-error" />
                      <div>
                        <h3 className="text-lg font-semibold text-chart-error">Analysis Failed</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{error}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button 
                          onClick={() => setError(null)} 
                          variant="outline" 
                          size="sm"
                          className="border-chart-error text-chart-error hover:bg-chart-error/10"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                        <Button 
                          onClick={() => {
                            setError(null);
                            setAnalysisResult(null);
                          }} 
                          variant="ghost" 
                          size="sm"
                          className="text-muted-foreground"
                        >
                          Clear Results
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysisResult && (
                <>

                  <Card className="border-chart-success/20 bg-green-50/50 dark:bg-green-950/20 animate-scale-in">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-chart-success">
                          <CheckCircle className="h-5 w-5" />
                          <span>All Recommended Dates</span>
                        </CardTitle>
                        <SuccessBadge 
                          label={`${analysisResult.recommendedDates.length} options`}
                          size="sm"
                          variant="subtle"
                        />
                      </div>
                      <CardDescription>
                        Low-risk dates with optimal conditions for your event
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.recommendedDates.length > 0 ? (
                          analysisResult.recommendedDates.map((recommendation, index) => (
                            <div 
                              key={index}
                              className={`p-3 border rounded-lg ${getRiskBgColor(recommendation.riskLevel)}`}
                            >
                              <div className={`font-semibold ${getRiskTextColor(recommendation.riskLevel)}`}>
                                {formatDateRange(recommendation.startDate, recommendation.endDate)}
                              </div>
                              <div className={`text-sm ${getRiskColor(recommendation.riskLevel)}`}>
                                Conflict Score: {recommendation.conflictScore.toFixed(1)}/20 ({recommendation.riskLevel} Risk)
                              </div>
                              <div className={`text-xs ${getRiskDetailColor(recommendation.riskLevel)} mt-1`}>
                                {recommendation.reasons.join(' • ')}
                              </div>
                              
                              {/* Holiday Restrictions - Only show when there are actual restrictions */}
                              {recommendation.holidayRestrictions && 
                               (recommendation.holidayRestrictions.holidays?.length > 0 || 
                                recommendation.holidayRestrictions.cultural_events?.length > 0 ||
                                recommendation.holidayRestrictions.business_impact !== 'none' ||
                                recommendation.holidayRestrictions.venue_closure_expected) && (
                                <div className="mt-2 p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-800">
                                      Holiday & Cultural Restrictions
                                    </span>
                                  </div>
                                  
                                  {/* Public Holidays */}
                                  {recommendation.holidayRestrictions.holidays?.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-semibold text-orange-800 mb-1">
                                        🏛️ Public Holidays:
                                      </div>
                                      {recommendation.holidayRestrictions.holidays.map((h: any, index: number) => (
                                        <div key={index} className="text-xs text-orange-700 ml-2 mb-1">
                                          • <strong>{h.holiday_name}</strong>
                                          {h.holiday_name_native && h.holiday_name_native !== h.holiday_name && (
                                            <span className="text-orange-600"> ({h.holiday_name_native})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Cultural Events */}
                                  {recommendation.holidayRestrictions.cultural_events?.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-semibold text-orange-800 mb-1">
                                        🎭 Cultural Events:
                                      </div>
                                      {recommendation.holidayRestrictions.cultural_events.map((e: any, index: number) => (
                                        <div key={index} className="text-xs text-orange-700 ml-2 mb-1">
                                          • <strong>{e.event_name}</strong>
                                          {e.event_name_native && e.event_name_native !== e.event_name && (
                                            <span className="text-orange-600"> ({e.event_name_native})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Impact Warnings */}
                                  <div className="space-y-1">
                                    {recommendation.holidayRestrictions.business_impact === 'full' && (
                                      <div className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded">
                                        🚫 <strong>Full Business Closure:</strong> All businesses and venues are typically closed on this date
                                      </div>
                                    )}
                                    {recommendation.holidayRestrictions.business_impact === 'partial' && (
                                      <div className="text-xs text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                                        ⚠️ <strong>Partial Business Impact:</strong> Some businesses may have reduced hours or be closed
                                      </div>
                                    )}
                                    {recommendation.holidayRestrictions.venue_closure_expected && (
                                      <div className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded">
                                        🏢 <strong>Venue Availability:</strong> Most venues are likely to be closed or have limited availability
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* General Impact Message */}
                                  {(recommendation.holidayRestrictions.holidays?.length > 0 || 
                                    recommendation.holidayRestrictions.cultural_events?.length > 0) && (
                                    <div className="text-xs text-orange-700 mt-2 p-2 bg-orange-100 rounded">
                                      💡 <strong>Impact on Your Event:</strong> These holidays and cultural events may significantly affect attendance and venue availability. Consider alternative dates for better turnout.
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Advanced Analysis Features */}
                              {recommendation.audienceOverlap && (
                                <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Users className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-800">
                                      Audience Overlap: {(recommendation.audienceOverlap.averageOverlap * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {recommendation.audienceOverlap.overlapReasoning.length > 0 && (
                                    <div className="text-xs text-blue-700">
                                      {recommendation.audienceOverlap.overlapReasoning[0]}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Venue intelligence feature temporarily disabled - property not available on DateRecommendation interface */}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                            <div className="text-yellow-800 text-sm">
                              No low-risk dates found in the specified range. Consider expanding your date range or adjusting your event parameters.
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span>All High Risk Dates</span>
                      </CardTitle>
                      <CardDescription>
                        {analysisResult.highRiskDates.length} high-risk dates to avoid
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.highRiskDates.length > 0 ? (
                          analysisResult.highRiskDates.map((recommendation, index) => (
                            <div 
                              key={index}
                              className={`p-4 border rounded-lg ${getRiskBgColor(recommendation.riskLevel)}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className={`font-semibold ${getRiskTextColor(recommendation.riskLevel)}`}>
                                  {formatDateRange(recommendation.startDate, recommendation.endDate)}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full ${getRiskBgColor(recommendation.riskLevel)} ${getRiskTextColor(recommendation.riskLevel)}`}>
                                  {recommendation.riskLevel} Risk
                                </div>
                              </div>
                              
                              {/* Aggregated Stats for Consolidated Ranges */}
                              {recommendation.aggregatedStats && recommendation.consolidatedRanges && recommendation.consolidatedRanges.count > 1 ? (
                                <div className={`text-sm ${getRiskColor(recommendation.riskLevel)} mb-2 space-y-1`}>
                                  <div>
                                    Conflict Score: {recommendation.conflictScore.toFixed(1)}/20 (Avg)
                                  </div>
                                  <div className="text-xs opacity-90">
                                    Max: {recommendation.aggregatedStats.maxConflictScore.toFixed(1)} | 
                                    Avg: {recommendation.aggregatedStats.avgConflictScore.toFixed(1)} | 
                                    Min: {recommendation.aggregatedStats.minConflictScore.toFixed(1)}
                                  </div>
                                </div>
                              ) : (
                                <div className={`text-sm ${getRiskColor(recommendation.riskLevel)} mb-2`}>
                                  Conflict Score: {recommendation.conflictScore.toFixed(1)}/20
                                </div>
                              )}
                              
                              <div className={`text-xs ${getRiskDetailColor(recommendation.riskLevel)} mb-2`}>
                                {recommendation.reasons.join(' • ')}
                              </div>
                              
                              {/* Holiday Restrictions - Only show when there are actual restrictions */}
                              {recommendation.holidayRestrictions && 
                               (recommendation.holidayRestrictions.holidays?.length > 0 || 
                                recommendation.holidayRestrictions.cultural_events?.length > 0 ||
                                recommendation.holidayRestrictions.business_impact !== 'none' ||
                                recommendation.holidayRestrictions.venue_closure_expected) && (
                                <div className="mt-2 p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-800">
                                      Holiday & Cultural Restrictions
                                    </span>
                                  </div>
                                  
                                  {/* Public Holidays */}
                                  {recommendation.holidayRestrictions.holidays?.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-semibold text-orange-800 mb-1">
                                        🏛️ Public Holidays:
                                      </div>
                                      {recommendation.holidayRestrictions.holidays.map((h: any, index: number) => (
                                        <div key={index} className="text-xs text-orange-700 ml-2 mb-1">
                                          • <strong>{h.holiday_name}</strong>
                                          {h.holiday_name_native && h.holiday_name_native !== h.holiday_name && (
                                            <span className="text-orange-600"> ({h.holiday_name_native})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Cultural Events */}
                                  {recommendation.holidayRestrictions.cultural_events?.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs font-semibold text-orange-800 mb-1">
                                        🎭 Cultural Events:
                                      </div>
                                      {recommendation.holidayRestrictions.cultural_events.map((e: any, index: number) => (
                                        <div key={index} className="text-xs text-orange-700 ml-2 mb-1">
                                          • <strong>{e.event_name}</strong>
                                          {e.event_name_native && e.event_name_native !== e.event_name && (
                                            <span className="text-orange-600"> ({e.event_name_native})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Impact Warnings */}
                                  <div className="space-y-1">
                                    {recommendation.holidayRestrictions.business_impact === 'full' && (
                                      <div className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded">
                                        🚫 <strong>Full Business Closure:</strong> All businesses and venues are typically closed on this date
                                      </div>
                                    )}
                                    {recommendation.holidayRestrictions.business_impact === 'partial' && (
                                      <div className="text-xs text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                                        ⚠️ <strong>Partial Business Impact:</strong> Some businesses may have reduced hours or be closed
                                      </div>
                                    )}
                                    {recommendation.holidayRestrictions.venue_closure_expected && (
                                      <div className="text-xs text-red-700 font-medium bg-red-50 p-2 rounded">
                                        🏢 <strong>Venue Availability:</strong> Most venues are likely to be closed or have limited availability
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* General Impact Message */}
                                  {(recommendation.holidayRestrictions.holidays?.length > 0 || 
                                    recommendation.holidayRestrictions.cultural_events?.length > 0) && (
                                    <div className="text-xs text-orange-700 mt-2 p-2 bg-orange-100 rounded">
                                      💡 <strong>Impact on Your Event:</strong> These holidays and cultural events may significantly affect attendance and venue availability. Consider alternative dates for better turnout.
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Show competing events for this date */}
                              {recommendation.competingEvents.length > 0 && (
                                <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-400">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Calendar className="h-3 w-3 text-red-600" />
                                    <span className="text-xs font-medium text-red-800">
                                      {recommendation.competingEvents.length} Competing Event{recommendation.competingEvents.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {recommendation.competingEvents.map((event, eventIndex) => (
                                      <div key={eventIndex} className="text-xs text-red-700 flex items-center justify-between">
                                        <span className="truncate">{event.title}</span>
                                        <span className="text-red-600 ml-2">{event.category}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Advanced Analysis Features for High Risk Dates */}
                              {recommendation.audienceOverlap && (
                                <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Users className="h-3 w-3 text-red-600" />
                                    <span className="text-xs font-medium text-red-800">
                                      High Audience Overlap: {(recommendation.audienceOverlap.averageOverlap * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {recommendation.audienceOverlap.overlapReasoning.length > 0 && (
                                    <div className="text-xs text-red-700">
                                      ⚠️ {recommendation.audienceOverlap.overlapReasoning[0]}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                            <div className="text-green-800 text-sm">
                              Great news! No high-risk dates found in your analysis range.
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* User's Preferred Dates Analysis */}
                  {analysisResult.userPreferredStartDate && analysisResult.userPreferredEndDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-orange-600">
                          <Target className="h-5 w-5" />
                          <span>Your Preferred Dates Analysis</span>
                        </CardTitle>
                        <CardDescription>
                          Risk assessment for your selected dates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            // First check if user's preferred date is in high risk dates
                            const preferredHighRisk = analysisResult.highRiskDates
                              .filter(rec => rec.startDate === analysisResult.userPreferredStartDate && rec.endDate === analysisResult.userPreferredEndDate);
                            
                            // If not in high risk, check if it's in recommended dates (low risk)
                            const preferredLowRisk = analysisResult.recommendedDates
                              .filter(rec => rec.startDate === analysisResult.userPreferredStartDate && rec.endDate === analysisResult.userPreferredEndDate);
                            
                            // Combine both and show the user's preferred date analysis
                            let preferredDateAnalysis = [...preferredHighRisk, ...preferredLowRisk];
                            
                            // If user's preferred date is not found in either category, create a default analysis
                            if (preferredDateAnalysis.length === 0) {
                              // Find competing events for the user's preferred date
                              const competingEvents = analysisResult.allEvents.filter(event => {
                                const eventDate = new Date(event.date);
                                const userStartDate = new Date(analysisResult.userPreferredStartDate!);
                                const userEndDate = new Date(analysisResult.userPreferredEndDate!);
                                return eventDate >= userStartDate && eventDate <= userEndDate;
                              });
                              
                              // Create a default analysis for the user's preferred date
                              const defaultAnalysis = {
                                startDate: analysisResult.userPreferredStartDate!,
                                endDate: analysisResult.userPreferredEndDate!,
                                conflictScore: competingEvents.length > 0 ? Math.min(competingEvents.length * 2, 20) : 0,
                                riskLevel: competingEvents.length > 0 ? (competingEvents.length > 3 ? 'High' : competingEvents.length > 1 ? 'Medium' : 'Low') : 'Low' as 'Low' | 'Medium' | 'High',
                                competingEvents: competingEvents,
                                reasons: competingEvents.length > 0 ? [`${competingEvents.length} competing events found`] : ['No major competing events found']
                              };
                              
                              preferredDateAnalysis = [defaultAnalysis];
                            }
                            
                            return preferredDateAnalysis.map((recommendation, index) => (
                              <div 
                                key={index}
                                className={`p-4 border-2 rounded-lg ${getRiskBgColor(recommendation.riskLevel)}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`font-semibold text-lg ${getRiskTextColor(recommendation.riskLevel)}`}>
                                    {formatDateRange(recommendation.startDate, recommendation.endDate)}
                                  </div>
                                  <div className={`text-sm px-3 py-1 rounded-full ${getRiskBgColor(recommendation.riskLevel)} ${getRiskTextColor(recommendation.riskLevel)}`}>
                                    {recommendation.riskLevel} Risk
                                  </div>
                                </div>
                                
                                <div className={`text-base ${getRiskColor(recommendation.riskLevel)} mb-3`}>
                                  Conflict Score: {recommendation.conflictScore.toFixed(1)}/20
                                </div>
                                
                                <div className={`text-sm ${getRiskDetailColor(recommendation.riskLevel)} mb-3`}>
                                  {recommendation.reasons.join(' • ')}
                                </div>
                                
                                {recommendation.competingEvents.length > 0 && (
                                  <div className="mt-3 p-3 bg-red-50 rounded border-l-4 border-red-400">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <Calendar className="h-4 w-4 text-red-600" />
                                      <span className="text-sm font-medium text-red-800">
                                        {recommendation.competingEvents.length} Competing Event{recommendation.competingEvents.length > 1 ? 's' : ''} Found
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {recommendation.competingEvents.map((event, eventIndex) => (
                                        <div key={eventIndex} className="text-sm text-red-700 flex items-center justify-between p-2 bg-white rounded border">
                                          <div className="flex-1">
                                            <div className="font-medium">{event.title}</div>
                                            <div className="text-xs text-gray-600">
                                              {event.venue || 'TBA'} • {event.subcategory && `${event.subcategory} • `}{new Date(event.date).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {event.audienceOverlapPercentage !== undefined && (
                                              <div 
                                                className="text-xs px-2 py-1 rounded"
                                                style={{
                                                  backgroundColor: event.audienceOverlapPercentage > 70 ? '#fef2f2' : 
                                                                  event.audienceOverlapPercentage > 40 ? '#fef3c7' : '#f0f9ff',
                                                  color: event.audienceOverlapPercentage > 70 ? '#dc2626' : 
                                                         event.audienceOverlapPercentage > 40 ? '#d97706' : '#2563eb'
                                                }}
                                                title={event.overlapReasoning?.join(', ')}
                                              >
                                                {event.audienceOverlapPercentage}% overlap
                                              </div>
                                            )}
                                            <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                              {event.category}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {recommendation.audienceOverlap && (
                                  <div className="mt-3 p-3 bg-red-50 rounded border-l-4 border-red-400">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Users className="h-4 w-4 text-red-600" />
                                      <span className="text-sm font-medium text-red-800">
                                        Audience Overlap: {(recommendation.audienceOverlap.averageOverlap * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                    {recommendation.audienceOverlap.overlapReasoning.length > 0 && (
                                      <div className="text-sm text-red-700">
                                        ⚠️ {recommendation.audienceOverlap.overlapReasoning[0]}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Perplexity Research Insights */}
                                {recommendation.perplexityResearch && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-medium text-blue-800">
                                        🌐 Online Research Insights
                                      </span>
                                      {recommendation.perplexityResearch.researchMetadata?.confidence && (
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          recommendation.perplexityResearch.researchMetadata.confidence === 'high' 
                                            ? 'bg-green-100 text-green-800'
                                            : recommendation.perplexityResearch.researchMetadata.confidence === 'medium'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {recommendation.perplexityResearch.researchMetadata.confidence} confidence
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Touring Artists */}
                                    {recommendation.perplexityResearch.touringArtists.length > 0 && (
                                      <div className="mb-2">
                                        <div className="text-xs font-medium text-blue-700 mb-1">
                                          Touring Artists:
                                        </div>
                                        <div className="text-xs text-blue-600">
                                          {recommendation.perplexityResearch.touringArtists.map((artist, idx) => (
                                            <div key={idx}>
                                              {artist.artistName} - {artist.locations.join(', ')}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Recommendations */}
                                    {recommendation.perplexityResearch.recommendations && (
                                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <span className="text-sm font-semibold text-blue-900">
                                            💡 What This Means For You:
                                          </span>
                                        </div>
                                        <div className="space-y-2">
                                          {recommendation.perplexityResearch.recommendations.reasoning.map((reason, idx) => {
                                            // Detect if this is an actionable recommendation
                                            const isActionable = reason.match(/(Consider|Move|Avoid|Try|Recommend|instead)/i);
                                            const hasConflict = reason.match(/(festival|event|artist|tour|competition)/i);
                                            
                                            return (
                                              <div 
                                                key={idx} 
                                                className={`text-sm ${
                                                  isActionable 
                                                    ? 'text-green-700 bg-green-50 p-2 rounded border-l-4 border-green-400' 
                                                    : hasConflict
                                                    ? 'text-orange-700 bg-orange-50 p-2 rounded border-l-4 border-orange-400'
                                                    : 'text-blue-700'
                                                }`}
                                              >
                                                {isActionable && <span className="font-semibold">✓ Action: </span>}
                                                {hasConflict && !isActionable && <span className="font-semibold">⚠️ Conflict: </span>}
                                                {reason}
                                              </div>
                                            );
                                          })}
                                        </div>
                                        
                                        {/* Show recommended dates if available */}
                                        {recommendation.perplexityResearch.recommendations.shouldMoveDate && 
                                         recommendation.perplexityResearch.recommendations.recommendedDates && 
                                         recommendation.perplexityResearch.recommendations.recommendedDates.length > 0 && (
                                          <div className="mt-3 p-2 bg-green-100 rounded border border-green-300">
                                            <div className="text-xs font-semibold text-green-900 mb-1">
                                              📅 Better Dates:
                                            </div>
                                            <div className="text-xs text-green-800">
                                              {recommendation.perplexityResearch.recommendations.recommendedDates.slice(0, 3).map((date, idx) => (
                                                <div key={idx} className="font-medium">
                                                  {new Date(date).toLocaleDateString('en-US', { 
                                                    weekday: 'short', 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                  })}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysisResult.allEvents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>Found Events</span>
                        </CardTitle>
                        <CardDescription>
                          {analysisResult.allEvents.length} events found in the analysis period
                        </CardDescription>
                        {(() => {
                          const counts = analysisResult.allEvents.reduce((acc: Record<string, number>, ev) => {
                            acc[ev.source] = (acc[ev.source] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          const summary = Object.entries(counts)
                            .map(([src, n]) => `${src}: ${n}`)
                            .join(' • ');
                          return (
                            <div className="text-xs text-gray-500 mt-1">
                              Sources: {summary}
                            </div>
                          );
                        })()}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {analysisResult.allEvents.slice(0, 100).map((event, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <div className="font-medium text-sm">{event.title}</div>
                                <div className="text-xs text-gray-600">
                                  {new Date(event.date).toLocaleDateString()} • {event.venue || 'TBA'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {event.category}
                                </div>
                                <div className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                                  {event.source}
                                </div>
                              </div>
                            </div>
                          ))}
                          {analysisResult.allEvents.length > 100 && (
                            <div className="text-xs text-gray-500 text-center py-2">
                              ... and {analysisResult.allEvents.length - 10} more events
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Seasonal Intelligence Warnings */}
                  {analysisResult.seasonalIntelligence && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-amber-600">
                          <Calendar className="h-5 w-5" />
                          <span>Seasonal Intelligence</span>
                        </CardTitle>
                        <CardDescription>
                          AI-powered seasonal risk analysis and recommendations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Data Coverage Warning */}
                          {analysisResult.seasonalIntelligence?.dataCoverageWarning && (
                            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                    <span className="text-amber-600 text-sm">⚠️</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-amber-800 mb-1">
                                    Data Coverage Alert
                                  </h4>
                                  <p className="text-sm text-amber-700">
                                    {analysisResult.seasonalIntelligence?.dataCoverageWarning}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Seasonal Risk Analysis */}
                          {analysisResult.seasonalIntelligence?.hasSeasonalRisk && (
                            <div className={`p-4 border rounded-lg ${
                              analysisResult.seasonalIntelligence?.riskLevel === 'high' 
                                ? 'border-red-200 bg-red-50' 
                                : analysisResult.seasonalIntelligence?.riskLevel === 'medium'
                                ? 'border-orange-200 bg-orange-50'
                                : 'border-yellow-200 bg-yellow-50'
                            }`}>
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    analysisResult.seasonalIntelligence?.riskLevel === 'high' 
                                      ? 'bg-red-100' 
                                      : analysisResult.seasonalIntelligence?.riskLevel === 'medium'
                                      ? 'bg-orange-100'
                                      : 'bg-yellow-100'
                                  }`}>
                                    <span className={`text-sm ${
                                      analysisResult.seasonalIntelligence?.riskLevel === 'high' 
                                        ? 'text-red-600' 
                                        : analysisResult.seasonalIntelligence?.riskLevel === 'medium'
                                        ? 'text-orange-600'
                                        : 'text-yellow-600'
                                    }`}>
                                      {analysisResult.seasonalIntelligence?.riskLevel === 'high' ? '🔴' : 
                                       analysisResult.seasonalIntelligence?.riskLevel === 'medium' ? '🟡' : '🟢'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h4 className={`text-sm font-medium mb-2 ${
                                    analysisResult.seasonalIntelligence?.riskLevel === 'high' 
                                      ? 'text-red-800' 
                                      : analysisResult.seasonalIntelligence?.riskLevel === 'medium'
                                      ? 'text-orange-800'
                                      : 'text-yellow-800'
                                  }`}>
                                    Seasonal Risk: {analysisResult.seasonalIntelligence?.riskLevel?.toUpperCase()}
                                  </h4>
                                  
                                  {/* Seasonal Factors */}
                                  {analysisResult.seasonalIntelligence?.seasonalFactors?.length > 0 && (
                                    <div className="mb-3">
                                      <h5 className="text-xs font-medium text-gray-700 mb-2">Key Factors:</h5>
                                      <ul className="text-sm space-y-1">
                                        {analysisResult.seasonalIntelligence.seasonalFactors.map((factor, index) => (
                                          <li key={index} className="flex items-start space-x-2">
                                            <span className="text-gray-400 mt-1">•</span>
                                            <span className={`text-xs ${
                                              analysisResult.seasonalIntelligence?.riskLevel === 'high' 
                                                ? 'text-red-700' 
                                                : analysisResult.seasonalIntelligence?.riskLevel === 'medium'
                                                ? 'text-orange-700'
                                                : 'text-yellow-700'
                                            }`}>
                                              {factor}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Recommendations */}
                                  {analysisResult.seasonalIntelligence?.recommendations?.length > 0 && (
                                    <div>
                                      <h5 className="text-xs font-medium text-gray-700 mb-2">Recommendations:</h5>
                                      <ul className="text-sm space-y-1">
                                        {analysisResult.seasonalIntelligence?.recommendations?.map((recommendation, index) => (
                                          <li key={index} className="flex items-start space-x-2">
                                            <span className="text-blue-500 mt-1">💡</span>
                                            <span className="text-xs text-blue-700">
                                              {recommendation}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Confidence Score */}
                                  <div className="mt-3 pt-2 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>AI Confidence:</span>
                                      <span className="font-medium">
                                        {((analysisResult.seasonalIntelligence?.confidence ?? 0) * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* No Seasonal Risk */}
                          {!analysisResult.seasonalIntelligence?.hasSeasonalRisk && (
                            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 text-sm">✅</span>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-green-800 mb-1">
                                    No Significant Seasonal Risks
                                  </h4>
                                  <p className="text-sm text-green-700">
                                    The selected time period appears to have favorable seasonal conditions for your event category.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {!loading && !error && !analysisResult && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Fill out the form to see conflict analysis results</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}