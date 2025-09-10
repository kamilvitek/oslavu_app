"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MapPin, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Target,
  Building
} from "lucide-react";
import { conflictAnalysisService, ConflictAnalysisParams } from "@/lib/services/conflict-analysis";
import { audienceOverlapService } from "@/lib/services/audience-overlap";
import { openaiAudienceOverlapService } from "@/lib/services/openai-audience-overlap";
import { venueIntelligenceService } from "@/lib/services/venue-intelligence";
import { Event } from "@/types";

interface TestResult {
  success: boolean;
  data: any;
  error: string | null;
  duration: number;
}

export function AdvancedAnalysisTestComponent() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Test parameters
  const [testParams, setTestParams] = useState({
    city: "Prague",
    category: "Technology",
    subcategory: "AI/ML",
    expectedAttendees: "500",
    startDate: "2024-06-15",
    endDate: "2024-06-17",
    dateRangeStart: "2024-06-01",
    dateRangeEnd: "2024-06-30",
    venue: "Prague Conference Center"
  });

  const runAdvancedConflictAnalysis = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const params: ConflictAnalysisParams = {
        city: testParams.city,
        category: testParams.category,
        subcategory: testParams.subcategory,
        expectedAttendees: parseInt(testParams.expectedAttendees),
        startDate: testParams.startDate,
        endDate: testParams.endDate,
        dateRangeStart: testParams.dateRangeStart,
        dateRangeEnd: testParams.dateRangeEnd,
        venue: testParams.venue,
        enableAdvancedAnalysis: true
      };

      const result = await conflictAnalysisService.analyzeConflicts(params);
      const duration = Date.now() - startTime;

      setResults(prev => [{
        success: true,
        data: result,
        error: null,
        duration
      }, ...prev]);

    } catch (error) {
      const duration = Date.now() - startTime;
      setResults(prev => [{
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const runAudienceOverlapTest = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Create sample events for testing
      const event1: Event = {
        id: "test_event_1",
        title: "AI Conference 2024",
        date: "2024-06-15",
        city: "Prague",
        category: "Technology",
        subcategory: "AI/ML",
        expectedAttendees: 300,
        source: "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const event2: Event = {
        id: "test_event_2",
        title: "Machine Learning Workshop",
        date: "2024-06-16",
        city: "Prague",
        category: "Technology",
        subcategory: "AI/ML",
        expectedAttendees: 150,
        source: "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Use OpenAI if available, otherwise fallback to rule-based
      const overlap = openaiAudienceOverlapService.isAvailable()
        ? await openaiAudienceOverlapService.predictAudienceOverlap(event1, event2)
        : await audienceOverlapService.predictAudienceOverlap(event1, event2);
      
      const duration = Date.now() - startTime;

      setResults(prev => [{
        success: true,
        data: {
          ...overlap,
          method: openaiAudienceOverlapService.isAvailable() ? 'AI-powered' : 'rule-based'
        },
        error: null,
        duration
      }, ...prev]);

    } catch (error) {
      const duration = Date.now() - startTime;
      setResults(prev => [{
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const runVenueIntelligenceTest = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const intelligence = await venueIntelligenceService.getVenueIntelligence(
        testParams.venue,
        testParams.startDate
      );
      
      const analysis = await venueIntelligenceService.analyzeVenueConflict(
        testParams.venue,
        testParams.startDate,
        parseInt(testParams.expectedAttendees)
      );
      
      const duration = Date.now() - startTime;

      setResults(prev => [{
        success: true,
        data: { intelligence, analysis },
        error: null,
        duration
      }, ...prev]);

    } catch (error) {
      const duration = Date.now() - startTime;
      setResults(prev => [{
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Advanced Analysis Test Parameters</span>
          </CardTitle>
          <CardDescription>
            Configure parameters for testing the advanced conflict analysis features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={testParams.city}
                onChange={(e) => setTestParams(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Prague, London"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={testParams.category}
                onChange={(e) => setTestParams(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Technology, Business"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={testParams.subcategory}
                onChange={(e) => setTestParams(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="e.g., AI/ML, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedAttendees">Expected Attendees</Label>
              <Input
                id="expectedAttendees"
                value={testParams.expectedAttendees}
                onChange={(e) => setTestParams(prev => ({ ...prev, expectedAttendees: e.target.value }))}
                placeholder="e.g., 500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={testParams.venue}
                onChange={(e) => setTestParams(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="e.g., Prague Conference Center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={testParams.startDate}
                onChange={(e) => setTestParams(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Run Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={runAdvancedConflictAnalysis} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              <span>Advanced Conflict Analysis</span>
            </Button>
            
            <Button 
              onClick={runAudienceOverlapTest} 
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              <span>Audience Overlap Test</span>
            </Button>
            
            <Button 
              onClick={runVenueIntelligenceTest} 
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building className="h-4 w-4" />}
              <span>Venue Intelligence Test</span>
            </Button>
            
            <Button onClick={clearResults} variant="ghost">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span>Test {results.length - index}</span>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                  <Badge variant="outline">
                    {result.duration}ms
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.error ? (
                  <div className="text-red-600">
                    <strong>Error:</strong> {result.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Advanced Conflict Analysis Results */}
                    {result.data?.recommendedDates && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center space-x-2">
                          <Target className="h-4 w-4" />
                          <span>Recommended Dates</span>
                        </h4>
                        <div className="space-y-2">
                          {result.data.recommendedDates.slice(0, 3).map((rec: any, i: number) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                  {rec.startDate} - {rec.endDate}
                                </span>
                                <Badge className={getRiskColor(rec.riskLevel)}>
                                  {rec.riskLevel} Risk
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                Conflict Score: {rec.conflictScore.toFixed(1)}
                              </div>
                              
                              {/* Audience Overlap Analysis */}
                              {rec.audienceOverlap && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                      Audience Overlap: {(rec.audienceOverlap.averageOverlap * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {rec.audienceOverlap.overlapReasoning.length > 0 && (
                                    <div className="text-xs text-blue-700">
                                      {rec.audienceOverlap.overlapReasoning[0]}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Venue Intelligence */}
                              {rec.venueIntelligence && (
                                <div className="mt-2 p-2 bg-green-50 rounded">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Building className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Venue Conflict: {(rec.venueIntelligence.venueConflictScore * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-green-700">
                                    Capacity: {(rec.venueIntelligence.capacityUtilization * 100).toFixed(1)}% | 
                                    Pricing Impact: {(rec.venueIntelligence.pricingImpact * 100).toFixed(1)}%
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audience Overlap Results */}
                    {result.data?.overlapScore !== undefined && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Audience Overlap Analysis</span>
                          {result.data.method && (
                            <Badge className={result.data.method === 'AI-powered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {result.data.method}
                            </Badge>
                          )}
                        </h4>
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>Overlap Score: {(result.data.overlapScore * 100).toFixed(1)}%</span>
                            <span className="text-sm text-gray-600">
                              (Confidence: {(result.data.confidence * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Factors:</strong>
                            <ul className="list-disc list-inside ml-4">
                              <li>Demographic Similarity: {(result.data.factors.demographicSimilarity * 100).toFixed(1)}%</li>
                              <li>Interest Alignment: {(result.data.factors.interestAlignment * 100).toFixed(1)}%</li>
                              <li>Behavior Patterns: {(result.data.factors.behaviorPatterns * 100).toFixed(1)}%</li>
                              <li>Historical Preference: {(result.data.factors.historicalPreference * 100).toFixed(1)}%</li>
                            </ul>
                          </div>
                          {result.data.reasoning.length > 0 && (
                            <div className="text-sm">
                              <strong>Reasoning:</strong>
                              <ul className="list-disc list-inside ml-4">
                                {result.data.reasoning.map((reason: string, i: number) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Venue Intelligence Results */}
                    {result.data?.intelligence && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>Venue Intelligence</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 border rounded-lg">
                            <h5 className="font-medium mb-2">Venue Information</h5>
                            <div className="text-sm space-y-1">
                              <div><strong>Capacity:</strong> {result.data.intelligence.capacity}</div>
                              <div><strong>Rating:</strong> {result.data.intelligence.reputation.rating}/5</div>
                              <div><strong>Reviews:</strong> {result.data.intelligence.reputation.reviews}</div>
                              <div><strong>Amenities:</strong> {result.data.intelligence.amenities.join(', ')}</div>
                            </div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <h5 className="font-medium mb-2">Conflict Analysis</h5>
                            <div className="text-sm space-y-1">
                              <div><strong>Conflict Score:</strong> {(result.data.analysis.conflictScore * 100).toFixed(1)}%</div>
                              <div><strong>Capacity Utilization:</strong> {(result.data.analysis.factors.capacityUtilization * 100).toFixed(1)}%</div>
                              <div><strong>Pricing Impact:</strong> {(result.data.analysis.factors.pricingImpact * 100).toFixed(1)}%</div>
                              <div><strong>Competitor Pressure:</strong> {(result.data.analysis.factors.competitorPressure * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                        {result.data.analysis.recommendations && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h5 className="font-medium mb-2">Recommendations</h5>
                            <ul className="text-sm space-y-1">
                              <li><strong>Pricing:</strong> {result.data.analysis.recommendations.pricingStrategy}</li>
                              <li><strong>Marketing:</strong> {result.data.analysis.recommendations.marketingAdvice}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw Data */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
