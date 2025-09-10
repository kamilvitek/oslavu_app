"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Tag, Building, Brain } from "lucide-react";
import { EVENT_CATEGORIES } from "@/types";

const analysisSchema = z.object({
  city: z.string().min(2, "City is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  expectedAttendees: z.number().min(1, "Expected attendees is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dateRangeStart: z.string().min(1, "Date range start is required"),
  dateRangeEnd: z.string().min(1, "Date range end is required"),
  venue: z.string().optional(),
  enableAdvancedAnalysis: z.boolean().optional(),
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
    formState: { errors },
  } = useForm<AnalysisForm>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      enableAdvancedAnalysis: false,
    },
  });

  const enableAdvancedAnalysis = watch('enableAdvancedAnalysis');

  const onSubmit = async (data: AnalysisForm) => {
    setLoading(true);
    try {
      console.log("Analysis request:", data);
      
      // Call the analysis complete callback if provided
      if (onAnalysisComplete) {
        await onAnalysisComplete(data);
      } else {
        // Fallback: Call Ticketmaster API directly
        const queryParams = new URLSearchParams({
          city: data.city,
          startDate: data.dateRangeStart,
          endDate: data.dateRangeEnd,
          category: data.category,
          size: '50'
        });

        const response = await fetch(`/api/analyze/events/ticketmaster?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Ticketmaster API response:", result);
        
        alert(`Found ${result.count} events in ${data.city} between ${data.dateRangeStart} and ${data.dateRangeEnd}. Check console for details.`);
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
        <Label htmlFor="subcategory">Subcategory (optional)</Label>
        <Input
          id="subcategory"
          placeholder="e.g., AI/ML, Frontend, DevOps"
          {...register("subcategory")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue" className="flex items-center space-x-2">
          <Building className="h-4 w-4" />
          <span>Venue (optional)</span>
        </Label>
        <Input
          id="venue"
          placeholder="e.g., Prague Conference Center, Hotel InterContinental"
          {...register("venue")}
        />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Preferred Start Date</Label>
          <Input
            id="startDate"
            type="date"
            {...register("startDate")}
          />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Preferred End Date</Label>
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

      <div className="space-y-2">
        <Label className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Analysis Date Range</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateRangeStart" className="text-sm text-muted-foreground">
              Range Start
            </Label>
            <Input
              id="dateRangeStart"
              type="date"
              {...register("dateRangeStart")}
            />
            {errors.dateRangeStart && (
              <p className="text-sm text-red-600">{errors.dateRangeStart.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="dateRangeEnd" className="text-sm text-muted-foreground">
              Range End
            </Label>
            <Input
              id="dateRangeEnd"
              type="date"
              {...register("dateRangeEnd")}
            />
            {errors.dateRangeEnd && (
              <p className="text-sm text-red-600">{errors.dateRangeEnd.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="enableAdvancedAnalysis"
            {...register("enableAdvancedAnalysis")}
            className="rounded border-gray-300"
          />
          <Label htmlFor="enableAdvancedAnalysis" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Enable Advanced Analysis</span>
          </Label>
        </div>
        <p className="text-sm text-gray-600">
          Includes AI-powered audience overlap prediction and venue intelligence analysis
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Analyzing..." : "Get your date"}
      </Button>
    </form>
  );
}