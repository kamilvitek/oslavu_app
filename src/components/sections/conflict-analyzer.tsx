"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Target, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { ConflictAnalysisForm } from "@/components/forms/conflict-analysis-form";
import { conflictAnalysisService, ConflictAnalysisResult, DateRecommendation } from "@/lib/services/conflict-analysis";

export function ConflictAnalyzer() {
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = async (formData: any) => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await conflictAnalysisService.analyzeConflicts(formData);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze conflicts');
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
    <section id="conflict-analyzer" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Analyze Your Event Date
          </h2>
          <p className="text-xl text-gray-600">
            Get instant conflict analysis for your event. See competing events, 
            festivals, and major gatherings that could impact your attendance.
          </p>
        </div>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Event Details</span>
                </CardTitle>
                <CardDescription>
                  Tell us about your event to get personalized conflict analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConflictAnalysisForm onAnalysisComplete={handleAnalysisComplete} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              {loading && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-gray-600">Analyzing conflicts...</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Fetching events and calculating conflict scores
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600 font-medium">Analysis Failed</p>
                      <p className="text-sm text-gray-600 mt-2">{error}</p>
                      <Button 
                        onClick={() => setError(null)} 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysisResult && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span>Recommended Dates</span>
                      </CardTitle>
                      <CardDescription>
                        {analysisResult.recommendedDates.length} low-risk options found
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
                                Conflict Score: {recommendation.conflictScore}/100 ({recommendation.riskLevel} Risk)
                              </div>
                              <div className={`text-xs ${getRiskDetailColor(recommendation.riskLevel)} mt-1`}>
                                {recommendation.reasons.join(' • ')}
                              </div>
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
                        <span>High Risk Dates</span>
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
                              className={`p-3 border rounded-lg ${getRiskBgColor(recommendation.riskLevel)}`}
                            >
                              <div className={`font-semibold ${getRiskTextColor(recommendation.riskLevel)}`}>
                                {formatDateRange(recommendation.startDate, recommendation.endDate)}
                              </div>
                              <div className={`text-sm ${getRiskColor(recommendation.riskLevel)}`}>
                                Conflict Score: {recommendation.conflictScore}/100 ({recommendation.riskLevel} Risk)
                              </div>
                              <div className={`text-xs ${getRiskDetailColor(recommendation.riskLevel)} mt-1`}>
                                {recommendation.reasons.join(' • ')}
                              </div>
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
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {analysisResult.allEvents.slice(0, 10).map((event, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <div className="font-medium text-sm">{event.title}</div>
                                <div className="text-xs text-gray-600">
                                  {new Date(event.date).toLocaleDateString()} • {event.venue || 'TBA'}
                                </div>
                              </div>
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {event.category}
                              </div>
                            </div>
                          ))}
                          {analysisResult.allEvents.length > 10 && (
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