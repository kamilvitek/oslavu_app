"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2, Calendar, MapPin, Users } from "lucide-react";
import { conflictAnalysisService } from "@/lib/services/conflict-analysis";

export default function TestConflictAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [testParams, setTestParams] = useState({
    city: "Prague",
    category: "Technology",
    expectedAttendees: 500,
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    dateRangeStart: "2024-03-01",
    dateRangeEnd: "2024-03-31"
  });

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Running conflict analysis test with params:', testParams);
      const analysisResult = await conflictAnalysisService.analyzeConflicts(testParams);
      setResult(analysisResult);
      console.log('Analysis result:', analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Conflict Analysis Test
          </h1>
          <p className="text-lg text-gray-600">
            Test the conflict analysis service with debug logging
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Test Parameters</CardTitle>
              <CardDescription>
                Configure parameters for the conflict analysis test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={testParams.city}
                    onChange={(e) => setTestParams(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={testParams.category}
                    onChange={(e) => setTestParams(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expectedAttendees">Expected Attendees</Label>
                  <Input
                    id="expectedAttendees"
                    type="number"
                    value={testParams.expectedAttendees}
                    onChange={(e) => setTestParams(prev => ({ ...prev, expectedAttendees: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Preferred Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={testParams.startDate}
                    onChange={(e) => setTestParams(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Preferred End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={testParams.endDate}
                    onChange={(e) => setTestParams(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="dateRangeStart">Analysis Range Start</Label>
                  <Input
                    id="dateRangeStart"
                    type="date"
                    value={testParams.dateRangeStart}
                    onChange={(e) => setTestParams(prev => ({ ...prev, dateRangeStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="dateRangeEnd">Analysis Range End</Label>
                  <Input
                    id="dateRangeEnd"
                    type="date"
                    value={testParams.dateRangeEnd}
                    onChange={(e) => setTestParams(prev => ({ ...prev, dateRangeEnd: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={runTest} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Run Conflict Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {error && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-red-800">{error}</div>
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {result.recommendedDates.length}
                        </div>
                        <div className="text-sm text-gray-600">Low Risk Dates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {result.highRiskDates.length}
                        </div>
                        <div className="text-sm text-gray-600">High Risk Dates</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-lg font-semibold">
                        {result.allEvents.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Events Found</div>
                    </div>
                  </CardContent>
                </Card>

                {/* High Risk Dates */}
                {result.highRiskDates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">High Risk Dates</CardTitle>
                      <CardDescription>
                        Dates with significant conflicts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.highRiskDates.map((rec: any, index: number) => (
                          <div key={index} className={`p-3 border rounded-lg ${getRiskBgColor(rec.riskLevel)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold">
                                {rec.startDate} to {rec.endDate}
                              </div>
                              <Badge variant="destructive">
                                Score: {rec.conflictScore}/100
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {rec.competingEvents.length} competing events
                            </div>
                            <div className="text-xs">
                              {rec.reasons.join(' • ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Dates */}
                {result.recommendedDates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">Recommended Dates</CardTitle>
                      <CardDescription>
                        Low conflict dates for your event
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.recommendedDates.map((rec: any, index: number) => (
                          <div key={index} className={`p-3 border rounded-lg ${getRiskBgColor(rec.riskLevel)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold">
                                {rec.startDate} to {rec.endDate}
                              </div>
                              <Badge variant="secondary">
                                Score: {rec.conflictScore}/100
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {rec.competingEvents.length} competing events
                            </div>
                            <div className="text-xs">
                              {rec.reasons.join(' • ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All Events */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Events Found</CardTitle>
                    <CardDescription>
                      Complete list of events from both APIs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.allEvents.map((event: any, index: number) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-gray-600">
                            {event.date} • {event.city} • {event.category}
                          </div>
                          {event.venue && (
                            <div className="text-gray-500">📍 {event.venue}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
