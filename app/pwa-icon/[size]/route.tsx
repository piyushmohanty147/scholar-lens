import { ImageResponse } from "next/og";

export const runtime = "edge";

// The app icon: the Scholar Lens mark (lens ring and handle) in deep pink on glossy black.
// The mark stays inside the central 60% so Android's rounded "maskable" crop never cuts it.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const s = size === "512" ? 512 : 192;
  const mark = Math.round(s * 0.6);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #1d1218 0%, #070406 70%)",
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 26 26">
          <circle cx="11" cy="11" r="7.5" fill="none" stroke="#ff4fa3" strokeWidth="2.6" />
          <line x1="16.6" y1="16.6" x2="23" y2="23" stroke="#ff4fa3" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: s, height: s },
  );
}
