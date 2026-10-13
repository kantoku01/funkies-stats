import { ImageResponse } from "next/og";

// ホーム画面用アイコン: 紺地に白の「F」と、ボールの縫い目をイメージした赤い線
export function iconImage(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e3a8a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: "50%",
            border: `${Math.max(2, size * 0.035)}px solid #ffffff33`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: size * 0.13,
            top: size * 0.2,
            width: size * 0.2,
            height: size * 0.6,
            borderRadius: "50%",
            borderRight: `${Math.max(2, size * 0.03)}px dashed #ef4444`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: size * 0.13,
            top: size * 0.2,
            width: size * 0.2,
            height: size * 0.6,
            borderRadius: "50%",
            borderLeft: `${Math.max(2, size * 0.03)}px dashed #ef4444`,
          }}
        />
        <div style={{ color: "white", fontSize: size * 0.56, fontWeight: 800, lineHeight: 1 }}>F</div>
      </div>
    ),
    { width: size, height: size },
  );
}
