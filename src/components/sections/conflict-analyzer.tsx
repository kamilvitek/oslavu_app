"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { ConflictAnalysisForm } from "@/components/forms/conflict-analysis-form";

export function ConflictAnalyzer() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Analyze Your Event Date
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant conflict analysis for your event. See competing events, 
            festivals, and major gatherings that could impact your attendance.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
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
                <ConflictAnalysisForm />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Recommended Dates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-900">March 15-16, 2024</div>
                      <div className="text-sm text-green-700">Conflict Score: 15/100 (Low Risk)</div>
                      <div className="text-xs text-green-600 mt-1">
                        No major competing events found
                      </div>
                    </div>
                    <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-900">March 22-23, 2024</div>
                      <div className="text-sm text-green-700">Conflict Score: 22/100 (Low Risk)</div>
                      <div className="text-xs text-green-600 mt-1">
                        Minor startup meetup on March 22
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span>High Risk Dates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="font-semibold text-red-900">March 8-9, 2024</div>
                      <div className="text-sm text-red-700">Conflict Score: 85/100 (High Risk)</div>
                      <div className="text-xs text-red-600 mt-1">
                        TechCrunch Disrupt overlaps • Music Festival same weekend
                      </div>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="font-semibold text-red-900">March 29-30, 2024</div>
                      <div className="text-sm text-red-700">Conflict Score: 72/100 (High Risk)</div>
                      <div className="text-xs text-red-600 mt-1">
                        Major AI conference • Spring break period
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}