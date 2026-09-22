import type { ProfileStation } from '../geo/types';
import { BORING_DEPTH_RULE_FT } from '../geotech/borings';
import { formatStation } from '../lib/format';

export interface BoringStick {
  stationFt: number;
  depthFt: number;
  name: string;
  groundElevFt?: number;
}

interface Props {
  stations: ProfileStation[];
  borings?: BoringStick[];
  showRuleLine?: boolean;
}

/**
 * Chainage-vs-elevation SVG profile: ground surface, tunnel invert (indigo),
 * the cover zone filled between ground and crown, boring sticks (amber), and
 * the +20 ft boring-depth rule as a dashed line at invert − 20 ft.
 */
export default function ProfileChart({ stations, borings = [], showRuleLine = false }: Props) {
  const W = 720;
  const H = 300;
  const PAD = { l: 52, r: 12, t: 12, b: 34 };

  const withGround = stations.filter((s) => s.groundElevFt !== undefined);
  if (stations.length < 2) return null;

  const xs = stations.map((s) => s.chainageFt);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const baseElevs = [
    ...withGround.map((s) => s.groundElevFt!),
    ...stations.map((s) => s.invertElevFt),
  ];
  const ruleElevs = showRuleLine ? stations.map((s) => s.invertElevFt - BORING_DEPTH_RULE_FT) : [];
  const topDefault = Math.max(...baseElevs);
  const boringTops = borings.map((b) => b.groundElevFt ?? topDefault);
  const boringBottoms = borings.map((b, i) => boringTops[i]! - b.depthFt);
  const elevs = [...baseElevs, ...ruleElevs, ...boringBottoms];
  let yMin = Math.min(...elevs);
  let yMax = Math.max(...elevs);
  if (yMax - yMin < 1) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.12;
  yMin -= yPad;
  yMax += yPad;

  const X = (c: number) =>
    PAD.l + ((c - xMin) / (xMax - xMin || 1)) * (W - PAD.l - PAD.r);
  const Y = (e: number) =>
    PAD.t + (1 - (e - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);

  const line = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const groundPts = withGround.map((s) => [X(s.chainageFt), Y(s.groundElevFt!)] as [number, number]);
  const invertPts = stations.map((s) => [X(s.chainageFt), Y(s.invertElevFt)] as [number, number]);
  // Cover zone: one closed polygon — forward along the ground, back along the crown.
  const coverPath =
    withGround.length > 1
      ? (() => {
          const fwd = withGround.map(
            (s) => `${X(s.chainageFt).toFixed(1)},${Y(s.groundElevFt!).toFixed(1)}`,
          );
          const back = [...withGround]
            .reverse()
            .map((s) => `${X(s.chainageFt).toFixed(1)},${Y(s.crownElevFt).toFixed(1)}`);
          return `M${fwd.join(' L')} L${back.join(' L')} Z`;
        })()
      : '';

  // X ticks: ~6 evenly spaced stations.
  const tickCount = Math.min(6, stations.length);
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    xMin + (i * (xMax - xMin)) / (tickCount - 1 || 1),
  );
  // Y ticks: 4.
  const yTicks = Array.from({ length: 4 }, (_, i) => yMin + (i * (yMax - yMin)) / 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tunnel profile chart">
      {yTicks.map((e) => (
        <g key={e}>
          <line x1={PAD.l} x2={W - PAD.r} y1={Y(e)} y2={Y(e)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={PAD.l - 6} y={Y(e) + 3} textAnchor="end" fontSize={10} fill="#6b7280" className="num">
            {e.toFixed(1)}
          </text>
        </g>
      ))}
      {coverPath && <path d={coverPath} fill="#4f46e5" opacity={0.12} />}
      {groundPts.length > 1 && (
        <path d={line(groundPts)} fill="none" stroke="#92400e" strokeWidth={2} />
      )}
      <path d={line(invertPts)} fill="none" stroke="#4f46e5" strokeWidth={2.5} />
      {showRuleLine && (
        <path
          d={line(stations.map((s) => [X(s.chainageFt), Y(s.invertElevFt - BORING_DEPTH_RULE_FT)] as [number, number]))}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      )}
      {borings.map((b, i) => (
        <g key={`${b.name}-${i}`}>
          <line
            x1={X(b.stationFt)}
            x2={X(b.stationFt)}
            y1={Y(boringTops[i]!)}
            y2={Y(boringBottoms[i]!)}
            stroke="#d97706"
            strokeWidth={3}
          />
          <text
            x={X(b.stationFt) + 4}
            y={Y(boringTops[i]!) + 3}
            fontSize={9}
            fill="#92400e"
          >
            {b.name}
          </text>
        </g>
      ))}
      {ticks.map((c) => (
        <text
          key={c}
          x={X(c)}
          y={H - 12}
          textAnchor="middle"
          fontSize={10}
          fill="#6b7280"
          className="num"
        >
          {formatStation(c)}
        </text>
      ))}
      <text x={PAD.l} y={H - 0} textAnchor="start" fontSize={10} fill="#6b7280">
        Station (ft)
      </text>
      <g transform={`translate(12, ${H / 2}) rotate(-90)`}>
        <text textAnchor="middle" fontSize={10} fill="#6b7280">
          Elevation (ft)
        </text>
      </g>
      <g transform={`translate(${W - PAD.r - 250}, ${PAD.t + 4})`}>
        <line x1={0} x2={18} y1={5} y2={5} stroke="#92400e" strokeWidth={2} />
        <text x={22} y={8} fontSize={10} fill="#374151">Ground</text>
        <line x1={76} x2={94} y1={5} y2={5} stroke="#4f46e5" strokeWidth={2.5} />
        <text x={98} y={8} fontSize={10} fill="#374151">Invert</text>
        {showRuleLine && (
          <>
            <line x1={138} x2={156} y1={5} y2={5} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={160} y={8} fontSize={10} fill="#374151">+20 ft rule</text>
          </>
        )}
        {borings.length > 0 && (
          <>
            <line x1={222} x2={222} y1={0} y2={10} stroke="#d97706" strokeWidth={3} />
            <text x={228} y={8} fontSize={10} fill="#374151">Borings</text>
          </>
        )}
      </g>
    </svg>
  );
}
