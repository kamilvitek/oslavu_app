// Web Worker for CPU-intensive conflict analysis calculations
// This worker handles heavy computational tasks to avoid blocking the main thread

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expectedAttendees?: number;
  source: string;
  sourceId?: string;
  url?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConflictCalculationTask {
  type: 'calculateConflictScore';
  data: {
    competingEvents: Event[];
    expectedAttendees: number;
    category: string;
    plannedSubcategory?: string;
    config: {
      depth: 'shallow' | 'medium' | 'deep';
      maxComparisons: number;
      stringSimilarityThreshold: number;
      spatialRadius: number;
    };
  };
  taskId: string;
}

interface ConflictCalculationResult {
  type: 'calculateConflictScore';
  taskId: string;
  result: {
    score: number;
    processingTime: number;
    eventsProcessed: number;
  };
  error?: string;
}

// Worker message handler
self.onmessage = function(e: MessageEvent<ConflictCalculationTask>) {
  const task = e.data;
  
  try {
    switch (task.type) {
      case 'calculateConflictScore':
        const result = calculateConflictScoreInWorker(task.data);
        const response: ConflictCalculationResult = {
          type: 'calculateConflictScore',
          taskId: task.taskId,
          result
        };
        self.postMessage(response);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    const errorResponse: ConflictCalculationResult = {
      type: 'calculateConflictScore',
      taskId: task.taskId,
      result: {
        score: 0,
        processingTime: 0,
        eventsProcessed: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(errorResponse);
  }
};

/**
 * Calculate conflict score in worker thread
 */
function calculateConflictScoreInWorker(data: ConflictCalculationTask['data']): {
  score: number;
  processingTime: number;
  eventsProcessed: number;
} {
  const startTime = performance.now();
  const { competingEvents, expectedAttendees, category, config } = data;
  
  if (competingEvents.length === 0) {
    return {
      score: 0,
      processingTime: performance.now() - startTime,
      eventsProcessed: 0
    };
  }

  let score = 0;
  
  // Sort events by significance for prioritized processing
  const sortedEvents = competingEvents
    .map(event => ({
      event,
      significance: calculateEventSignificance(event)
    }))
    .sort((a, b) => b.significance - a.significance)
    .slice(0, config.maxComparisons);

  // Process events with optimized algorithms
  for (const { event } of sortedEvents) {
    const eventScore = calculateEventConflictScore(event, category, config, data.plannedSubcategory);
    score += eventScore;
  }

  // Add base score for remaining events
  const remainingEvents = competingEvents.length - sortedEvents.length;
  if (remainingEvents > 0) {
    const remainingScore = remainingEvents * 2; // Reduced from 10 to 2
    score += remainingScore;
  }

  // Adjust based on expected attendees (reduced multipliers)
  if (expectedAttendees > 1000) {
    score *= 1.1; // Reduced from 1.2 to 1.1
  } else if (expectedAttendees > 500) {
    score *= 1.05; // Reduced from 1.1 to 1.05
  }

  // Cap the score at 20 (adjusted for new scoring system)
  const finalScore = Math.min(score, 20);
  const processingTime = performance.now() - startTime;

  return {
    score: finalScore,
    processingTime,
    eventsProcessed: sortedEvents.length
  };
}

/**
 * Calculate event significance score for prioritization
 */
function calculateEventSignificance(event: Event): number {
  let significance = 0;
  
  // Base significance
  significance += 10;
  
  // Higher significance for events with venues
  if (event.venue) {
    significance += 20;
  }
  
  // Higher significance for events with images
  if (event.imageUrl) {
    significance += 15;
  }
  
  // Higher significance for events with descriptions
  if (event.description && event.description.length > 50) {
    significance += 10;
  }
  
  // Higher significance for events with expected attendees
  if (event.expectedAttendees && event.expectedAttendees > 100) {
    significance += Math.min(event.expectedAttendees / 10, 25);
  }
  
  return significance;
}

/**
 * Calculate event duration in days from start and end dates
 */
function calculateEventDuration(event: Event): number {
  if (!event.endDate) return 1; // Single day event
  const start = new Date(event.date);
  const end = new Date(event.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // +1 to include both start and end day
}

/**
 * Get duration multiplier for conflict scoring
 */
function getDurationMultiplier(duration: number): number {
  if (duration === 1) return 1.0;      // 1-day event: 1.0x
  if (duration === 2) return 1.3;      // 2-day event: 1.3x
  if (duration === 3) return 1.6;      // 3-day event: 1.6x
  return Math.min(2.0, 1.0 + (duration - 1) * 0.3); // 4+ day event: cap at 2.0x
}

/**
 * Calculate conflict score for a single event using optimized algorithm
 */
function calculateEventConflictScore(event: Event, category: string, config: ConflictCalculationTask['data']['config'], plannedSubcategory?: string): number {
  let eventScore = 0;
  
  // Base score for any competing event (reduced from 20 to 3)
  eventScore += 3;
  
  // Smart category conflict scoring based on audience overlap with subcategory awareness
  const categoryConflictScore = calculateCategoryConflictScore(
    event.category, 
    category, 
    event.subcategory, 
    plannedSubcategory
  );
  eventScore += categoryConflictScore;
  
  // Higher score for events with venues (more significant) (reduced from 15 to 4)
  if (event.venue) {
    eventScore += 4;
  }
  
  // Higher score for events with images (more professional/promoted) (reduced from 10 to 2)
  if (event.imageUrl) {
    eventScore += 2;
  }
  
  // Higher score for events with descriptions (more detailed/promoted) (reduced from 5 to 1)
  if (event.description && event.description.length > 50) {
    eventScore += 1;
  }
  
  // Adjust based on analysis depth
  if (config.depth === 'deep') {
    // More detailed analysis for deep mode
    if (event.expectedAttendees && event.expectedAttendees > 500) {
      eventScore += 2; // Reduced from 10 to 2
    }
  }
  
  // Apply duration multiplier (longer events = higher conflict impact)
  const eventDuration = calculateEventDuration(event);
  const durationMultiplier = getDurationMultiplier(eventDuration);
  eventScore *= durationMultiplier;
  
  return eventScore;
}

/**
 * Calculate category conflict score based on audience overlap potential
 * Enhanced with subcategory awareness
 */
function calculateCategoryConflictScore(competingCategory: string, plannedCategory: string, competingSubcategory?: string, plannedSubcategory?: string): number {
  // If we have subcategory information, use more precise scoring
  if (competingSubcategory && plannedSubcategory) {
    // Same subcategory: maximum conflict
    if (competingSubcategory === plannedSubcategory) {
      return 15; // Higher score for exact subcategory match
    }
    
    // Different subcategories in same category: moderate conflict
    if (competingCategory === plannedCategory) {
      return 8; // Moderate conflict for different subcategories
    }
  }

  // Fallback to category-based scoring
  const categoryRelationships = {
    // High conflict (same audience, direct competition)
    'high': {
      'Entertainment': ['Entertainment', 'Music', 'Arts & Culture'],
      'Music': ['Entertainment', 'Music'],
      'Sports': ['Sports'],
      'Business': ['Business', 'Technology', 'Finance'],
      'Technology': ['Business', 'Technology'],
      'Finance': ['Business', 'Finance']
    },
    // Medium conflict (some audience overlap, indirect competition)
    'medium': {
      'Entertainment': ['Sports'], // Some people attend both
      'Arts & Culture': ['Entertainment', 'Music'], // Cultural events vs mainstream entertainment
      'Sports': ['Entertainment'], // Some crossover audience
      'Business': ['Education'], // Professional development overlap
      'Technology': ['Education', 'Business'], // Tech education and business events
      'Education': ['Business', 'Technology'] // Professional development
    },
    // Low conflict (minimal audience overlap)
    'low': {
      'Entertainment': ['Business', 'Technology', 'Finance', 'Education'],
      'Sports': ['Business', 'Technology', 'Finance', 'Education'],
      'Business': ['Entertainment', 'Sports'],
      'Technology': ['Entertainment', 'Sports'],
      'Finance': ['Entertainment', 'Sports'],
      'Education': ['Entertainment', 'Sports']
    }
  };

  // Check for exact match (highest conflict)
  if (competingCategory === plannedCategory) {
    return 10; // Maximum conflict score
  }

  // Check for high conflict relationships
  for (const [conflictLevel, relationships] of Object.entries(categoryRelationships)) {
    if ((relationships as Record<string, string[]>)[plannedCategory]?.includes(competingCategory)) {
      switch (conflictLevel) {
        case 'high':
          return 8; // High conflict - significant audience overlap
        case 'medium':
          return 4; // Medium conflict - some audience overlap
        case 'low':
          return 1; // Low conflict - minimal audience overlap
      }
    }
  }

  // No relationship found - minimal conflict
  return 0;
}

// Export types for use in main thread
export type { ConflictCalculationTask, ConflictCalculationResult };
