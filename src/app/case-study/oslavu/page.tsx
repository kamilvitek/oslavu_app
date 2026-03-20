import type { Metadata } from "next";
import Link from "next/link";
import { ConflictScoreSimulator } from "./conflict-score-simulator";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Oslavu Case Study",
  description:
    "An honest case study of Oslavu: hypothesis, MVP execution, customer discovery, pivot attempt, and why it was shut down.",
};

interface SectionProps {
  title: string;
  id: string;
  children: React.ReactNode;
}

function Section({ title, id, children }: SectionProps) {
  return (
    <section id={id} className="rounded-2xl border border-border/80 bg-card/40 px-6 md:px-8 py-10 md:py-12">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-5">{title}</h2>
      <div className="space-y-4 text-base leading-7 text-foreground/90">{children}</div>
    </section>
  );
}

export default function OslavuCaseStudyPage() {
  const navItems = [
    { href: "#initial-hypothesis", label: "Hypothesis" },
    { href: "#approach", label: "Approach" },
    { href: "#solution", label: "Solution" },
    { href: "#traction", label: "Traction" },
    { href: "#core-problem-discovery", label: "Discovery" },
    { href: "#pivot-attempt", label: "Pivot" },
    { href: "#why-it-failed", label: "Failure" },
    { href: "#technical-stack-process", label: "Stack" },
    { href: "#demo-section", label: "Demo" },
    { href: "#about-me", label: "About" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 pt-32 pb-16 max-w-5xl">
        <header id="hero" className="py-10 md:py-14 border-t border-border">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Case study</p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-tight tracking-tight mb-6 max-w-4xl">
            Oslavu was a SaaS project that helped event organizers choose better dates by analyzing conflict risk
            between events, venues, and audience overlap.
          </h1>
          <p className="text-lg md:text-xl font-medium max-w-3xl">
            Outcome: the project worked at MVP level, but it did not reach a viable business model.
          </p>
        </header>

        <nav className="mb-8 lg:hidden sticky top-0 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-y border-border">
          <ul className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
          <aside className="hidden lg:block sticky top-28 self-start">
            <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-sm p-3">
              <p className="px-3 pt-2 pb-3 text-xs uppercase tracking-wide text-muted-foreground">On this page</p>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border px-2 pb-1">
                <Button asChild variant="default" size="sm" className="w-full">
                  <Link href="/">MVP Preview</Link>
                </Button>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
        <Section id="initial-hypothesis" title="1) Initial hypothesis">
          <p>
            I believed event organizers had a painful and expensive decision problem: choosing the wrong date could
            reduce attendance, sponsorship value, and event ROI.
          </p>
          <p>
            I thought this mattered because many organizers still made date decisions manually, using Google searches,
            spreadsheets, and assumptions about competitor activity.
          </p>
          <p>
            My original vision was a practical tool that would turn this into a structured decision: input event
            parameters, get a conflict score, and compare options with clear reasoning.
          </p>
        </Section>

        <Section id="approach" title="2) Approach">
          <p>
            I started by building an MVP in Cursor (vibe-coded) and treated the product as a learning-plus-validation
            process, not a polished launch.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Most of my time went into learning tools and shipping quickly with AI-assisted development.</li>
            <li>I contacted event agencies across Czechia through personalized outreach emails.</li>
            <li>I had several meetings with agencies and used those conversations as primary product input.</li>
            <li>I iterated the MVP repeatedly based on feedback: added features, adjusted options, refined outputs.</li>
          </ul>
          <p>
            This phase was less about growth and more about compressing the loop between assumptions, feedback, and
            product changes.
          </p>
        </Section>

        <Section id="solution" title="3) Solution">
          <p>The product combined event data and scoring logic to estimate scheduling risk for candidate dates.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Conflict scoring:</strong> each date received a risk score based on known nearby events and
              expected audience collision.
            </li>
            <li>
              <strong>Overlap logic:</strong> the model considered event category similarity, expected attendance
              overlap, and timing proximity.
            </li>
            <li>
              <strong>Data usage:</strong> I aggregated event data from APIs and scraping, then normalized it into
              comparable records.
            </li>
          </ul>
          <p>
            The goal was not perfect prediction. The goal was better decisions with explicit trade-offs and fewer blind
            spots.
          </p>
        </Section>

        <Section id="traction" title="4) Traction">
          <p>
            Most agencies I spoke with reacted positively. An important result was segmentation clarity: I learned which
            agency profiles had enough planning complexity to care, and which did not.
          </p>
          <p>
            On the product side, the MVP was functional and delivered practical value in discussions. Users could
            understand the logic and use it to evaluate date options faster than manual research.
          </p>
        </Section>

        <Section id="core-problem-discovery" title="5) Core problem discovery">
          <p>
            The biggest insight came from willingness-to-pay conversations. Traditional LLM tools such as ChatGPT and
            Perplexity could replace meaningful parts of my original value proposition.
          </p>
          <p>
            That created a hard monetization problem: if users can approximate the answer with general AI tools, they
            need a stronger reason to pay for a dedicated product.
          </p>
          <p className="font-medium">
            The real painful problem was different: manual communication with venues (calls, availability checks,
            pricing confirmation) consumed major planning time.
          </p>
        </Section>

        <Section id="pivot-attempt" title="6) Pivot attempt">
          <p>
            Based on that discovery, I shifted direction from date recommendation only to date + available venue
            recommendation.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Geographic focus: Brno, where local network effects were strongest.</li>
            <li>Distribution strategy: partner directly with venues and integrate real availability data.</li>
            <li>Intended edge: solve workflow friction (coordination time), not only informational uncertainty.</li>
          </ul>
        </Section>

        <Section id="why-it-failed" title="7) Why it failed">
          <ul className="list-disc pl-5 space-y-2">
            <li>I secured only a limited number of venue partnerships.</li>
            <li>Partnership growth was slower than required for a scalable supply side.</li>
            <li>Fixed costs rose while revenue did not reach sustainable levels.</li>
            <li>I ran out of capital before proving a repeatable model.</li>
            <li>I was also searching for a technical co-founder and did not find the right fit in time.</li>
          </ul>
          <p>
            In short: the product quality improved, but the business-side constraints moved faster than my ability to
            de-risk them.
          </p>
        </Section>

        <Section id="technical-stack-process" title="8) Technical stack and process">
          <p>
            I built Oslavu with a modern web stack and AI-assisted workflow, optimized for fast iteration and practical
            experiments.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Next.js + TypeScript + Tailwind:</strong> fast UI iteration, strong structure, and clear
              maintainability.
            </li>
            <li>
              <strong>Supabase (PostgreSQL + pgvector):</strong> relational storage for event entities plus vector
              similarity for deduplication and semantic matching.
            </li>
            <li>
              <strong>OpenAI:</strong> used for extraction, normalization, and overlap reasoning where strict rules were
              insufficient.
            </li>
            <li>
              <strong>Firecrawl + external APIs:</strong> combined scraping and API ingestion to increase event data
              coverage.
            </li>
            <li>
              <strong>Architecture decisions:</strong> API-route based service layer, explicit error handling, and
              modular conflict-analysis services to support rapid iterations.
            </li>
          </ul>
          <p>
            For non-technical readers: this stack let me test business assumptions quickly without building heavy
            infrastructure first.
          </p>
        </Section>

        <Section id="demo-section" title="9) Demo">
          <ConflictScoreSimulator />
        </Section>

        <Section id="what-worked-what-didnt" title="10) What worked and what didn’t">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border p-5 bg-card">
              <h3 className="font-semibold mb-3">What worked</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Fast build loop with AI-assisted development.</li>
                <li>Direct customer conversations produced actionable insight.</li>
                <li>MVP outputs were understandable and useful in real planning discussions.</li>
                <li>Segmentation became clearer through outreach and meetings.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 bg-card">
              <h3 className="font-semibold mb-3">What didn’t</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Original value proposition was too exposed to general-purpose LLM substitution.</li>
                <li>Venue partnership supply side grew too slowly.</li>
                <li>Runway and fixed costs created pressure before model validation.</li>
                <li>I did not secure a technical co-founder during a critical phase.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="about-me" title="11) About me">
          <p>
            I am currently a student at a business academy in the Czech Republic while building projects alongside my
            studies.
          </p>
          <p>
            My core work is creating websites where strategy, design, and development are aligned to help people present
            themselves clearly and build trust.
          </p>
          <p>
            Long-term, I want to build globally successful startups. I see myself primarily as a builder focused on
            process, learning speed, and real impact.
          </p>
          <p>
            If you are interested in how I think or what I am building, connect with me on{" "}
            <Link
              href="https://www.linkedin.com/in/kamil-vitek/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-primary"
            >
              LinkedIn
            </Link>
            .
          </p>
        </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
