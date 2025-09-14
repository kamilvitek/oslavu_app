import React from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  className?: string;
  showLabels?: boolean;
  variant?: 'horizontal' | 'vertical';
}

const statusIcons = {
  pending: Circle,
  'in-progress': Loader2,
  completed: CheckCircle,
  error: Circle
};

const statusClasses = {
  pending: 'text-muted-foreground border-muted-foreground',
  'in-progress': 'text-chart-info border-chart-info animate-spin',
  completed: 'text-chart-success border-chart-success bg-chart-success text-white',
  error: 'text-chart-error border-chart-error'
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  className,
  showLabels = true,
  variant = 'horizontal'
}) => {
  const getStepIndex = (stepId: string): number => {
    return steps.findIndex(step => step.id === stepId);
  };

  const currentStepIndex = currentStep ? getStepIndex(currentStep) : -1;

  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-4", className)}>
        {steps.map((step, index) => {
          const Icon = statusIcons[step.status];
          const isActive = step.id === currentStep;
          const isCompleted = step.status === 'completed';
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              <div className="flex items-start space-x-3">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                  statusClasses[step.status],
                  isActive && "ring-2 ring-primary/20"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                {showLabels && (
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {!isLast && (
                <div className={cn(
                  "absolute left-4 top-8 w-0.5 h-4 -translate-x-0.5",
                  isCompleted ? "bg-chart-success" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      {steps.map((step, index) => {
        const Icon = statusIcons[step.status];
        const isActive = step.id === currentStep;
        const isCompleted = step.status === 'completed';
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center space-y-2">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                statusClasses[step.status],
                isActive && "ring-2 ring-primary/20"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              
              {showLabels && (
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-20">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {!isLast && (
              <div className={cn(
                "flex-1 h-0.5 min-w-8",
                isCompleted ? "bg-chart-success" : "bg-border"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
