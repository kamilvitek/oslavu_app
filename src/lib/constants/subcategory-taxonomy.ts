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
      },
      'Cycling': {
        name: 'Cycling',
        keywords: ['cycling', 'bike', 'bicycle', 'tour de france', 'mountain biking', 'road cycling', 'gravel', 'velodrome'],
        relatedSubcategories: ['Individual Sports'],
        audienceOverlapCoefficients: {
          'Individual Sports': 0.70,
          'Running': 0.45,
          'Tennis': 0.30,
          'Extreme Sports': 0.25,
          'Basketball': 0.15,
          'Football': 0.10
        },
        audienceCharacteristics: {
          ageRange: [20, 60],
          interests: ['fitness', 'endurance', 'outdoor', 'competition', 'health'],
          behavior: {
            ticketPrice: 40,
            travelDistance: 200,
            socialMedia: ['strava', 'instagram', 'facebook'],
            eventFrequency: 2.8
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
      },
      'Crypto': {
        name: 'Crypto',
        keywords: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'web3', 'metaverse'],
        relatedSubcategories: ['Blockchain', 'Web3'],
        audienceOverlapCoefficients: {
          'Blockchain': 0.90,
          'Web3': 0.85,
          'AI/ML': 0.40,
          'Web Development': 0.35,
          'Security': 0.30,
          'Mobile': 0.20
        },
        audienceCharacteristics: {
          ageRange: [22, 45],
          interests: ['crypto', 'blockchain', 'finance', 'technology', 'innovation'],
          behavior: {
            ticketPrice: 300,
            travelDistance: 500,
            socialMedia: ['twitter', 'discord', 'telegram'],
            eventFrequency: 2.0
          }
        }
      },
      'Fintech': {
        name: 'Fintech',
        keywords: ['fintech', 'financial technology', 'digital banking', 'payments', 'neobank', 'insurtech', 'wealthtech'],
        relatedSubcategories: ['Financial Technology'],
        audienceOverlapCoefficients: {
          'Financial Technology': 0.95,
          'Crypto': 0.60,
          'Web Development': 0.50,
          'AI/ML': 0.45,
          'Security': 0.40,
          'Mobile': 0.35
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['finance', 'technology', 'banking', 'payments', 'innovation'],
          behavior: {
            ticketPrice: 280,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
          }
        }
      },
      'Healthtech': {
        name: 'Healthtech',
        keywords: ['healthtech', 'digital health', 'telemedicine', 'healthcare technology', 'medtech', 'health apps', 'wearables'],
        relatedSubcategories: ['Digital Health'],
        audienceOverlapCoefficients: {
          'Digital Health': 0.95,
          'AI/ML': 0.60,
          'Mobile': 0.50,
          'Web Development': 0.40,
          'Security': 0.35,
          'Crypto': 0.20
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['healthcare', 'technology', 'medicine', 'wellness', 'innovation'],
          behavior: {
            ticketPrice: 320,
            travelDistance: 450,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Space Tech': {
        name: 'Space Tech',
        keywords: ['space tech', 'aerospace', 'satellite', 'space exploration', 'rocket', 'spacex', 'nasa', 'space industry'],
        relatedSubcategories: ['Aerospace'],
        audienceOverlapCoefficients: {
          'Aerospace': 0.90,
          'AI/ML': 0.50,
          'Security': 0.40,
          'Web Development': 0.30,
          'Mobile': 0.20,
          'Crypto': 0.15
        },
        audienceCharacteristics: {
          ageRange: [25, 60],
          interests: ['space', 'technology', 'engineering', 'innovation', 'science'],
          behavior: {
            ticketPrice: 400,
            travelDistance: 600,
            socialMedia: ['linkedin', 'twitter', 'youtube'],
            eventFrequency: 1.0
          }
        }
      },
      'Climate Tech': {
        name: 'Climate Tech',
        keywords: ['climate tech', 'green tech', 'sustainability', 'carbon', 'renewable energy', 'clean tech', 'environmental'],
        relatedSubcategories: ['Green Tech'],
        audienceOverlapCoefficients: {
          'Green Tech': 0.95,
          'AI/ML': 0.45,
          'Web Development': 0.35,
          'Security': 0.30,
          'Mobile': 0.25,
          'Crypto': 0.20
        },
        audienceCharacteristics: {
          ageRange: [22, 50],
          interests: ['sustainability', 'environment', 'technology', 'climate', 'innovation'],
          behavior: {
            ticketPrice: 250,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
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
      },
      'Startups': {
        name: 'Startups',
        keywords: ['startup', 'entrepreneurship', 'venture capital', 'vc', 'funding', 'pitch', 'incubator', 'accelerator'],
        relatedSubcategories: ['Entrepreneurship'],
        audienceOverlapCoefficients: {
          'Entrepreneurship': 0.95,
          'Innovation': 0.80,
          'Leadership': 0.60,
          'Marketing': 0.50,
          'Finance': 0.45,
          'Sales': 0.40
        },
        audienceCharacteristics: {
          ageRange: [22, 45],
          interests: ['entrepreneurship', 'innovation', 'technology', 'business', 'growth'],
          behavior: {
            ticketPrice: 200,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter', 'instagram'],
            eventFrequency: 2.5
          }
        }
      },
      'Sustainability': {
        name: 'Sustainability',
        keywords: ['sustainability', 'esg', 'green business', 'carbon neutral', 'sustainable', 'environmental', 'csr'],
        relatedSubcategories: ['ESG'],
        audienceOverlapCoefficients: {
          'ESG': 0.90,
          'Innovation': 0.60,
          'Leadership': 0.50,
          'Marketing': 0.40,
          'Finance': 0.35,
          'HR': 0.30
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['sustainability', 'environment', 'social responsibility', 'business', 'innovation'],
          behavior: {
            ticketPrice: 220,
            travelDistance: 350,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
          }
        }
      },
      'Data Analytics': {
        name: 'Data Analytics',
        keywords: ['data analytics', 'business intelligence', 'data science', 'big data', 'analytics', 'insights', 'metrics'],
        relatedSubcategories: ['Business Intelligence'],
        audienceOverlapCoefficients: {
          'Business Intelligence': 0.95,
          'Innovation': 0.70,
          'Leadership': 0.60,
          'Marketing': 0.55,
          'Finance': 0.50,
          'Sales': 0.45
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['data', 'analytics', 'technology', 'business', 'insights'],
          behavior: {
            ticketPrice: 280,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 2.0
          }
        }
      },
      'Customer Experience': {
        name: 'Customer Experience',
        keywords: ['customer experience', 'cx', 'user experience', 'ux', 'customer journey', 'customer success', 'retention'],
        relatedSubcategories: ['UX'],
        audienceOverlapCoefficients: {
          'UX': 0.85,
          'Marketing': 0.70,
          'Innovation': 0.60,
          'Leadership': 0.50,
          'Sales': 0.45,
          'HR': 0.30
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['customer', 'experience', 'design', 'business', 'innovation'],
          behavior: {
            ticketPrice: 250,
            travelDistance: 350,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 2.2
          }
        }
      },
      'Branding': {
        name: 'Branding',
        keywords: ['branding', 'brand', 'brand strategy', 'brand identity', 'brand management', 'brand awareness', 'reputation'],
        relatedSubcategories: ['Brand Strategy'],
        audienceOverlapCoefficients: {
          'Brand Strategy': 0.90,
          'Marketing': 0.80,
          'Customer Experience': 0.60,
          'Innovation': 0.50,
          'Leadership': 0.40,
          'Sales': 0.35
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['branding', 'marketing', 'design', 'creativity', 'business'],
          behavior: {
            ticketPrice: 200,
            travelDistance: 300,
            socialMedia: ['linkedin', 'twitter', 'instagram'],
            eventFrequency: 2.0
          }
        }
      },
      'Innovation': {
        name: 'Innovation',
        keywords: ['innovation', 'disruption', 'digital transformation', 'change management', 'agile', 'design thinking'],
        relatedSubcategories: ['Digital Transformation'],
        audienceOverlapCoefficients: {
          'Digital Transformation': 0.85,
          'Startups': 0.80,
          'Leadership': 0.70,
          'Data Analytics': 0.70,
          'Customer Experience': 0.60,
          'Sustainability': 0.60
        },
        audienceCharacteristics: {
          ageRange: [25, 55],
          interests: ['innovation', 'technology', 'business', 'change', 'growth'],
          behavior: {
            ticketPrice: 300,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.5
          }
        }
      }
    }
  },
  'Finance': {
    defaultOverlap: 0.30,
    subcategories: {
      'Investment': {
        name: 'Investment',
        keywords: ['investment', 'investing', 'portfolio', 'stocks', 'bonds', 'mutual funds', 'wealth management'],
        relatedSubcategories: ['Wealth Management'],
        audienceOverlapCoefficients: {
          'Wealth Management': 0.85,
          'Private Equity & Hedge Funds': 0.70,
          'Real Estate': 0.60,
          'ESG Investing': 0.50,
          'Crypto & Bitcoin': 0.40,
          'Fintech': 0.35
        },
        audienceCharacteristics: {
          ageRange: [30, 65],
          interests: ['finance', 'investment', 'money', 'wealth', 'retirement'],
          behavior: {
            ticketPrice: 400,
            travelDistance: 600,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.2
          }
        }
      },
      'Banking': {
        name: 'Banking',
        keywords: ['banking', 'bank', 'financial services', 'credit', 'loans', 'mortgage', 'retail banking'],
        relatedSubcategories: ['Financial Services'],
        audienceOverlapCoefficients: {
          'Financial Services': 0.90,
          'Fintech': 0.70,
          'Investment': 0.60,
          'Real Estate': 0.50,
          'Crypto & Bitcoin': 0.30,
          'ESG Investing': 0.25
        },
        audienceCharacteristics: {
          ageRange: [25, 60],
          interests: ['banking', 'finance', 'financial services', 'business', 'compliance'],
          behavior: {
            ticketPrice: 350,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Crypto & Bitcoin': {
        name: 'Crypto & Bitcoin',
        keywords: ['crypto', 'bitcoin', 'cryptocurrency', 'blockchain', 'defi', 'nft', 'digital assets', 'web3'],
        relatedSubcategories: ['Digital Assets'],
        audienceOverlapCoefficients: {
          'Digital Assets': 0.95,
          'Fintech': 0.70,
          'Investment': 0.40,
          'Real Estate': 0.20,
          'ESG Investing': 0.15,
          'Banking': 0.30
        },
        audienceCharacteristics: {
          ageRange: [22, 50],
          interests: ['crypto', 'blockchain', 'technology', 'investment', 'innovation'],
          behavior: {
            ticketPrice: 300,
            travelDistance: 500,
            socialMedia: ['twitter', 'discord', 'telegram'],
            eventFrequency: 2.5
          }
        }
      },
      'Fintech': {
        name: 'Fintech',
        keywords: ['fintech', 'financial technology', 'digital banking', 'payments', 'neobank', 'insurtech', 'wealthtech'],
        relatedSubcategories: ['Financial Technology'],
        audienceOverlapCoefficients: {
          'Financial Technology': 0.95,
          'Crypto & Bitcoin': 0.70,
          'Banking': 0.70,
          'Investment': 0.35,
          'Real Estate': 0.30,
          'ESG Investing': 0.25
        },
        audienceCharacteristics: {
          ageRange: [25, 50],
          interests: ['fintech', 'technology', 'finance', 'innovation', 'digital'],
          behavior: {
            ticketPrice: 350,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 2.0
          }
        }
      },
      'Real Estate': {
        name: 'Real Estate',
        keywords: ['real estate', 'property', 'real estate investment', 'reits', 'commercial real estate', 'residential'],
        relatedSubcategories: ['Property Investment'],
        audienceOverlapCoefficients: {
          'Property Investment': 0.90,
          'Investment': 0.60,
          'Banking': 0.50,
          'ESG Investing': 0.40,
          'Fintech': 0.30,
          'Crypto & Bitcoin': 0.20
        },
        audienceCharacteristics: {
          ageRange: [28, 65],
          interests: ['real estate', 'property', 'investment', 'business', 'development'],
          behavior: {
            ticketPrice: 300,
            travelDistance: 400,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
          }
        }
      },
      'Private Equity & Hedge Funds': {
        name: 'Private Equity & Hedge Funds',
        keywords: ['private equity', 'hedge funds', 'venture capital', 'vc', 'pe', 'alternative investments', 'fund management'],
        relatedSubcategories: ['Alternative Investments'],
        audienceOverlapCoefficients: {
          'Alternative Investments': 0.95,
          'Investment': 0.70,
          'Real Estate': 0.50,
          'ESG Investing': 0.40,
          'Banking': 0.35,
          'Fintech': 0.30
        },
        audienceCharacteristics: {
          ageRange: [30, 65],
          interests: ['private equity', 'hedge funds', 'investment', 'finance', 'wealth'],
          behavior: {
            ticketPrice: 500,
            travelDistance: 700,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.0
          }
        }
      },
      'ESG Investing': {
        name: 'ESG Investing',
        keywords: ['esg', 'sustainable investing', 'impact investing', 'green finance', 'socially responsible', 'sri'],
        relatedSubcategories: ['Sustainable Investing'],
        audienceOverlapCoefficients: {
          'Sustainable Investing': 0.95,
          'Real Estate': 0.40,
          'Investment': 0.50,
          'Private Equity & Hedge Funds': 0.40,
          'Banking': 0.25,
          'Crypto & Bitcoin': 0.15
        },
        audienceCharacteristics: {
          ageRange: [25, 60],
          interests: ['esg', 'sustainability', 'impact', 'finance', 'environment'],
          behavior: {
            ticketPrice: 350,
            travelDistance: 500,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Taxes': {
        name: 'Taxes',
        keywords: ['tax', 'taxes', 'taxation', 'tax planning', 'tax strategy', 'tax optimization', 'tax compliance'],
        relatedSubcategories: ['Tax Planning'],
        audienceOverlapCoefficients: {
          'Tax Planning': 0.95,
          'Investment': 0.60,
          'Real Estate': 0.50,
          'Banking': 0.40,
          'Private Equity & Hedge Funds': 0.45,
          'ESG Investing': 0.30
        },
        audienceCharacteristics: {
          ageRange: [25, 65],
          interests: ['tax', 'finance', 'planning', 'compliance', 'strategy'],
          behavior: {
            ticketPrice: 250,
            travelDistance: 300,
            socialMedia: ['linkedin', 'twitter'],
            eventFrequency: 1.8
          }
        }
      }
    }
  },
  'Arts & Culture': {
    defaultOverlap: 0.25,
    subcategories: {
      'Digital Art': {
        name: 'Digital Art',
        keywords: ['digital art', 'nft', 'digital gallery', 'virtual art', 'digital artist', 'crypto art', 'digital creativity'],
        relatedSubcategories: ['NFT Art'],
        audienceOverlapCoefficients: {
          'NFT Art': 0.85,
          'Photography': 0.60,
          'Museums & Galleries': 0.50,
          'Fashion': 0.40,
          'Dance': 0.20,
          'Cultural Heritage': 0.15
        },
        audienceCharacteristics: {
          ageRange: [18, 45],
          interests: ['digital art', 'technology', 'creativity', 'nft', 'innovation'],
          behavior: {
            ticketPrice: 100,
            travelDistance: 200,
            socialMedia: ['instagram', 'twitter', 'discord'],
            eventFrequency: 2.5
          }
        }
      },
      'Photography': {
        name: 'Photography',
        keywords: ['photography', 'photo', 'photographer', 'camera', 'photography workshop', 'photo exhibition', 'visual arts'],
        relatedSubcategories: ['Visual Arts'],
        audienceOverlapCoefficients: {
          'Visual Arts': 0.80,
          'Digital Art': 0.60,
          'Museums & Galleries': 0.70,
          'Fashion': 0.50,
          'Dance': 0.30,
          'Cultural Heritage': 0.40
        },
        audienceCharacteristics: {
          ageRange: [20, 55],
          interests: ['photography', 'visual arts', 'creativity', 'art', 'design'],
          behavior: {
            ticketPrice: 80,
            travelDistance: 150,
            socialMedia: ['instagram', 'facebook', 'pinterest'],
            eventFrequency: 2.0
          }
        }
      },
      'Museums & Galleries': {
        name: 'Museums & Galleries',
        keywords: ['museum', 'gallery', 'exhibition', 'art museum', 'cultural center', 'art gallery', 'cultural institution'],
        relatedSubcategories: ['Cultural Institutions'],
        audienceOverlapCoefficients: {
          'Cultural Institutions': 0.90,
          'Photography': 0.70,
          'Cultural Heritage': 0.80,
          'Digital Art': 0.50,
          'Fashion': 0.40,
          'Dance': 0.30
        },
        audienceCharacteristics: {
          ageRange: [25, 70],
          interests: ['art', 'culture', 'history', 'education', 'museums'],
          behavior: {
            ticketPrice: 60,
            travelDistance: 100,
            socialMedia: ['facebook', 'instagram', 'twitter'],
            eventFrequency: 1.5
          }
        }
      },
      'Fashion': {
        name: 'Fashion',
        keywords: ['fashion', 'fashion show', 'designer', 'fashion week', 'style', 'clothing', 'fashion design', 'runway'],
        relatedSubcategories: ['Fashion Design'],
        audienceOverlapCoefficients: {
          'Fashion Design': 0.90,
          'Photography': 0.50,
          'Digital Art': 0.40,
          'Dance': 0.60,
          'Museums & Galleries': 0.40,
          'Cultural Heritage': 0.30
        },
        audienceCharacteristics: {
          ageRange: [18, 50],
          interests: ['fashion', 'style', 'design', 'creativity', 'beauty'],
          behavior: {
            ticketPrice: 120,
            travelDistance: 300,
            socialMedia: ['instagram', 'tiktok', 'twitter'],
            eventFrequency: 2.8
          }
        }
      },
      'Dance': {
        name: 'Dance',
        keywords: ['dance', 'dancing', 'ballet', 'contemporary dance', 'hip hop dance', 'dance performance', 'choreography'],
        relatedSubcategories: ['Dance Performance'],
        audienceOverlapCoefficients: {
          'Dance Performance': 0.95,
          'Fashion': 0.60,
          'Photography': 0.30,
          'Museums & Galleries': 0.30,
          'Digital Art': 0.20,
          'Cultural Heritage': 0.40
        },
        audienceCharacteristics: {
          ageRange: [16, 45],
          interests: ['dance', 'performance', 'music', 'fitness', 'creativity'],
          behavior: {
            ticketPrice: 70,
            travelDistance: 200,
            socialMedia: ['instagram', 'tiktok', 'youtube'],
            eventFrequency: 2.2
          }
        }
      },
      'Cultural Heritage': {
        name: 'Cultural Heritage',
        keywords: ['cultural heritage', 'traditional', 'folklore', 'cultural preservation', 'heritage', 'tradition', 'cultural identity'],
        relatedSubcategories: ['Traditional Culture'],
        audienceOverlapCoefficients: {
          'Traditional Culture': 0.90,
          'Museums & Galleries': 0.80,
          'Photography': 0.40,
          'Dance': 0.40,
          'Fashion': 0.30,
          'Digital Art': 0.15
        },
        audienceCharacteristics: {
          ageRange: [30, 70],
          interests: ['culture', 'heritage', 'tradition', 'history', 'community'],
          behavior: {
            ticketPrice: 50,
            travelDistance: 100,
            socialMedia: ['facebook', 'instagram'],
            eventFrequency: 1.2
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
