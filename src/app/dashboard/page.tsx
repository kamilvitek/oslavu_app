import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, Clock, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your event analyses and performance metrics
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Analyses This Month
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Conflict Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">
                -15% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Events Planned
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                +3 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Time Saved
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24h</div>
              <p className="text-xs text-muted-foreground">
                Manual research avoided
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>
                Your latest conflict analyses and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold">Tech Conference Prague</div>
                    <div className="text-sm text-muted-foreground">March 15-16, 2024</div>
                    <div className="text-sm text-green-600">Score: 18 (Low Risk)</div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold">AI Summit Brno</div>
                    <div className="text-sm text-muted-foreground">April 5-6, 2024</div>
                    <div className="text-sm text-yellow-600">Score: 45 (Medium Risk)</div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold">Startup Weekend</div>
                    <div className="text-sm text-muted-foreground">May 12-14, 2024</div>
                    <div className="text-sm text-red-600">Score: 78 (High Risk)</div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>
                Current plan and usage information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Current Plan</span>
                  <span className="text-primary font-semibold">Pro</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analyses Used</span>
                  <span>12 / 25</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '48%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Billing Period</span>
                  <span>Ends Feb 28, 2024</span>
                </div>
                <Button className="w-full mt-4">
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}