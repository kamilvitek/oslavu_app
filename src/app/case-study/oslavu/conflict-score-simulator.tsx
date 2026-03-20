"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConflictAnalysisForm } from "@/components/forms/conflict-analysis-form";
import { BarChart3, CheckCircle, Target } from "lucide-react";

export function ConflictScoreSimulator() {
  const [showResult, setShowResult] = useState(false);

  const handleMockAnalysis = async () => {
    setShowResult(true);
  };

  return (
    <section id="demo" className="space-y-6">
      <p className="text-muted-foreground">
        This demo intentionally uses the same form UI as the original homepage experience. The output below is
        hardcoded to show the type of result users saw in the MVP.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-effect-strong shadow-centered">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-chart-primary" />
              <span>Event Details</span>
            </CardTitle>
            <CardDescription>
              Fill in event inputs. This version does not run live analysis and returns a fixed sample output.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConflictAnalysisForm onAnalysisComplete={handleMockAnalysis} />
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-chart-info" />
              <span>Sample output</span>
            </CardTitle>
            <CardDescription>Hardcoded result from a representative MVP scenario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showResult ? (
              <p className="text-sm text-muted-foreground">
                Submit the form to reveal the sample result panel.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-800 font-medium">Recommended date window</p>
                  <p className="text-xl font-semibold text-green-900 mt-1">May 14-16, 2026</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800 font-medium">Conflict score</p>
                  <p className="text-2xl font-semibold text-amber-900 mt-1">34 / 100 (Medium-Low Risk)</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Why this date was suggested</p>
                      <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
                        <li>No direct same-category collision in Brno on those dates.</li>
                        <li>Venue pressure lower than nearby alternatives.</li>
                        <li>Audience overlap estimated as moderate, not critical.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
