import React from 'react';
import { cn } from '@/lib/utils';

export interface LineChartPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  valueLabel?: string;
  className?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  valueLabel = 'kg',
  className,
  height = 160,
}) => {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground',
          className
        )}
        style={{ height }}
      >
        —
      </div>
    );
  }

  const width = 320;
  const padding = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padding.top + innerH - ((d.value - min) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-hidden>
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + innerH * (1 - ratio);
          const val = (min + range * ratio).toFixed(1);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text
                x={padding.left - 4}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {val}
              </text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" />
        ))}
        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || points.length <= 4 ? (
            <text
              key={`label-${p.date}`}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {p.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>
      {valueLabel && (
        <p className="mt-1 text-center text-xs text-muted-foreground">{valueLabel}</p>
      )}
    </div>
  );
};
