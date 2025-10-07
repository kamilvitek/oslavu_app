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
          expectedAttendees: formData.expectedAttendees,
          dateRange: {
            start: formData.dateRangeStart,
            end: formData.dateRangeEnd
          },
          preferredDates: [formData.startDate, formData.endDate],
          enableAdvancedAnalysis: true // Always enabled for best results
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
                              
                              {/* Holiday Restrictions */}
                              {recommendation.holidayRestrictions && (
                                <div className="mt-2 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Calendar className="h-3 w-3 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-800">
                                      Holiday Restrictions
                                    </span>
                                  </div>
                                  {recommendation.holidayRestrictions.holidays?.length > 0 && (
                                    <div className="text-xs text-orange-700 mb-1">
                                      <strong>Public Holidays:</strong> {recommendation.holidayRestrictions.holidays.map((h: any) => h.holiday_name).join(', ')}
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.cultural_events?.length > 0 && (
                                    <div className="text-xs text-orange-700 mb-1">
                                      <strong>Cultural Events:</strong> {recommendation.holidayRestrictions.cultural_events.map((e: any) => e.event_name).join(', ')}
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.business_impact === 'full' && (
                                    <div className="text-xs text-red-700 font-medium">
                                      ⚠️ Full business closure expected
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.venue_closure_expected && (
                                    <div className="text-xs text-red-700 font-medium">
                                      ⚠️ Venues may be closed
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
                              
                              <div className={`text-sm ${getRiskColor(recommendation.riskLevel)} mb-2`}>
                                Conflict Score: {recommendation.conflictScore.toFixed(1)}/20
                              </div>
                              
                              <div className={`text-xs ${getRiskDetailColor(recommendation.riskLevel)} mb-2`}>
                                {recommendation.reasons.join(' • ')}
                              </div>
                              
                              {/* Holiday Restrictions */}
                              {recommendation.holidayRestrictions && (
                                <div className="mt-2 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Calendar className="h-3 w-3 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-800">
                                      Holiday Restrictions
                                    </span>
                                  </div>
                                  {recommendation.holidayRestrictions.holidays?.length > 0 && (
                                    <div className="text-xs text-orange-700 mb-1">
                                      <strong>Public Holidays:</strong> {recommendation.holidayRestrictions.holidays.map((h: any) => h.holiday_name).join(', ')}
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.cultural_events?.length > 0 && (
                                    <div className="text-xs text-orange-700 mb-1">
                                      <strong>Cultural Events:</strong> {recommendation.holidayRestrictions.cultural_events.map((e: any) => e.event_name).join(', ')}
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.business_impact === 'full' && (
                                    <div className="text-xs text-red-700 font-medium">
                                      ⚠️ Full business closure expected
                                    </div>
                                  )}
                                  {recommendation.holidayRestrictions.venue_closure_expected && (
                                    <div className="text-xs text-red-700 font-medium">
                                      ⚠️ Venues may be closed
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
                                  <div className="space-y-1 max-h-20 overflow-y-auto">
                                    {recommendation.competingEvents.slice(0, 3).map((event, eventIndex) => (
                                      <div key={eventIndex} className="text-xs text-red-700 flex items-center justify-between">
                                        <span className="truncate">{event.title}</span>
                                        <span className="text-red-600 ml-2">{event.category}</span>
                                      </div>
                                    ))}
                                    {recommendation.competingEvents.length > 3 && (
                                      <div className="text-xs text-red-600">
                                        ... and {recommendation.competingEvents.length - 3} more events
                                      </div>
                                    )}
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
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Calendar className="h-4 w-4 text-red-600" />
                                      <span className="text-sm font-medium text-red-800">
                                        {recommendation.competingEvents.length} Competing Event{recommendation.competingEvents.length > 1 ? 's' : ''} Found
                                      </span>
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {recommendation.competingEvents.slice(0, 5).map((event, eventIndex) => (
                                        <div key={eventIndex} className="text-sm text-red-700 flex items-center justify-between p-2 bg-white rounded border">
                                          <div className="flex-1">
                                            <div className="font-medium">{event.title}</div>
                                            <div className="text-xs text-gray-600">{event.venue || 'TBA'} • {new Date(event.date).toLocaleDateString()}</div>
                                          </div>
                                          <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded ml-2">
                                            {event.category}
                                          </div>
                                        </div>
                                      ))}
                                      {recommendation.competingEvents.length > 5 && (
                                        <div className="text-sm text-red-600 text-center py-2">
                                          ... and {recommendation.competingEvents.length - 5} more events
                                        </div>
                                      )}
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