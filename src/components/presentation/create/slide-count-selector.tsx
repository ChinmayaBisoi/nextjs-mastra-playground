"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SlideCountSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const SLIDE_OPTIONS = [4, 6, 8, 10, 12, 14, 16];

export function SlideCountSelector({
  value,
  onChange,
}: SlideCountSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="slide-count">Number of Slides</Label>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseInt(val, 10))}
      >
        <SelectTrigger id="slide-count" className="w-full">
          <SelectValue placeholder="Select number of slides" />
        </SelectTrigger>
        <SelectContent>
          {SLIDE_OPTIONS.map((count) => (
            <SelectItem key={count} value={count.toString()}>
              {count} slides
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

