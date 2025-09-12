'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  testCategoryEffectiveness, 
  testMultipleCategories, 
  getEventsWithFallback,
  BUSINESS_CATEGORIES,
  ALL_CATEGORIES,
  CategoryComparisonResult 
} from '@/lib/services/category-testing';

export default function CategoryMappingTestPage() {
  const [city, setCity] = useState('Prague');
  const [startDate, setStartDate] = useState('2024-03-01');
  const [endDate, setEndDate] = useState('2024-03-31');
  const [selectedCategory, setSelectedCategory] = useState('Technology');
  const [testResults, setTestResults] = useState<CategoryComparisonResult | null>(null);
  const [multiTestResults, setMultiTestResults] = useState<CategoryComparisonResult[]>([]);
  const [fallbackResults, setFallbackResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multiple' | 'fallback'>('single');

  const handleSingleCategoryTest = async () => {
    setLoading(true);
    try {
      const result = await testCategoryEffectiveness(city, startDate, endDate, selectedCategory);
      setTestResults(result);
    } catch (error) {
      console.error('Error testing category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleCategoryTest = async () => {
    setLoading(true);
    try {
      const results = await testMultipleCategories(city, startDate, endDate, BUSINESS_CATEGORIES);
      setMultiTestResults(results);
    } catch (error) {
      console.error('Error testing multiple categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackTest = async () => {
    setLoading(true);
    try {
      const results = await getEventsWithFallback(city, startDate, endDate, selectedCategory);
      setFallbackResults(results);
    } catch (error) {
      console.error('Error testing fallback:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 70) return 'bg-green-100 text-green-800';
    if (effectiveness >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Category Mapping Test</h1>
        <p className="text-gray-600">
          Test and compare category mapping effectiveness across Ticketmaster, Eventbrite, and PredictHQ APIs.
        </p>
      </div>

      {/* Search Parameters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Prague"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'single' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('single')}
            className="flex-1"
          >
            Single Category Test
          </Button>
          <Button
            variant={activeTab === 'multiple' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('multiple')}
            className="flex-1"
          >
            Multiple Categories
          </Button>
          <Button
            variant={activeTab === 'fallback' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('fallback')}
            className="flex-1"
          >
            Fallback Strategy
          </Button>
        </div>
      </div>

      {/* Single Category Test */}
      {activeTab === 'single' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Single Category Effectiveness Test</CardTitle>
            <CardDescription>
              Test how well a specific category maps across all services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSingleCategoryTest} disabled={loading} className="mb-4">
              {loading ? 'Testing...' : `Test "${selectedCategory}" Category`}
            </Button>

            {testResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {testResults.overallEffectiveness.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Overall Effectiveness</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 capitalize">
                          {testResults.bestService}
                        </div>
                        <div className="text-sm text-gray-600">Best Service</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 capitalize">
                          {testResults.worstService}
                        </div>
                        <div className="text-sm text-gray-600">Worst Service</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Service Results:</h3>
                  {testResults.results.map((result) => (
                    <div key={result.service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.service}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {result.categoryUsed ? `(${result.categoryUsed})` : '(no filter)'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getEffectivenessColor(result.effectiveness)}>
                          {result.effectiveness.toFixed(1)}%
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {result.withCategory}/{result.withoutCategory} events
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple Categories Test */}
      {activeTab === 'multiple' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Multiple Categories Test</CardTitle>
            <CardDescription>
              Test all business-focused categories to compare effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleMultipleCategoryTest} disabled={loading} className="mb-4">
              {loading ? 'Testing...' : 'Test All Business Categories'}
            </Button>

            {multiTestResults.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {multiTestResults.map((result) => (
                    <Card key={result.category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{result.category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Effectiveness:</span>
                            <Badge className={getEffectivenessColor(result.overallEffectiveness)}>
                              {result.overallEffectiveness.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Best Service:</span>
                            <span className="text-sm font-medium capitalize">{result.bestService}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.results.filter(r => r.success).length}/3 services successful
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback Strategy Test */}
      {activeTab === 'fallback' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fallback Strategy Test</CardTitle>
            <CardDescription>
              Test the fallback strategy that tries specific categories first, then broader searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFallbackTest} disabled={loading} className="mb-4">
              {loading ? 'Testing...' : `Test Fallback for "${selectedCategory}"`}
            </Button>

            {fallbackResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {fallbackResults.total}
                        </div>
                        <div className="text-sm text-gray-600">Total Events</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {fallbackResults.ticketmaster.length}
                        </div>
                        <div className="text-sm text-gray-600">Ticketmaster</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {fallbackResults.eventbrite.length}
                        </div>
                        <div className="text-sm text-gray-600">Eventbrite</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {fallbackResults.predicthq.length}
                        </div>
                        <div className="text-sm text-gray-600">PredictHQ</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    The fallback strategy automatically tries specific category mappings first, 
                    then falls back to broader searches if few results are found. This ensures 
                    maximum event coverage while maintaining relevance.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use This Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p><strong>Single Category Test:</strong> Test how well a specific category maps across all services. Higher effectiveness means the category mapping is working well.</p>
          <p><strong>Multiple Categories Test:</strong> Compare all business categories to see which ones work best across different services.</p>
          <p><strong>Fallback Strategy Test:</strong> See how many events are found using the improved fallback strategy that tries specific categories first, then broader searches.</p>
          <p><strong>Effectiveness Score:</strong> Percentage of events found with category filter vs. without filter. Higher is better, but 100% might indicate the category is too broad.</p>
        </CardContent>
      </Card>
    </div>
  );
}
