import { ImageResponse } from "next/og";

export const alt = "Oslavu case study: event date optimization SaaS";
export const size = {
  width: 1200,
  height: 627,
};
export const contentType = "image/png";

const colors = {
  background: "hsl(0, 0%, 100%)",
  muted: "hsl(240, 4.8%, 95.9%)",
  foreground: "hsl(240, 10%, 3.9%)",
  mutedForeground: "hsl(240, 3.8%, 46.1%)",
  border: "hsl(240, 5.9%, 90%)",
  card: "hsl(0, 0%, 100%)",
  primary: "hsl(222, 84%, 53%)",
};

async function loadInter(weight: 400 | 500 | 600): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-${weight}-normal.ttf`,
    { cache: "force-cache" }
  );

  if (!response.ok) {
    throw new Error(`Failed to load Inter ${weight}`);
  }

  return response.arrayBuffer();
}

export default async function OpenGraphImage() {
  const [interRegular, interMedium, interSemibold] = await Promise.all([
    loadInter(400),
    loadInter(500),
    loadInter(600),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(to bottom, ${colors.background}, ${colors.muted})`,
          padding: "48px",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: "64px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 3.2,
              textTransform: "uppercase",
              color: colors.mutedForeground,
            }}
          >
            Case study
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: -2,
                color: colors.foreground,
              }}
            >
              Oslavu
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.35,
                color: "hsla(240, 10%, 3.9%, 0.9)",
                maxWidth: 920,
              }}
            >
              An honest look at building an event-date conflict SaaS — and why it was shut down.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 500,
              color: colors.mutedForeground,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: colors.primary,
                  marginRight: 12,
                }}
              />
              oslavu.com
            </div>
            <div style={{ display: "flex" }}>Kamil Vitek</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: interMedium, weight: 500, style: "normal" },
        { name: "Inter", data: interSemibold, weight: 600, style: "normal" },
      ],
    }
  );
}
