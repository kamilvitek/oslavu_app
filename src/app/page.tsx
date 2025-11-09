import { Hero } from "@/components/sections/hero";
import { ConflictAnalyzer } from "@/components/sections/conflict-analyzer";
import { Features } from "@/components/sections/features";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <Hero />
        <ConflictAnalyzer />
        <Features />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}