const nodes = [
  { x: 40, y: 60 }, { x: 160, y: 30 }, { x: 300, y: 70 }, { x: 430, y: 40 },
  { x: 560, y: 90 }, { x: 90, y: 170 }, { x: 240, y: 150 }, { x: 380, y: 190 },
  { x: 520, y: 160 }, { x: 630, y: 210 }, { x: 30, y: 260 }, { x: 190, y: 270 },
  { x: 340, y: 250 }, { x: 470, y: 280 }, { x: 600, y: 300 },
];

const links: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 8],
  [4, 8], [4, 9], [5, 6], [6, 7], [7, 8], [8, 9], [5, 10], [5, 11], [6, 11],
  [7, 11], [7, 12], [8, 12], [8, 13], [9, 13], [9, 14], [10, 11], [11, 12],
  [12, 13], [13, 14],
];

/**
 * Ambient network/security-mesh motif for the hero: nodes + connecting lines
 * in two brand tones, with a slow node pulse — a literal nod to "network
 * security" that stays subtle enough not to compete with the headline.
 */
export function SecurityNet({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 660 320"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="#2563eb" strokeOpacity="0.14" strokeWidth="1">
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
      </g>
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i % 3 === 0 ? 3 : 2.5}
          fill={i % 2 === 0 ? "#2563eb" : "#60a5fa"}
          className="animate-net-pulse"
          style={{ animationDelay: `${(i % 7) * 300}ms`, transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
    </svg>
  );
}
