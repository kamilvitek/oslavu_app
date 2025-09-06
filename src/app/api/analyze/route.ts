import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { conflictAnalysisService } from "@/lib/services/conflict-analysis";

const analyzeRequestSchema = z.object({
  city: z.string().min(2),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  expectedAttendees: z.number().min(1),
  preferredDates: z.array(z.string()),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = analyzeRequestSchema.parse(body);

    // For now, return mock data
    // TODO: Implement actual conflict analysis with external APIs
    const mockAnalysis = {
      id: crypto.randomUUID(),
      city: validatedData.city,
      category: validatedData.category,
      preferredDates: validatedData.preferredDates,
      expectedAttendees: validatedData.expectedAttendees,
      results: [
        {
          date: "2024-03-15",
          score: 15,
          risk: "low" as const,
          conflictingEvents: [],
          recommendation: "Excellent choice! No major conflicts detected.",
        },
        {
          date: "2024-03-22",
          score: 22,
          risk: "low" as const,
          conflictingEvents: [
            {
              id: "1",
              title: "Local Startup Meetup",
              date: "2024-03-22",
              category: "Technology",
              expectedAttendees: 50,
              impact: 10,
              reason: "Small overlap in tech audience"
            }
          ],
          recommendation: "Good option with minimal conflicts.",
        },
        {
          date: "2024-03-08",
          score: 85,
          risk: "high" as const,
          conflictingEvents: [
            {
              id: "2",
              title: "TechCrunch Disrupt",
              date: "2024-03-08",
              category: "Technology",
              expectedAttendees: 5000,
              impact: 60,
              reason: "Major competing conference"
            },
            {
              id: "3",
              title: "Spring Music Festival",
              date: "2024-03-09",
              category: "Entertainment",
              expectedAttendees: 10000,
              impact: 25,
              reason: "Large local event affecting city capacity"
            }
          ],
          recommendation: "Avoid this date due to major conflicts.",
        }
      ],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      data: mockAnalysis,
      message: "Conflict analysis completed successfully",
    });

  } catch (error) {
    console.error("Error in conflict analysis:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to analyze conflicts",
      },
      { status: 500 }
    );
  }
}