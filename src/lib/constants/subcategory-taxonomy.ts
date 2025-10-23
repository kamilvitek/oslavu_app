// Subcategory taxonomy for granular audience overlap analysis
export interface SubcategoryDefinition {
  name: string;
  keywords: string[];
  relatedSubcategories: string[];
  audienceOverlapCoefficients: Record<string, number>; // overlap with other subcategories
  audienceCharacteristics: {
    ageRange: [number, number];
    interests: string[];
    behavior: {
      ticketPrice: number;
      travelDistance: number;
      socialMedia: string[];
      eventFrequency: number;
    };
  };
}

export interface CategorySubcategories {
  [category: string]: {
    subcategories: Record<string, SubcategoryDefinition>;
    defaultOverlap: number; // overlap between different subcategories in same category
  };
}

export const SUBCATEGORY_TAXONOMY: CategorySubcategories = {
  'Entertainment': {
    defaultOverlap: 0.3, // 30% overlap between different entertainment subcategories
    subcategories: {
      'Rock': {
        name: 'Rock',
        keywords: ['rock', 'metal', 'punk', 'alternative', 'indie', 'grunge', 'hard rock', 'classic rock'],
        relatedSubcategories: ['Metal', 'Alternative', 'Indie'],
        audienceOverlapCoefficients: {
          'Metal': 0.75,
          'Alternative': 0.65,
          'Indie': 0.45,
          'Pop': 0.25,
          'Electronic': 0.15,
          'Jazz': 0.05,
          'Classical': 0.02
        },
        audienceCharacteristics: {
          ageRange: [18, 45],
          interests: ['music', 'concerts', 'festivals', 'guitar', 'drums', 'live music'],
          behavior: {
            ticketPrice: 60,
            travelDistance: 150,
            socialMedia: ['instagram', 'twitter', 'youtube'],
            eventFrequency: 2.5
          }
        }
      },
      'Pop': {
        name: 'Pop',
        keywords: ['pop', 'mainstream', 'top 40', 'radio', 'chart', 'hit', 'single'],
        relatedSubcategories: ['Electronic', 'Hip-Hop'],
        audienceOverlapCoefficients: {
          'Electronic': 0.55,
          'Hip-Hop': 0.40,
          'Rock': 0.25,
          'Jazz': 0.15,
          'Classical': 0.05
        },
        audienceCharacteristics: {
          ageRange: [16, 35],
          interests: ['music', 'dancing', 'social media', 'trends', 'fashion'],
          behavior: {
            ticketPrice: 45,
            travelDistance: 100,
            socialMedia: ['tiktok', 'instagram', 'twitter'],
            eventFrequency: 3.0
          }
        }
      },
      'Jazz': {
        name: 'Jazz',
        keywords: ['jazz', 'blues', 'soul', 'funk', 'bebop', 'swing', 'fusion', 'smooth jazz'],
        relatedSubcategories: ['Blues', 'Soul'],
        audienceOverlapCoefficients: {
          'Blues': 0.80,
          'Soul': 0.70,
          'Classical': 0.35,
          'Rock': 0.20,
          'Pop': 0.15,
          'Electronic': 0.10
        },
        audienceCharacteristics: {
          ageRange: [25, 65],
          interests: ['music', 'instruments', 'history', 'culture', 'art'],
          behavior: {
            ticketPrice: 80,
            travelDistance: 200,
            socialMedia: ['facebook', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Electronic': {
        name: 'Electronic',
        keywords: ['electronic', 'edm', 'techno', 'house', 'trance', 'dubstep', 'ambient', 'synth'],
        relatedSubcategories: ['Techno', 'House'],
        audienceOverlapCoefficients: {
          'Techno': 0.85,
          'House': 0.80,
          'Pop': 0.55,
          'Hip-Hop': 0.30,
          'Rock': 0.15,
          'Jazz': 0.10
        },
        audienceCharacteristics: {
          ageRange: [18, 40],
          interests: ['dancing', 'music production', 'technology', 'nightlife', 'festivals'],
          behavior: {
            ticketPrice: 70,
            travelDistance: 300,
            socialMedia: ['instagram', 'tiktok', 'soundcloud'],
            eventFrequency: 4.0
          }
        }
      },
      'Hip-Hop': {
        name: 'Hip-Hop',
        keywords: ['hip hop', 'rap', 'urban', 'r&b', 'trap', 'drill', 'old school'],
        relatedSubcategories: ['R&B', 'Urban'],
        audienceOverlapCoefficients: {
          'R&B': 0.70,
          'Urban': 0.85,
          'Pop': 0.40,
          'Electronic': 0.30,
          'Rock': 0.10,
          'Jazz': 0.05
        },
        audienceCharacteristics: {
          ageRange: [16, 35],
          interests: ['music', 'dancing', 'fashion', 'culture', 'social media'],
          behavior: {
            ticketPrice: 55,
            travelDistance: 120,
            socialMedia: ['instagram', 'tiktok', 'twitter'],
            eventFrequency: 2.8
          }
        }
      },
      'Classical': {
        name: 'Classical',
        keywords: ['classical', 'orchestra', 'symphony', 'chamber', 'opera', 'piano', 'violin', 'concerto'],
        relatedSubcategories: ['Opera', 'Chamber Music'],
        audienceOverlapCoefficients: {
          'Opera': 0.60,
          'Chamber Music': 0.75,
          'Jazz': 0.35,
          'Rock': 0.02,
          'Pop': 0.05,
          'Electronic': 0.05
        },
        audienceCharacteristics: {
          ageRange: [30, 70],
          interests: ['music', 'culture', 'art', 'history', 'education'],
          behavior: {
            ticketPrice: 120,
            travelDistance: 250,
            socialMedia: ['facebook', 'linkedin'],
            eventFrequency: 1.0
          }
        }
      },
      'Comedy': {
        name: 'Comedy',
        keywords: ['comedy', 'stand-up', 'humor', 'jokes', 'comic', 'funny', 'laugh'],
        relatedSubcategories: ['Stand-up', 'Improv'],
        audienceOverlapCoefficients: {
          'Stand-up': 0.90,
          'Improv': 0.60,
          'Theater': 0.40,
          'Pop': 0.20,
          'Rock': 0.15,
          'Classical': 0.10
        },
        audienceCharacteristics: {
          ageRange: [18, 55],
          interests: ['humor', 'entertainment', 'social', 'culture'],
          behavior: {
            ticketPrice: 35,
            travelDistance: 80,
            socialMedia: ['twitter', 'instagram', 'youtube'],
            eventFrequency: 1.8
          }
        }
      },
      'Theater': {
        name: 'Theater',
        keywords: ['theater', 'theatre', 'drama', 'play', 'musical', 'broadway', 'stage', 'acting'],
        relatedSubcategories: ['Musical', 'Drama'],
        audienceOverlapCoefficients: {
          'Musical': 0.70,
          'Drama': 0.80,
          'Comedy': 0.40,
          'Classical': 0.30,
          'Pop': 0.15,
          'Rock': 0.05
        },
        audienceCharacteristics: {
          ageRange: [25, 65],
          interests: ['culture', 'art', 'literature', 'performance', 'education'],
          behavior: {
            ticketPrice: 90,
            travelDistance: 180,
            socialMedia: ['facebook', 'twitter'],
            eventFrequency: 1.2
          }
        }
      },
      'Film': {
        name: 'Film',
        keywords: ['film', 'movie', 'cinema', 'screening', 'premiere', 'festival', 'documentary'],
        relatedSubcategories: ['Documentary', 'Film Festival'],
        audienceOverlapCoefficients: {
          'Documentary': 0.65,
          'Film Festival': 0.80,
          'Theater': 0.25,
          'Comedy': 0.20,
          'Pop': 0.15,
          'Classical': 0.10
        },
        audienceCharacteristics: {
          ageRange: [18, 60],
          interests: ['movies', 'culture', 'art', 'entertainment', 'storytelling'],
          behavior: {
            ticketPrice: 25,
            travelDistance: 50,
            socialMedia: ['instagram', 'twitter', 'youtube'],
            eventFrequency: 2.0
          }
        }
      }
    }
  },
  'Sports': {
    defaultOverlap: 0.25,
    subcategories: {
      'Football': {
        name: 'Football',
        keywords: ['football', 'soccer', 'match', 'game', 'championship', 'league', 'cup'],
        relatedSubcategories: ['Soccer', 'Team Sports'],
        audienceOverlapCoefficients: {
          'Soccer': 0.95,
          'Team Sports': 0.60,
          'Basketball': 0.40,
          'Tennis': 0.20,
          'Running': 0.15,
          'Extreme Sports': 0.10
        },
        audienceCharacteristics: {
          ageRange: [12, 65],
          interests: ['sports', 'competition', 'team', 'fitness', 'social'],
          behavior: {
            ticketPrice: 40,
            travelDistance: 200,
            socialMedia: ['twitter', 'instagram', 'youtube'],
            eventFrequency: 2.0
          }
        }
      },
      'Basketball': {
        name: 'Basketball',
        keywords: ['basketball', 'nba', 'hoops', 'court', 'dunk', 'shoot'],
        relatedSubcategories: ['Team Sports'],
        audienceOverlapCoefficients: {
          'Team Sports': 0.70,
          'Football': 0.40,
          'Tennis': 0.25,
          'Running': 0.20,
          'Extreme Sports': 0.10
        },
        audienceCharacteristics: {
          ageRange: [10, 50],
          interests: ['sports', 'competition', 'team', 'fitness', 'athletics'],
          behavior: {
            ticketPrice: 50,
            travelDistance: 150,
            socialMedia: ['instagram', 'twitter', 'youtube'],
            eventFrequency: 1.8
          }
        }
      },
      'Tennis': {
        name: 'Tennis',
        keywords: ['tennis', 'wimbledon', 'grand slam', 'racket', 'court', 'serve'],
        relatedSubcategories: ['Individual Sports'],
        audienceOverlapCoefficients: {
          'Individual Sports': 0.65,
          'Golf': 0.40,
          'Running': 0.30,
          'Basketball': 0.25,
          'Football': 0.20,
          'Extreme Sports': 0.05
        },
        audienceCharacteristics: {
          ageRange: [20, 60],
          interests: ['sports', 'competition', 'fitness', 'strategy', 'individual'],
          behavior: {
            ticketPrice: 80,
            travelDistance: 300,
            socialMedia: ['twitter', 'instagram'],
            eventFrequency: 1.5
          }
        }
      },
      'Running': {
        name: 'Running',
        keywords: ['running', 'marathon', '5k', '10k', 'race', 'track', 'jogging'],
        relatedSubcategories: ['Individual Sports'],
        audienceOverlapCoefficients: {
          'Individual Sports': 0.70,
          'Tennis': 0.30,
          'Golf': 0.25,
          'Basketball': 0.20,
          'Football': 0.15,
          'Extreme Sports': 0.10
        },
        audienceCharacteristics: {
          ageRange: [18, 55],
          interests: ['fitness', 'health', 'competition', 'endurance', 'lifestyle'],
          behavior: {
            ticketPrice: 30,
            travelDistance: 100,
            socialMedia: ['instagram', 'strava', 'facebook'],
            eventFrequency: 3.5
          }
        }
      },
      'Extreme Sports': {
        name: 'Extreme Sports',
        keywords: ['extreme', 'skateboard', 'bmx', 'snowboard', 'surf', 'climbing', 'parkour'],
        relatedSubcategories: ['Action Sports'],
        audienceOverlapCoefficients: {
          'Action Sports': 0.85,
          'Running': 0.10,
          'Tennis': 0.05,
          'Basketball': 0.10,
          'Football': 0.10
        },
        audienceCharacteristics: {
          ageRange: [16, 35],
          interests: ['adventure', 'thrill', 'fitness', 'outdoor', 'youth culture'],
          behavior: {
            ticketPrice: 60,
            travelDistance: 400,
            socialMedia: ['instagram', 'tiktok', 'youtube'],
            eventFrequency: 2.2
          }
        }
      }
    }
  },
  'Technology': {
    defaultOverlap: 0.40,
    subcategories: {
      'AI/ML': {
        name: 'AI/ML',
        keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'deep learning', 'chatgpt'],
        relatedSubcategories: ['Data Science', 'Machine Learning'],
        audienceOverlapCoefficients: {
          'Data Science': 0.80,
          'Machine Learning': 0.90,
          'Web Development': 0.45,
          'Mobile': 0.30,
          'Security': 0.25,
          'DevOps': 0.20
        },
        audienceCharacteristics: {
          ageRange: [22, 45],
          interests: ['technology', 'innovation', 'programming', 'research', 'future'],
          behavior: {
            ticketPrice: 200,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter', 'github'],
            eventFrequency: 1.5
          }
        }
      },
      'Web Development': {
        name: 'Web Development',
        keywords: ['web', 'frontend', 'backend', 'javascript', 'react', 'angular', 'vue', 'node', 'html', 'css'],
        relatedSubcategories: ['Frontend', 'Backend'],
        audienceOverlapCoefficients: {
          'Frontend': 0.85,
          'Backend': 0.70,
          'Mobile': 0.50,
          'DevOps': 0.40,
          'AI/ML': 0.45,
          'Security': 0.30
        },
        audienceCharacteristics: {
          ageRange: [20, 50],
          interests: ['programming', 'design', 'technology', 'startups', 'innovation'],
          behavior: {
            ticketPrice: 150,
            travelDistance: 300,
            socialMedia: ['github', 'linkedin', 'twitter'],
            eventFrequency: 2.0
          }
        }
      },
      'Mobile': {
        name: 'Mobile',
        keywords: ['mobile', 'ios', 'android', 'app', 'smartphone', 'react native', 'flutter'],
        relatedSubcategories: ['App Development'],
        audienceOverlapCoefficients: {
          'App Development': 0.90,
          'Web Development': 0.50,
          'AI/ML': 0.30,
          'DevOps': 0.35,
          'Security': 0.25
        },
        audienceCharacteristics: {
          ageRange: [22, 45],
          interests: ['mobile', 'apps', 'technology', 'design', 'user experience'],
          behavior: {
            ticketPrice: 180,
            travelDistance: 350,
            socialMedia: ['linkedin', 'twitter', 'github'],
            eventFrequency: 1.8
          }
        }
      },
      'DevOps': {
        name: 'DevOps',
        keywords: ['devops', 'docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'infrastructure', 'cloud'],
        relatedSubcategories: ['Cloud', 'Infrastructure'],
        audienceOverlapCoefficients: {
          'Cloud': 0.85,
          'Infrastructure': 0.80,
          'Security': 0.60,
          'Web Development': 0.40,
          'Mobile': 0.35,
          'AI/ML': 0.20
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['infrastructure', 'automation', 'cloud', 'scalability', 'operations'],
          behavior: {
            ticketPrice: 220,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter', 'github'],
            eventFrequency: 1.3
          }
        }
      },
      'Security': {
        name: 'Security',
        keywords: ['security', 'cybersecurity', 'hacking', 'penetration', 'vulnerability', 'privacy', 'encryption'],
        relatedSubcategories: ['Cybersecurity'],
        audienceOverlapCoefficients: {
          'Cybersecurity': 0.95,
          'DevOps': 0.60,
          'Web Development': 0.30,
          'AI/ML': 0.25,
          'Mobile': 0.25
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['security', 'privacy', 'technology', 'risk', 'compliance'],
          behavior: {
            ticketPrice: 250,
            travelDistance: 450,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.2
          }
        }
      }
    }
  },
  'Business': {
    defaultOverlap: 0.35,
    subcategories: {
      'Marketing': {
        name: 'Marketing',
        keywords: ['marketing', 'digital marketing', 'social media', 'branding', 'advertising', 'seo', 'content'],
        relatedSubcategories: ['Digital Marketing', 'Branding'],
        audienceOverlapCoefficients: {
          'Digital Marketing': 0.85,
          'Branding': 0.70,
          'Sales': 0.50,
          'Leadership': 0.30,
          'Finance': 0.20,
          'HR': 0.15
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['marketing', 'creativity', 'social media', 'brands', 'growth'],
          behavior: {
            ticketPrice: 180,
            travelDistance: 300,
            socialMedia: ['linkedin', 'twitter', 'instagram'],
            eventFrequency: 2.5
          }
        }
      },
      'Sales': {
        name: 'Sales',
        keywords: ['sales', 'selling', 'revenue', 'leads', 'prospects', 'closing', 'b2b', 'b2c'],
        relatedSubcategories: ['Business Development'],
        audienceOverlapCoefficients: {
          'Business Development': 0.80,
          'Marketing': 0.50,
          'Leadership': 0.40,
          'Finance': 0.30,
          'HR': 0.20
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['sales', 'business', 'networking', 'relationships', 'growth'],
          behavior: {
            ticketPrice: 200,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 2.0
          }
        }
      },
      'Finance': {
        name: 'Finance',
        keywords: ['finance', 'financial', 'investment', 'banking', 'accounting', 'trading', 'wealth'],
        relatedSubcategories: ['Investment', 'Banking'],
        audienceOverlapCoefficients: {
          'Investment': 0.85,
          'Banking': 0.80,
          'Leadership': 0.45,
          'Sales': 0.30,
          'Marketing': 0.20,
          'HR': 0.15
        },
        audienceCharacteristics: {
          ageRange: [28, 60],
          interests: ['finance', 'investment', 'money', 'strategy', 'analysis'],
          behavior: {
            ticketPrice: 300,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Leadership': {
        name: 'Leadership',
        keywords: ['leadership', 'management', 'executive', 'ceo', 'director', 'team', 'strategy'],
        relatedSubcategories: ['Management', 'Strategy'],
        audienceOverlapCoefficients: {
          'Management': 0.90,
          'Strategy': 0.75,
          'HR': 0.60,
          'Finance': 0.45,
          'Sales': 0.40,
          'Marketing': 0.30
        },
        audienceCharacteristics: {
          ageRange: [30, 65],
          interests: ['leadership', 'management', 'strategy', 'business', 'growth'],
          behavior: {
            ticketPrice: 400,
            travelDistance: 600,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.0
          }
        }
      },
      'HR': {
        name: 'HR',
        keywords: ['hr', 'human resources', 'recruitment', 'talent', 'employee', 'workplace', 'culture'],
        relatedSubcategories: ['Talent Management'],
        audienceOverlapCoefficients: {
          'Talent Management': 0.90,
          'Leadership': 0.60,
          'Marketing': 0.15,
          'Sales': 0.20,
          'Finance': 0.15
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['people', 'culture', 'workplace', 'talent', 'development'],
          behavior: {
            ticketPrice: 250,
            travelDistance: 350,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
          }
        }
      }
    }
  }
};

// Helper functions for subcategory analysis
export function getSubcategoryDefinition(category: string, subcategory: string): SubcategoryDefinition | null {
  const categoryData = SUBCATEGORY_TAXONOMY[category];
  if (!categoryData) return null;
  
  return categoryData.subcategories[subcategory] || null;
}

export function calculateSubcategoryOverlap(
  category1: string, 
  subcategory1: string | null,
  category2: string, 
  subcategory2: string | null
): number {
  // Same category and subcategory: 90-95% overlap
  if (category1 === category2 && subcategory1 === subcategory2) {
    return 0.92;
  }
  
  // Same category, different subcategories: use taxonomy coefficients
  if (category1 === category2 && subcategory1 && subcategory2) {
    const subcat1 = getSubcategoryDefinition(category1, subcategory1);
    if (subcat1 && subcat1.audienceOverlapCoefficients[subcategory2]) {
      return subcat1.audienceOverlapCoefficients[subcategory2];
    }
    // Fallback to category default
    const categoryData = SUBCATEGORY_TAXONOMY[category1];
    return categoryData ? categoryData.defaultOverlap : 0.3;
  }
  
  // Same category, one has subcategory: moderate overlap
  if (category1 === category2) {
    return 0.4;
  }
  
  // Different categories: low overlap
  return 0.1;
}

export function getSubcategoryKeywords(category: string, subcategory: string): string[] {
  const definition = getSubcategoryDefinition(category, subcategory);
  return definition ? definition.keywords : [];
}

export function getAllSubcategoriesForCategory(category: string): string[] {
  const categoryData = SUBCATEGORY_TAXONOMY[category];
  return categoryData ? Object.keys(categoryData.subcategories) : [];
}
