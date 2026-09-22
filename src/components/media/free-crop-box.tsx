"use client";

import { useRef } from "react";
import { dragCropRect, type CropHandle, type CropRect } from "@/lib/free-crop";

// Position (en % du cadre) et curseur de chaque poignée.
const HANDLES: { handle: CropHandle; left: string; top: string; cursor: string }[] = [
  { handle: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { handle: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { handle: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { handle: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { handle: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { handle: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { handle: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { handle: "w", left: "0%", top: "50%", cursor: "ew-resize" },
];

const pct = (v: number) => `${v * 100}%`;

/**
 * Recadrage libre : on tire les bords ou les coins du cadre, ou on le déplace
 * en entier. Le damier de fond laisse voir la transparence d'un logo PNG.
 */
export function FreeCropBox({ src, rect, onChange }: { src: string; rect: CropRect; onChange: (rect: CropRect) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: CropHandle; x: number; y: number; start: CropRect } | null>(null);

  const startDrag = (handle: CropHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture : le glissement continue même si le pointeur sort du cadre.
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    onChange(dragCropRect(d.start, d.handle, (e.clientX - d.x) / box.width, (e.clientY - d.y) / box.height));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const frame = { left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) };

  return (
    <div className="flex justify-center rounded-lg bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-size-[16px_16px] p-3">
      <div
        ref={boxRef}
        className="relative touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className="block max-h-72 max-w-full" />
        {/* Voile hors du cadre, rogné aux limites de l'image. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute" style={{ ...frame, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
        </div>
        <div
          className="absolute cursor-move border-2 border-primary"
          style={frame}
          onPointerDown={startDrag("move")}
        >
          {HANDLES.map(({ handle, left, top, cursor }) => (
            <span
              key={handle}
              onPointerDown={startDrag(handle)}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-primary bg-white"
              style={{ left, top, cursor }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
