import { ConflictAnalyzer } from "@/components/sections/conflict-analyzer";
import { FAQ } from "@/components/sections/faq";
import { Features } from "@/components/sections/features";
import { Hero } from "@/components/sections/hero";
import { Pricing } from "@/components/sections/pricing";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      {/* Anchor for header/footer "About" — scrolls to the interactive analyzer */}
      <div id="about" className="scroll-mt-28">
        <ConflictAnalyzer />
      </div>
      <Pricing />
      <FAQ />
      <Footer />
    </>
  );
}
