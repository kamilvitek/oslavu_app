import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import { ConflictAnalyzer } from "@/components/sections/conflict-analyzer";
import { Features } from "@/components/sections/features";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ConflictAnalyzer />
        <Features />
      </main>
      <Footer />
    </div>
  );
}