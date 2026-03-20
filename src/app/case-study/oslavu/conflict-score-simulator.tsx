"use client";

import { useMemo, useState } from "react";

interface ScoreResult {
  score: number;
  label: "Low conflict" | "Medium conflict" | "High conflict";
  reasons: string[];
}

const categoryWeights: Record<string, number> = {
  technology: 22,
  business: 18,
  marketing: 16,
  culture: 10,
};

const audienceBands = [
  { limit: 120, points: 6, reason: "Small event size lowers overlap risk." },
  { limit: 350, points: 12, reason: "Mid-size audience creates moderate overlap risk." },
  { limit: Infinity, points: 20, reason: "Larger audience increases overlap with competing events." },
];

function calculateScore({
  category,
  attendees,
  nearbyCompetitor,
  venuePressure,
  weekendDate,
}: {
  category: string;
  attendees: number;
  nearbyCompetitor: boolean;
  venuePressure: boolean;
  weekendDate: boolean;
}): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const categoryPoints = categoryWeights[category] ?? 12;
  score += categoryPoints;
  reasons.push(`Category pressure contributes ${categoryPoints} points.`);

  const audienceRule = audienceBands.find((band) => attendees <= band.limit) ?? audienceBands[2];
  score += audienceRule.points;
  reasons.push(audienceRule.reason);

  if (nearbyCompetitor) {
    score += 26;
    reasons.push("A competitor event in a similar audience window adds 26 points.");
  } else {
    reasons.push("No direct nearby competitor lowers risk.");
  }

  if (venuePressure) {
    score += 20;
    reasons.push("Venue availability pressure adds 20 points.");
  } else {
    reasons.push("Lower venue pressure keeps options open.");
  }

  if (weekendDate) {
    score += 8;
    reasons.push("Weekend demand slightly increases collision probability.");
  } else {
    reasons.push("Weekday date usually has fewer direct conflicts.");
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) {
    return { score, label: "High conflict", reasons };
  }
  if (score >= 40) {
    return { score, label: "Medium conflict", reasons };
  }
  return { score, label: "Low conflict", reasons };
}

function isWeekend(value: string): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function ConflictScoreSimulator() {
  const [city, setCity] = useState("Brno");
  const [category, setCategory] = useState("technology");
  const [attendees, setAttendees] = useState(250);
  const [candidateDate, setCandidateDate] = useState("2026-05-14");
  const [nearbyCompetitor, setNearbyCompetitor] = useState(true);
  const [venuePressure, setVenuePressure] = useState(false);

  const result = useMemo(
    () =>
      calculateScore({
        category,
        attendees,
        nearbyCompetitor,
        venuePressure,
        weekendDate: isWeekend(candidateDate),
      }),
    [category, attendees, nearbyCompetitor, venuePressure, candidateDate],
  );

  const riskClass =
    result.label === "High conflict"
      ? "text-red-700 bg-red-50 border-red-200"
      : result.label === "Medium conflict"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-emerald-700 bg-emerald-50 border-emerald-200";

  return (
    <section id="demo" className="border border-border rounded-2xl p-6 md:p-8 bg-card">
      <h3 className="text-2xl font-semibold mb-2">Interactive demo: conflict score simulator</h3>
      <p className="text-muted-foreground mb-6">
        This is a simplified mock of the original logic. It shows how different inputs changed conflict risk, not a
        full production prediction.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-2">
              City
            </label>
            <input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Event category
            </label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="technology">Technology</option>
              <option value="business">Business</option>
              <option value="marketing">Marketing</option>
              <option value="culture">Culture</option>
            </select>
          </div>

          <div>
            <label htmlFor="attendees" className="block text-sm font-medium mb-2">
              Expected attendees
            </label>
            <input
              id="attendees"
              type="number"
              min={20}
              max={3000}
              value={attendees}
              onChange={(event) => setAttendees(Number(event.target.value) || 0)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Candidate date
            </label>
            <input
              id="date"
              type="date"
              value={candidateDate}
              onChange={(event) => setCandidateDate(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={nearbyCompetitor}
                onChange={(event) => setNearbyCompetitor(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>Similar competitor event nearby (in date and audience)</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={venuePressure}
                onChange={(event) => setVenuePressure(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>High venue occupancy pressure in the same week</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-background">
          <p className="text-sm text-muted-foreground mb-2">Current output for {city || "selected city"}</p>
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium mb-4 ${riskClass}`}>
            {result.label}
          </div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Conflict score</p>
            <p className="text-4xl font-bold tracking-tight">{result.score}/100</p>
          </div>

          <h4 className="font-medium mb-2">Reason breakdown</h4>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
