'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
    value?: number[];
    defaultValue?: number[];
    min?: number;
    max?: number;
    step?: number;
    onValueChange?: (value: number[]) => void;
    className?: string;
    disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
    ({ value, defaultValue, min = 0, max = 100, step = 1, onValueChange, className, disabled }, ref) => {
        const [internalValue, setInternalValue] = React.useState(defaultValue || [50]);
        const currentValue = value !== undefined ? value : internalValue;

        const percentage = ((currentValue[0] - min) / (max - min)) * 100;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = [parseFloat(e.target.value)];
            if (value === undefined) {
                setInternalValue(newValue);
            }
            onValueChange?.(newValue);
        };

        return (
            <div ref={ref} className={cn('relative flex w-full touch-none select-none items-center', className)}>
                <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                        className="absolute h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue[0]}
                    onChange={handleChange}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div
                    className="absolute h-5 w-5 rounded-full border-2 border-primary bg-white shadow-md transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    style={{
                        left: `calc(${percentage}% - 10px)`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                    }}
                />
            </div>
        );
    }
);
Slider.displayName = 'Slider';

export { Slider };
