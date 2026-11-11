import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const s = size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1130",
          color: "#f3b843",
          fontSize: s * 0.55,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { width: s, height: s },
  );
}
