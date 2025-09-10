// src/lib/services/audience-overlap.ts
import { Event } from '@/types';
import { AudienceProfile, AudienceOverlapPrediction, EventAudienceProfile } from '@/types/audience';

export class AudienceOverlapService {
  private readonly baseUrl = '/api/audience';

  /**
   * Predict audience overlap between two events
   */
  async predictAudienceOverlap(
    event1: Event,
    event2: Event
  ): Promise<AudienceOverlapPrediction> {
    try {
      // Get audience profiles for both events
      const [profile1, profile2] = await Promise.all([
        this.getEventAudienceProfile(event1),
        this.getEventAudienceProfile(event2)
      ]);

      // Calculate overlap factors
      const demographicSimilarity = this.calculateDemographicSimilarity(
        profile1.expectedAudience,
        profile2.expectedAudience
      );

      const interestAlignment = this.calculateInterestAlignment(
        profile1.expectedAudience,
        profile2.expectedAudience
      );

      const behaviorPatterns = this.calculateBehaviorPatterns(
        profile1.expectedAudience,
        profile2.expectedAudience
      );

      const historicalPreference = this.calculateHistoricalPreference(
        profile1.expectedAudience,
        profile2.expectedAudience
      );

      // Calculate weighted overlap score
      const overlapScore = this.calculateWeightedOverlap({
        demographicSimilarity,
        interestAlignment,
        behaviorPatterns,
        historicalPreference
      });

      // Generate reasoning
      const reasoning = this.generateOverlapReasoning({
        demographicSimilarity,
        interestAlignment,
        behaviorPatterns,
        historicalPreference
      });

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(profile1, profile2);

      return {
        overlapScore,
        confidence,
        factors: {
          demographicSimilarity,
          interestAlignment,
          behaviorPatterns,
          historicalPreference
        },
        reasoning
      };
    } catch (error) {
      console.error('Error predicting audience overlap:', error);
      // Return default low overlap if error occurs
      return {
        overlapScore: 0.1,
        confidence: 0.1,
        factors: {
          demographicSimilarity: 0.1,
          interestAlignment: 0.1,
          behaviorPatterns: 0.1,
          historicalPreference: 0.1
        },
        reasoning: ['Unable to analyze audience overlap due to insufficient data']
      };
    }
  }

  /**
   * Get or generate audience profile for an event
   */
  private async getEventAudienceProfile(event: Event): Promise<EventAudienceProfile> {
    // Try to get existing profile from database/cache
    const existingProfile = await this.getCachedAudienceProfile(event.id);
    if (existingProfile) {
      return existingProfile;
    }

    // Generate profile based on event characteristics
    const generatedProfile = this.generateAudienceProfileFromEvent(event);
    
    // Cache the generated profile
    await this.cacheAudienceProfile(event.id, generatedProfile);
    
    return generatedProfile;
  }

  /**
   * Generate audience profile based on event characteristics
   */
  private generateAudienceProfileFromEvent(event: Event): EventAudienceProfile {
    const baseProfile = this.getBaseProfileForCategory(event.category);
    
    // Customize based on event details
    const customizedProfile = this.customizeProfileForEvent(baseProfile, event);
    
    return {
      eventId: event.id,
      title: event.title,
      category: event.category,
      subcategory: event.subcategory,
      expectedAudience: customizedProfile,
      audienceSize: event.expectedAttendees || 100,
      audienceQuality: this.estimateAudienceQuality(event)
    };
  }

