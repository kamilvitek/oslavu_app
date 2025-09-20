"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Users, Tag, Calendar } from "lucide-react";
import { EVENT_CATEGORIES } from "@/types";

const analysisSchema = z.object({
  city: z.string().min(2, "City is required"),
  category: z.string().min(1, "Category is required"),
  expectedAttendees: z.number().min(1, "Expected attendees is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type AnalysisForm = z.infer<typeof analysisSchema>;

interface ConflictAnalysisFormProps {
  onAnalysisComplete?: (data: AnalysisForm) => void;
}

export function ConflictAnalysisForm({ onAnalysisComplete }: ConflictAnalysisFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AnalysisForm>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {},
  });


  // Calculate automatic analysis range based on preferred dates, attendees, and category
  const calculateAnalysisRange = (startDate: string, endDate: string, attendees: number, category: string) => {
    const preferredStart = new Date(startDate);
    const preferredEnd = new Date(endDate);
    const eventDuration = Math.ceil((preferredEnd.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate analysis range based on event characteristics
    let analysisRangeDays: number;
    
    // Base range on event size and category
    if (attendees < 100) {
      analysisRangeDays = 14; // Small events: 2 weeks
    } else if (attendees < 500) {
      analysisRangeDays = 21; // Medium events: 3 weeks
    } else {
      analysisRangeDays = 30; // Large events: 1 month
    }
    
    // Adjust for category - some categories have more events
    if (category === 'Technology' || category === 'Business') {
      analysisRangeDays += 7; // Add extra week for high-activity categories
    }
    
    // Set analysis range centered around preferred dates
    const analysisStart = new Date(preferredStart);
    analysisStart.setDate(analysisStart.getDate() - Math.floor(analysisRangeDays / 2));
    
    const analysisEnd = new Date(preferredEnd);
    analysisEnd.setDate(analysisEnd.getDate() + Math.ceil(analysisRangeDays / 2));
    
    return {
      dateRangeStart: analysisStart.toISOString().split('T')[0],
      dateRangeEnd: analysisEnd.toISOString().split('T')[0],
    };
  };

  const onSubmit = async (data: AnalysisForm) => {
    setLoading(true);
    try {
      console.log("Analysis request:", data);
      
      // Calculate automatic analysis range
      const analysisRange = calculateAnalysisRange(
        data.startDate, 
        data.endDate, 
        data.expectedAttendees, 
        data.category
      );
      
      // Create enhanced data with automatic analysis range
      const enhancedData = {
        ...data,
        ...analysisRange,
      };
      
      console.log("Enhanced analysis request with automatic analysis range:", enhancedData);
      
      // Call the analysis complete callback if provided
      if (onAnalysisComplete) {
        await onAnalysisComplete(enhancedData);
      } else {
        // Fallback: Call Ticketmaster API directly
        const queryParams = new URLSearchParams({
          city: data.city,
          startDate: analysisRange.dateRangeStart,
          endDate: analysisRange.dateRangeEnd,
          category: data.category,
          size: '50'
        });

        const response = await fetch(`/api/analyze/events/ticketmaster?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Ticketmaster API response:", result);
        
        alert(`Found ${result.count} events in ${data.city} between ${analysisRange.dateRangeStart} and ${analysisRange.dateRangeEnd}. Check console for details.`);
      }
      
    } catch (error) {
      console.error("Error analyzing conflicts:", error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="city" className="flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>City</span>
        </Label>
        <Input
          id="city"
          placeholder="e.g., Prague, London, San Francisco"
          {...register("city")}
        />
        {errors.city && (
          <p className="text-sm text-red-600">{errors.city.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="flex items-center space-x-2">
          <Tag className="h-4 w-4" />
          <span>Event Category</span>
        </Label>
        <select
          id="category"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register("category")}
        >
          <option value="">Select category</option>
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>


      <div className="space-y-2">
        <Label htmlFor="expectedAttendees" className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>Expected Attendees</span>
        </Label>
        <Input
          id="expectedAttendees"
          type="number"
          placeholder="e.g., 500"
          {...register("expectedAttendees", { valueAsNumber: true })}
        />
        {errors.expectedAttendees && (
          <p className="text-sm text-red-600">{errors.expectedAttendees.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Preferred Event Dates</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm text-muted-foreground">
              First Day of Event
            </Label>
            <Input
              id="startDate"
              type="date"
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="endDate" className="text-sm text-muted-foreground">
              Last Day of Event
            </Label>
            <Input
              id="endDate"
              type="date"
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>
      </div>



      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Analyzing..." : "Get your date"}
      </Button>
    </form>
  );
}