import { AdvancedAnalysisTestComponent } from "@/components/test/advanced-analysis-test";

export default function TestAdvancedAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Advanced Analysis Test</h1>
          <p className="text-gray-600">
            Test the new AI-powered audience overlap prediction and venue intelligence features.
          </p>
        </div>
        
        <AdvancedAnalysisTestComponent />
      </div>
    </div>
  );
}