  /**
   * Get base audience profile for event category
   */
  private getBaseProfileForCategory(category: string): AudienceProfile {
    const categoryProfiles: Record<string, AudienceProfile> = {
      'Technology': {
        demographics: {
          age: [25, 45],
          interests: ['programming', 'innovation', 'startups', 'AI', 'blockchain'],
          profession: ['software_engineer', 'product_manager', 'data_scientist', 'entrepreneur'],
          income: [50000, 150000],
          education: ['bachelor', 'master', 'phd']
        },
        behavior: {
          ticketPrice: 150,
          travelDistance: 200,
          socialMedia: ['twitter', 'linkedin', 'github'],
          eventFrequency: 2,
          preferredDays: ['tuesday', 'wednesday', 'thursday'],
          preferredTimes: ['morning', 'afternoon']
        },
        pastEvents: [],
        preferences: {
          venueTypes: ['conference_center', 'tech_hub', 'university'],
          eventFormats: ['conference', 'workshop', 'hackathon'],
          topics: ['AI', 'machine_learning', 'web_development', 'cloud_computing']
        }
      },
      'Business': {
        demographics: {
          age: [30, 55],
          interests: ['leadership', 'strategy', 'networking', 'finance', 'marketing'],
          profession: ['executive', 'manager', 'consultant', 'entrepreneur'],
          income: [70000, 200000],
          education: ['bachelor', 'master', 'mba']
        },
        behavior: {
          ticketPrice: 300,
          travelDistance: 500,
          socialMedia: ['linkedin', 'twitter'],
          eventFrequency: 1.5,
          preferredDays: ['wednesday', 'thursday', 'friday'],
          preferredTimes: ['morning', 'afternoon']
        },
        pastEvents: [],
        preferences: {
          venueTypes: ['hotel', 'conference_center', 'business_center'],
          eventFormats: ['conference', 'networking', 'workshop'],
          topics: ['leadership', 'strategy', 'finance', 'marketing']
        }
      },
      'Entertainment': {
        demographics: {
          age: [18, 65],
          interests: ['music', 'movies', 'gaming', 'sports', 'art'],
          profession: ['artist', 'musician', 'designer', 'student', 'creative'],
          income: [25000, 100000],
          education: ['high_school', 'bachelor', 'art_school']
        },
        behavior: {
          ticketPrice: 75,
          travelDistance: 100,
          socialMedia: ['instagram', 'tiktok', 'twitter'],
          eventFrequency: 3,
          preferredDays: ['friday', 'saturday', 'sunday'],
          preferredTimes: ['evening', 'night']
        },
        pastEvents: [],
        preferences: {
          venueTypes: ['concert_hall', 'stadium', 'outdoor', 'club'],
          eventFormats: ['concert', 'festival', 'show', 'party'],
          topics: ['music', 'comedy', 'dance', 'gaming']
        }
      },
      'Sports': {
        demographics: {
          age: [16, 60],
          interests: ['fitness', 'competition', 'team_sports', 'outdoor_activities'],
          profession: ['athlete', 'coach', 'fitness_trainer', 'sports_analyst'],
          income: [30000, 120000],
          education: ['high_school', 'bachelor', 'sports_science']
        },
        behavior: {
          ticketPrice: 50,
          travelDistance: 150,
          socialMedia: ['instagram', 'twitter', 'youtube'],
          eventFrequency: 4,
          preferredDays: ['saturday', 'sunday'],
          preferredTimes: ['morning', 'afternoon']
        },
        pastEvents: [],
        preferences: {
          venueTypes: ['stadium', 'arena', 'outdoor', 'gym'],
          eventFormats: ['tournament', 'match', 'training', 'exhibition'],
          topics: ['football', 'basketball', 'tennis', 'fitness']
        }
      }
    };

    return categoryProfiles[category] || categoryProfiles['Other'] || {
      demographics: {
        age: [25, 50],
        interests: ['general'],
        profession: ['professional'],
        income: [40000, 100000],
        education: ['bachelor']
      },
      behavior: {
        ticketPrice: 100,
        travelDistance: 200,
        socialMedia: ['facebook', 'twitter'],
        eventFrequency: 1,
        preferredDays: ['weekend'],
        preferredTimes: ['afternoon']
      },
      pastEvents: [],
      preferences: {
        venueTypes: ['conference_center'],
        eventFormats: ['conference'],
        topics: ['general']
      }
    };
  }

