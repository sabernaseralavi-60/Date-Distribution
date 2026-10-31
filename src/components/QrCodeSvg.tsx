import React from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  title?: string;
}

/**
 * Generates a deterministic, scannable-style matrix SVG representation for product QR URLs
 * and official document verification codes without external network calls.
 */
export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size = 112, title }) => {
  const gridSize = 21;
  const cells: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // Deterministic hash fill from value string
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft || r === 6 || c === 6) {
        continue;
      }
      const mix = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
      const charCode = value.charCodeAt((r * gridSize + c) % Math.max(1, value.length)) || 7;
      cells[r][c] = ((mix + charCode) & 3) === 0 || ((mix ^ charCode) & 5) === 1;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize + 2} ${gridSize + 2}`}
      className="bg-white p-1 border border-stone-300 rounded"
      role="img"
      aria-label={title || `QR Code: ${value}`}
    >
      <rect width={gridSize + 2} height={gridSize + 2} fill="#ffffff" />
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + 1}
              y={rIdx + 1}
              width={1}
              height={1}
              fill="#1c1917"
            />
          ) : null
        )
      )}
    </svg>
  );
};
