"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  DollarSign,
  Zap,
  Settings
} from "lucide-react";
import { openaiAudienceOverlapService } from "@/lib/services/openai-audience-overlap";

export function OpenAIStatusComponent() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if OpenAI is available
    setIsAvailable(openaiAudienceOverlapService.isAvailable());
  }, []);

  const testOpenAIConnection = async () => {
    if (!apiKey) {
      alert("Please enter an OpenAI API key");
      return;
    }

    setLoading(true);
    try {
      // Temporarily set the API key for testing
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = apiKey;

      // Test with sample events
      const testEvent1 = {
        id: "test1",
        title: "AI & Machine Learning Conference 2024",
        date: "2024-06-15",
        city: "Prague",
        category: "Technology",
        subcategory: "AI/ML",
        expectedAttendees: 500,
        source: "manual" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testEvent2 = {
        id: "test2",
        title: "Data Science Workshop",
        date: "2024-06-16",
        city: "Prague",
        category: "Technology",
        subcategory: "Data Science",
        expectedAttendees: 100,
        source: "manual" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await openaiAudienceOverlapService.predictAudienceOverlap(testEvent1, testEvent2);
      setTestResult(result);
      setIsAvailable(true);

      // Restore original key
      process.env.OPENAI_API_KEY = originalKey;

    } catch (error) {
      console.error("OpenAI test failed:", error);
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isAvailable) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    if (isAvailable) {
      return <Badge className="bg-green-100 text-green-800">AI-Powered</Badge>;
    } else {
      return <Badge variant="destructive">Rule-Based</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>OpenAI Integration Status</span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Current audience overlap prediction method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Analysis Method</span>
                </div>
                <p className="text-sm text-gray-600">
                  {isAvailable ? "AI-powered semantic analysis" : "Rule-based algorithmic analysis"}
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Accuracy</span>
                </div>
                <p className="text-sm text-gray-600">
                  {isAvailable ? "High (context-aware)" : "Medium (pattern-based)"}
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Cost per Analysis</span>
                </div>
                <p className="text-sm text-gray-600">
                  {isAvailable ? "~$0.002" : "Free"}
                </p>
              </div>
            </div>

            {!isAvailable && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">OpenAI Not Configured</span>
                </div>
                <p className="text-sm text-yellow-700">
                  To enable AI-powered analysis, add your OpenAI API key to the environment variables.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Test OpenAI Integration</span>
          </CardTitle>
          <CardDescription>
            Test the OpenAI API connection with a sample analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Your API key is only used for this test and not stored.
              </p>
            </div>
            
            <Button 
              onClick={testOpenAIConnection} 
              disabled={loading || !apiKey}
              className="w-full"
            >
              {loading ? "Testing..." : "Test OpenAI Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">Test Failed</span>
                </div>
                <p className="text-sm text-red-700">{testResult.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Test Successful</span>
                  </div>
                  <p className="text-sm text-green-700">
                    OpenAI integration is working correctly!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Overlap Score</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {(testResult.overlapScore * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence: {(testResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Factors</h4>
                    <div className="space-y-1 text-sm">
                      <div>Demographics: {(testResult.factors.demographicSimilarity * 100).toFixed(1)}%</div>
                      <div>Interests: {(testResult.factors.interestAlignment * 100).toFixed(1)}%</div>
                      <div>Behavior: {(testResult.factors.behaviorPatterns * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {testResult.reasoning && testResult.reasoning.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">AI Reasoning</h4>
                    <ul className="space-y-1 text-sm">
                      {testResult.reasoning.map((reason: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-600">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benefits Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>AI vs Rule-Based Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-green-600">AI-Powered Analysis</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Semantic understanding of event content</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Context-aware audience prediction</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Natural language reasoning</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Handles complex event descriptions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Adapts to new event types</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-blue-600">Rule-Based Analysis</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>Fast and reliable</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>No API costs</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>Predictable results</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>Works offline</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <span>Easy to debug and modify</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
