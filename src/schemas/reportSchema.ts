import { z } from "zod";
import { format } from "date-fns";

export const reportSchema = z.object({
  reportDate: z.string().min(1, "Report date is required"),
  currentTask: z.string().min(1, "Current task is required").max(200),
  status: z.enum(["Not Started", "In Progress", "Blocked", "Completed", "On Hold"], {
    required_error: "Status is required",
  }),
  shortDescription: z.string().min(1, "Description is required").max(2000),
  managerLead: z.string().min(1, "Manager/Lead is required").max(100),
  blockerDependency: z.string().max(2000).default(""),
  idleReasonWorkNeeded: z.string().max(2000).default(""),
  expectedCompletion: z
    .string()
    .default("")
    .refine(
      (val) => !val || val >= format(new Date(), "yyyy-MM-dd"),
      { message: "Expected completion date must be today or a future date" }
    ),
  notes: z.string().max(2000).default(""),
});

export type ReportFormData = z.infer<typeof reportSchema>;
