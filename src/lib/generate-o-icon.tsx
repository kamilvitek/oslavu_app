import { ImageResponse } from "next/og";

const GRADIENT_START = "hsl(222, 84%, 53%)";
const GRADIENT_END = "hsl(262, 83%, 58%)";

async function loadInterBold(): Promise<ArrayBuffer> {
  const response = await fetch(
    "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-700-normal.ttf",
    { cache: "force-cache" }
  );

  if (!response.ok) {
    throw new Error("Failed to load Inter Bold");
  }

  return response.arrayBuffer();
}

export async function generateOIcon(size: number): Promise<ImageResponse> {
  const interBold = await loadInterBold();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.86),
            fontWeight: 700,
            fontFamily: "Inter",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            backgroundImage: `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          O
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Inter",
          data: interBold,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
