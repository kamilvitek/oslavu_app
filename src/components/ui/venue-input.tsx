"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Lightbulb,
  MapPin
} from "lucide-react";
import { venueValidationService, VenueValidationResult } from "@/lib/services/venue-validation";

interface VenueInputProps {
  value: string;
  onChange: (value: string) => void;
  city: string;
  placeholder?: string;
  className?: string;
}

export function VenueInput({ 
  value, 
  onChange, 
  city, 
  placeholder = "e.g., Prague Conference Center, Hotel InterContinental",
  className = ""
}: VenueInputProps) {
  const [validation, setValidation] = useState<VenueValidationResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Validate venue when value or city changes
  useEffect(() => {
    if (value && city) {
      setIsValidating(true);
      // Debounce validation
      const timeoutId = setTimeout(() => {
        const result = venueValidationService.validateVenue(value, city);
        setValidation(result);
        setIsValidating(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setValidation(null);
    }
  }, [value, city]);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />;
    }
    
    if (!validation) return null;
    
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (validation.suggestions.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getValidationColor = () => {
    if (!validation) return "border-gray-300";
    
    if (validation.isValid) {
      return "border-green-300 focus:border-green-500";
    } else if (validation.suggestions.length > 0) {
      return "border-yellow-300 focus:border-yellow-500";
    } else {
      return "border-red-300 focus:border-red-500";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="venue" className="flex items-center space-x-2">
        <Building className="h-4 w-4" />
        <span>Venue (optional)</span>
        {getValidationIcon()}
      </Label>
      
      <div className="relative">
        <Input
          id="venue"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={`${getValidationColor()} ${isValidating ? 'opacity-70' : ''}`}
        />
        
        {/* Suggestions Dropdown */}
        {showSuggestions && validation?.suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 text-xs text-gray-500 border-b">
              <Lightbulb className="h-3 w-3 inline mr-1" />
              Did you mean one of these venues?
            </div>
            {validation.suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.name)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="text-sm">{suggestion.name}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(suggestion.confidence * 100)}%
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {validation && (
        <div className="space-y-1">
          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-700">
                {validation.warnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {validation.suggestions.length > 0 && !validation.isValid && (
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-3 w-3 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <div className="font-medium mb-1">Suggestions:</div>
                {validation.suggestions.slice(0, 2).map((suggestion, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSuggestionClick(suggestion.name)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {suggestion.name}
                    </button>
                    <span className="text-gray-500">({suggestion.reason})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {validation.isValid && validation.normalizedName && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-700">
                ✓ Venue recognized: {validation.normalizedName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Popular Venues */}
      {!value && city && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">Popular venues in {city}:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {venueValidationService.getPopularVenues(city).slice(0, 5).map((venue, index) => (
              <button
                key={index}
                onClick={() => onChange(venue)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
              >
                {venue}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
