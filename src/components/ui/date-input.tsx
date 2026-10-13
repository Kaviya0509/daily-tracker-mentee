import * as React from "react"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onValueChange?: (value: string) => void
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    return (
      <div className="relative">
        <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="date"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          {...props}
        />
      </div>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
