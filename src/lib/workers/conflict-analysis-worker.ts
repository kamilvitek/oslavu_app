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
    const eventScore = calculateEventConflictScore(event, category, config);
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
 * Calculate conflict score for a single event using optimized algorithm
 */
function calculateEventConflictScore(event: Event, category: string, config: ConflictCalculationTask['data']['config']): number {
  let eventScore = 0;
  
  // Base score for any competing event (reduced from 20 to 3)
  eventScore += 3;
  
  // Smart category conflict scoring based on audience overlap
  const categoryConflictScore = calculateCategoryConflictScore(event.category, category);
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
  
  return eventScore;
}

/**
 * Calculate category conflict score based on audience overlap potential
 */
function calculateCategoryConflictScore(competingCategory: string, plannedCategory: string): number {
  // Define category relationships and audience overlap potential
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
    if (relationships[plannedCategory]?.includes(competingCategory)) {
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