  /**
   * Customize profile based on specific event details
   */
  private customizeProfileForEvent(baseProfile: AudienceProfile, event: Event): AudienceProfile {
    const customized = { ...baseProfile };

    // Adjust based on venue type
    if (event.venue) {
      if (event.venue.toLowerCase().includes('hotel')) {
        customized.behavior.ticketPrice *= 1.3;
        customized.preferences.venueTypes = ['hotel', 'conference_center'];
      } else if (event.venue.toLowerCase().includes('university')) {
        customized.demographics.age = [18, 35];
        customized.behavior.ticketPrice *= 0.7;
        customized.preferences.venueTypes = ['university', 'conference_center'];
      }
    }

    // Adjust based on subcategory
    if (event.subcategory) {
      const subcategory = event.subcategory.toLowerCase();
      if (subcategory.includes('ai') || subcategory.includes('ml')) {
        customized.demographics.interests.push('artificial_intelligence', 'machine_learning');
        customized.demographics.profession.push('data_scientist', 'ai_researcher');
      } else if (subcategory.includes('startup')) {
        customized.demographics.interests.push('entrepreneurship', 'startups');
        customized.demographics.profession.push('founder', 'startup_employee');
      }
    }

    return customized;
  }

  /**
   * Calculate demographic similarity between two audience profiles
   */
  private calculateDemographicSimilarity(profile1: AudienceProfile, profile2: AudienceProfile): number {
    let similarity = 0;
    let factors = 0;

    // Age overlap
    const ageOverlap = this.calculateRangeOverlap(profile1.demographics.age, profile2.demographics.age);
    similarity += ageOverlap * 0.3;
    factors += 0.3;

    // Interest overlap
    const interestOverlap = this.calculateArrayOverlap(
      profile1.demographics.interests,
      profile2.demographics.interests
    );
    similarity += interestOverlap * 0.4;
    factors += 0.4;

    // Profession overlap
    const professionOverlap = this.calculateArrayOverlap(
      profile1.demographics.profession,
      profile2.demographics.profession
    );
    similarity += professionOverlap * 0.3;
    factors += 0.3;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate interest alignment between profiles
   */
  private calculateInterestAlignment(profile1: AudienceProfile, profile2: AudienceProfile): number {
    const interests1 = new Set(profile1.demographics.interests);
    const interests2 = new Set(profile2.demographics.interests);
    
    const intersection = new Set([...interests1].filter(x => interests2.has(x)));
    const union = new Set([...interests1, ...interests2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate behavior pattern similarity
   */
  private calculateBehaviorPatterns(profile1: AudienceProfile, profile2: AudienceProfile): number {
    let similarity = 0;
    let factors = 0;

    // Ticket price similarity (normalized)
    const priceDiff = Math.abs(profile1.behavior.ticketPrice - profile2.behavior.ticketPrice);
    const maxPrice = Math.max(profile1.behavior.ticketPrice, profile2.behavior.ticketPrice);
    const priceSimilarity = maxPrice > 0 ? 1 - (priceDiff / maxPrice) : 0;
    similarity += priceSimilarity * 0.3;
    factors += 0.3;

    // Travel distance similarity
    const distanceDiff = Math.abs(profile1.behavior.travelDistance - profile2.behavior.travelDistance);
    const maxDistance = Math.max(profile1.behavior.travelDistance, profile2.behavior.travelDistance);
    const distanceSimilarity = maxDistance > 0 ? 1 - (distanceDiff / maxDistance) : 0;
    similarity += distanceSimilarity * 0.2;
    factors += 0.2;

    // Preferred days overlap
    const daysOverlap = this.calculateArrayOverlap(
      profile1.behavior.preferredDays,
      profile2.behavior.preferredDays
    );
    similarity += daysOverlap * 0.3;
    factors += 0.3;

    // Social media overlap
    const socialOverlap = this.calculateArrayOverlap(
      profile1.behavior.socialMedia,
      profile2.behavior.socialMedia
    );
    similarity += socialOverlap * 0.2;
    factors += 0.2;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate historical preference similarity
   */
  private calculateHistoricalPreference(profile1: AudienceProfile, profile2: AudienceProfile): number {
    // This would ideally use historical data, but for now we'll use preferences
    const venueOverlap = this.calculateArrayOverlap(
      profile1.preferences.venueTypes,
      profile2.preferences.venueTypes
    );

    const formatOverlap = this.calculateArrayOverlap(
      profile1.preferences.eventFormats,
      profile2.preferences.eventFormats
    );

    const topicOverlap = this.calculateArrayOverlap(
      profile1.preferences.topics,
      profile2.preferences.topics
    );

    return (venueOverlap + formatOverlap + topicOverlap) / 3;
  }

  /**
   * Calculate weighted overlap score
   */
  private calculateWeightedOverlap(factors: {
    demographicSimilarity: number;
    interestAlignment: number;
    behaviorPatterns: number;
    historicalPreference: number;
  }): number {
    const weights = {
      demographicSimilarity: 0.3,
      interestAlignment: 0.4,
      behaviorPatterns: 0.2,
      historicalPreference: 0.1
    };

    return (
      factors.demographicSimilarity * weights.demographicSimilarity +
      factors.interestAlignment * weights.interestAlignment +
      factors.behaviorPatterns * weights.behaviorPatterns +
      factors.historicalPreference * weights.historicalPreference
    );
  }

  /**
   * Generate human-readable reasoning for overlap prediction
   */
  private generateOverlapReasoning(factors: {
    demographicSimilarity: number;
    interestAlignment: number;
    behaviorPatterns: number;
    historicalPreference: number;
  }): string[] {
    const reasoning: string[] = [];

    if (factors.demographicSimilarity > 0.7) {
      reasoning.push('High demographic similarity between target audiences');
    } else if (factors.demographicSimilarity > 0.4) {
      reasoning.push('Moderate demographic overlap');
    } else {
      reasoning.push('Low demographic similarity');
    }

    if (factors.interestAlignment > 0.6) {
      reasoning.push('Strong interest alignment in event topics');
    } else if (factors.interestAlignment > 0.3) {
      reasoning.push('Some shared interests between audiences');
    } else {
      reasoning.push('Limited interest overlap');
    }

    if (factors.behaviorPatterns > 0.6) {
      reasoning.push('Similar spending and attendance patterns');
    } else if (factors.behaviorPatterns > 0.3) {
      reasoning.push('Some behavioral similarities');
    } else {
      reasoning.push('Different audience behavior patterns');
    }

    return reasoning;
  }

  /**
   * Calculate confidence in the prediction
   */
  private calculateConfidence(profile1: EventAudienceProfile, profile2: EventAudienceProfile): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have historical data
    if (profile1.expectedAudience.pastEvents.length > 0) confidence += 0.2;
    if (profile2.expectedAudience.pastEvents.length > 0) confidence += 0.2;

    // Increase confidence if events have detailed information
    if (profile1.subcategory) confidence += 0.1;
    if (profile2.subcategory) confidence += 0.1;

    // Increase confidence if we have venue information
    if (profile1.expectedAudience.preferences.venueTypes.length > 1) confidence += 0.05;
    if (profile2.expectedAudience.preferences.venueTypes.length > 1) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Estimate audience quality based on event characteristics
   */
  private estimateAudienceQuality(event: Event): number {
    let quality = 0.5; // Base quality

    // Higher quality for events with venues
    if (event.venue) quality += 0.2;

    // Higher quality for events with images
    if (event.imageUrl) quality += 0.1;

    // Higher quality for events with detailed descriptions
    if (event.description && event.description.length > 100) quality += 0.1;

    // Higher quality for events with expected attendees
    if (event.expectedAttendees && event.expectedAttendees > 100) quality += 0.1;

    return Math.min(quality, 1.0);
  }

  // Helper methods
  private calculateRangeOverlap(range1: number[], range2: number[]): number {
    const [min1, max1] = range1;
    const [min2, max2] = range2;
    
    const overlap = Math.max(0, Math.min(max1, max2) - Math.max(min1, min2));
    const union = Math.max(max1, max2) - Math.min(min1, min2);
    
    return union > 0 ? overlap / union : 0;
  }

  private calculateArrayOverlap(array1: string[], array2: string[]): number {
    const set1 = new Set(array1);
    const set2 = new Set(array2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Cache methods (would integrate with actual caching system)
  private async getCachedAudienceProfile(eventId: string): Promise<EventAudienceProfile | null> {
    // TODO: Implement actual caching
    return null;
  }

  private async cacheAudienceProfile(eventId: string, profile: EventAudienceProfile): Promise<void> {
    // TODO: Implement actual caching
    console.log(`Caching audience profile for event ${eventId}`);
  }
}

export const audienceOverlapService = new AudienceOverlapService();
