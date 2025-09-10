import { OpenAIStatusComponent } from "@/components/test/openai-status";

export default function TestOpenAIPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">OpenAI Integration Test</h1>
          <p className="text-gray-600">
            Test and configure OpenAI API integration for AI-powered audience overlap prediction.
          </p>
        </div>
        
        <OpenAIStatusComponent />
      </div>
    </div>
  );
}
