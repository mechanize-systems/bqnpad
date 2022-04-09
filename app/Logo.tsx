import * as React from "react";

export type LogoProps = {
  size?: number;
};

export function Logo({ size = 36 }: LogoProps) {
  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="-7 -7 14 14" xmlns="http://www.w3.org/2000/svg">
        <clipPath id="c">
          <rect x="-7" y="-6" width="14" height="12" />
        </clipPath>
        <path
          strokeWidth="1"
          stroke="#2b7067"
          fill="none"
          clipPath="url(#c)"
          d="M-5.7 5.8V-5.7L-3 -3A4.243 4.243 0 0 0 1.624 3.92
    M5.7 -5.8V5.7L3 3A4.243 4.243 0 0 0 -1.624 -3.92
    M1.2 0H-2V-2H2V-0.8L1.2 0L2 0.8V2H-2V0"
        />
      </svg>
    </div>
  );
}
