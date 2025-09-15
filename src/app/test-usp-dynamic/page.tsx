"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUSPMetrics } from "@/lib/hooks/use-usp-data";
import { DataSourcesList } from "@/components/data-visualization/data-sources-list";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw } from "lucide-react";

export default function TestUSPDynamicPage() {
  const { metrics, isLoading, refetch } = useUSPMetrics();
  const [newDataSource, setNewDataSource] = useState({
    name: "",
    type: "api" as "api" | "local" | "external",
    status: "active" as "active" | "inactive" | "maintenance",
    description: "",
    endpoint: "",
    coverage: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDataSource = async () => {
    if (!newDataSource.name || !newDataSource.description) {
      alert("Please fill in name and description");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/usp-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newDataSource,
          coverage: newDataSource.coverage ? newDataSource.coverage.split(',').map(c => c.trim()) : [],
        }),
      });

      if (response.ok) {
        setNewDataSource({
          name: "",
          type: "api",
          status: "active",
          description: "",
          endpoint: "",
          coverage: "",
        });
        refetch(); // Refresh the data
        alert("Data source added successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to add data source: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding data source:', error);
      alert("Failed to add data source");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dynamic USP Testing
          </h1>
          <p className="text-lg text-gray-600">
            Test the dynamic USP system by adding new data sources and seeing real-time updates
          </p>
        </div>

        {/* Current Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : metrics?.totalDataSources || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active APIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : metrics?.activeAPIs || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (metrics?.totalEvents || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cities Covered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : metrics?.coverage?.cities || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Data Source */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Data Source
            </CardTitle>
            <CardDescription>
              Add a new API or data source to see the USP metrics update dynamically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newDataSource.name}
                  onChange={(e) => setNewDataSource(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New Event API"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newDataSource.type}
                  onValueChange={(value: "api" | "local" | "external") => 
                    setNewDataSource(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newDataSource.status}
                  onValueChange={(value: "active" | "inactive" | "maintenance") => 
                    setNewDataSource(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endpoint">Endpoint (optional)</Label>
                <Input
                  id="endpoint"
                  value={newDataSource.endpoint}
                  onChange={(e) => setNewDataSource(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newDataSource.description}
                onChange={(e) => setNewDataSource(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the data source"
              />
            </div>
            <div>
              <Label htmlFor="coverage">Coverage (comma-separated)</Label>
              <Input
                id="coverage"
                value={newDataSource.coverage}
                onChange={(e) => setNewDataSource(prev => ({ ...prev, coverage: e.target.value }))}
                placeholder="Prague, Brno, Global"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddDataSource} disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Data Source"}
              </Button>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources List */}
        <Card>
          <CardHeader>
            <CardTitle>Current Data Sources</CardTitle>
            <CardDescription>
              All registered data sources and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataSourcesList />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>1. <strong>Add a new data source</strong> using the form above</p>
              <p>2. <strong>Watch the metrics update</strong> in real-time in the cards above</p>
              <p>3. <strong>Check the main page</strong> - the Hero and Features sections should show updated numbers</p>
              <p>4. <strong>Try different statuses</strong> - only "active" sources count toward the API count</p>
              <p>5. <strong>Refresh the page</strong> to see the data persist</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
