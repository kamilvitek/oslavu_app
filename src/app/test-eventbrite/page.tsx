"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventbriteTestComponent } from "@/components/test/eventbrite-test";

export default function TestEventbritePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Eventbrite API Test
          </h1>
          <p className="text-lg text-gray-600">
            Test the Eventbrite API integration with different parameters
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Make sure you have set up your EVENTBRITE_API_KEY in your .env.local file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-yellow-700 space-y-1">
                  <li>1. Create a .env.local file in your project root</li>
                  <li>2. Add: EVENTBRITE_API_KEY=your_api_key_here</li>
                  <li>3. Get your API key from: https://www.eventbrite.com/platform/api-keys/</li>
                  <li>4. Restart your development server</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <EventbriteTestComponent />
        </div>
      </div>
    </div>
  );
}
