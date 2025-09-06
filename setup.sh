#!/bin/bash

echo "🚀 Setting up Oslavu Event Date Conflict Analyzer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Setting up environment..."
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.local .env.local.example
    echo "⚠️  Please edit .env.local and add your API keys before running the app"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your API keys (Supabase, PostHog, etc.)"
echo "2. Set up your Supabase database:"
echo "   - Create a new project at supabase.com"
echo "   - Run 'npx supabase init' if you want local development"
echo "   - Apply migrations with 'npx supabase db push'"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Check README.md for detailed setup instructions"