import React from 'react';
import { cn } from '@/lib/utils';

type RatingScaleProps = {
  id?: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export const RatingScale: React.FC<RatingScaleProps> = ({
  id,
  min = 1,
  max = 10,
  value,
  onChange,
  className,
}) => {
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between px-0.5 text-[10px] text-muted-foreground sm:text-xs">
        {ticks.map((n) => (
          <span
            key={n}
            className={cn('w-4 text-center tabular-nums', value === n && 'font-semibold text-primary')}
          >
            {n}
          </span>
        ))}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        className="w-full"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="text-sm font-medium tabular-nums">
        {value}/{max}
      </p>
    </div>
  );
};
