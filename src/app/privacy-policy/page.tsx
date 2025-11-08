import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Cookie Usage</h2>
            <p className="text-gray-700">
              We use cookies and similar technologies to analyze how visitors use our website. 
              This helps us understand user behavior and improve our service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Analytics</h2>
            <p className="text-gray-700">
              We use Google Analytics 4 to collect anonymous usage data including:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
              <li>Pages visited</li>
              <li>Time spent on site</li>
              <li>Device and browser information</li>
              <li>Geographic location (country/city level)</li>
            </ul>
            <p className="text-gray-700 mt-2">
              No personally identifiable information is collected without your explicit consent.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Your Choices</h2>
            <p className="text-gray-700">
              You can decline cookies through our cookie banner. You can also change your 
              browser settings to block cookies, though this may affect site functionality.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-gray-700">
              For privacy questions, contact us at:{' '}
              <a 
                href="mailto:kamil@kamilvitek.cz" 
                className="text-primary hover:underline"
              >
                kamil@kamilvitek.cz
              </a>
            </p>
          </div>
        </section>

        <div className="mt-8 pt-6 border-t">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Oslavu
          </Link>
        </div>
      </div>
    </div>
  );
}

