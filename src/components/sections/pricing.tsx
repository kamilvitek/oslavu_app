"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Star, 
  Users, 
  Building2
} from "lucide-react";
import { useState } from "react";

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      price: isAnnual ? "$63" : "$79",
      period: "month",
      description: "Perfect for small to mid-size conference organizers or agencies",
      features: [
        "Up to 25 analyses/year",
        "Basic conflict detection",
        "Email support",
      ],
      cta: "Contact the founder",
      popular: false,
      icon: Users,
      color: "chart-info"
    },
    {
      name: "Pro",
      price: isAnnual ? "$159" : "$199", 
      period: "month",
      description: "Ideal for corporate event managers and agencies running multiple events",
      features: [
        "Up to 100 analyses/year",
        "Branded reports (PDF export)",
        "Audience overlap analysis",
        "Priority support",
        "Advanced analytics",
        "Personal contact with the founder"
      ],
      cta: "Contact the founder",
      popular: true,
      icon: Star,
      color: "chart-primary"
    },
    {
      name: "Agency/Enterprise",
      price: isAnnual ? "$239" : "$299",
      period: "month", 
      description: "For big agencies, EMS platforms, and associations",
      features: [
        "Unlimited analyses",
        "White-label reports",
        "API access",
        "Custom integrations",
        "Dedicated support",
        "Custom data sources",
        "Personal contact with the founder"
      ],
      cta: "Contact the founder",
      popular: false,
      icon: Building2,
      color: "chart-success"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Just Three Pricing Options, Pick One
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start optimizing your event dates today with our flexible pricing options
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-chart-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Annual
              </span>
            </div>
            <div className="ml-4 w-20 h-6 flex items-center justify-center">
              <Badge 
                variant="secondary" 
                className={`bg-chart-success/10 text-chart-success border-chart-success/20 transition-opacity duration-200 whitespace-nowrap ${
                  isAnnual ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Save 20%
              </Badge>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const isPro = plan.popular;
            
            return (
              <Card 
                key={plan.name}
                className={`relative ${
                  isPro 
                    ? 'ring-2 ring-chart-primary shadow-xl border-chart-primary/20 bg-gradient-to-br from-chart-primary/5 to-chart-secondary/5' 
                    : ''
                }`}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-chart-primary text-white px-4 py-1 text-sm font-medium">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-${plan.color}/10 flex items-center justify-center`}>
                    <IconComponent className={`w-8 h-8 text-${plan.color}`} />
                  </div>
                  
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">/{plan.period}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Features List */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-chart-success mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button 
                    className={`w-full ${
                      isPro 
                        ? 'bg-chart-primary hover:bg-chart-primary/90 text-white shadow-lg' 
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                    size="lg"
                    asChild
                  >
                    <a href="mailto:kamil@kamilvitek.cz">
                      {plan.cta}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>


      </div>
    </section>
  );
}
