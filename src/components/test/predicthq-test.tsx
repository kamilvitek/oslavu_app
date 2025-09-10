"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Search, AlertCircle, CheckCircle, Loader2, TrendingUp, Users } from "lucide-react";

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  endpoint: string;
  params: Record<string, string>;
}

export function PredictHQTestComponent() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Test parameters
  const [testParams, setTestParams] = useState({
    city: "Prague",
    keyword: "conference",
    startDate: "2024-03-01",
    endDate: "2024-03-31",
    category: "conferences",
    minAttendance: "1000",
    minRank: "50",
    limit: "50"
  });

  const runTest = async (endpoint: string, params: Record<string, string>) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(params);
      const url = `/api/analyze/events/predicthq?${queryParams.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      const result: TestResult = {
        success: response.ok,
        data: response.ok ? data : null,
        error: response.ok ? null : data.error || `HTTP ${response.status}`,
        endpoint,
        params
      };

      setResults(prev => [result, ...prev]);
    } catch (error) {
      const result: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint,
        params
      };
      setResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    
    // Test 1: Search by city and date range
    await runTest("GET - City & Date Range", {
      city: testParams.city,
      startDate: testParams.startDate,
      endDate: testParams.endDate,
      category: testParams.category
    });

    // Test 2: Search by keyword
    await runTest("GET - Keyword Search", {
      keyword: testParams.keyword,
      city: testParams.city
    });

    // Test 3: High attendance events
    await runTest("GET - High Attendance Events", {
      city: testParams.city,
      startDate: testParams.startDate,
      endDate: testParams.endDate,
      minAttendance: testParams.minAttendance
    });

    // Test 4: High rank events
    await runTest("GET - High Rank Events", {
      city: testParams.city,
      startDate: testParams.startDate,
      endDate: testParams.endDate,
      minRank: testParams.minRank
    });

    // Test 5: General events search
    await runTest("GET - General Events", {
      city: testParams.city,
      limit: testParams.limit
    });
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Test Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Test Parameters</span>
          </CardTitle>
          <CardDescription>
            Configure the parameters for testing the PredictHQ API
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
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                value={testParams.keyword}
                onChange={(e) => setTestParams(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="e.g., conference, festival"
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
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={testParams.endDate}
                onChange={(e) => setTestParams(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={testParams.category}
                onChange={(e) => setTestParams(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., conferences, concerts, sports"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAttendance">Min Attendance</Label>
              <Input
                id="minAttendance"
                type="number"
                value={testParams.minAttendance}
                onChange={(e) => setTestParams(prev => ({ ...prev, minAttendance: e.target.value }))}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minRank">Min Rank</Label>
              <Input
                id="minRank"
                type="number"
                value={testParams.minRank}
                onChange={(e) => setTestParams(prev => ({ ...prev, minRank: e.target.value }))}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Results Limit</Label>
              <Input
                id="limit"
                type="number"
                value={testParams.limit}
                onChange={(e) => setTestParams(prev => ({ ...prev, limit: e.target.value }))}
                placeholder="50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Run different API tests to verify the PredictHQ integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={runAllTests} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>Run All Tests</span>
            </Button>
            
            <Button 
              onClick={() => runTest("GET - City Only", { city: testParams.city })}
              disabled={loading}
              variant="outline"
            >
              Test City Only
            </Button>
            
            <Button 
              onClick={() => runTest("GET - Keyword Only", { keyword: testParams.keyword })}
              disabled={loading}
              variant="outline"
            >
              Test Keyword Only
            </Button>
            
            <Button 
              onClick={() => runTest("GET - High Attendance", { 
                city: testParams.city, 
                startDate: testParams.startDate,
                endDate: testParams.endDate,
                minAttendance: testParams.minAttendance 
              })}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>High Attendance</span>
            </Button>
            
            <Button 
              onClick={() => runTest("GET - High Rank", { 
                city: testParams.city, 
                startDate: testParams.startDate,
                endDate: testParams.endDate,
                minRank: testParams.minRank 
              })}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>High Rank</span>
            </Button>
            
            <Button 
              onClick={clearResults}
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Badge variant="outline">{results.length} tests</Badge>
            </CardTitle>
            <CardDescription>
              Results from the PredictHQ API tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-semibold">{result.endpoint}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Parameters:</strong> {JSON.stringify(result.params, null, 2)}
                  </div>
                  
                  {result.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {result.error}
                      </div>
                    </div>
                  )}
                  
                  {result.data && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="text-sm text-green-800 mb-2">
                        <strong>Response:</strong>
                      </div>
                      <pre className="text-xs text-green-700 overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
