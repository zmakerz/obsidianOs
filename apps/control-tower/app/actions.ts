"use server";

import { revalidatePath } from "next/cache";
import { reviewApproval } from "@/lib/dashboard";

export async function reviewApprovalAction(formData: FormData): Promise<void> {
  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!approvalId || (decision !== "approved" && decision !== "rejected")) {
    throw new Error("Invalid approval review request");
  }
  await reviewApproval({ approvalId, decision });
  revalidatePath("/operations");
}
