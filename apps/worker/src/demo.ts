import { createApproval, transitionApproval } from "../../../packages/kernel/src/approval.ts";
import { advanceOperatingLoop, createOperatingLoop } from "../../../packages/kernel/src/operating-loop.ts";
import { geoAeoOperatingLoop } from "../../../packs/marketing/src/geo-aeo.ts";

let run = createOperatingLoop({ id: "demo-loop", workspaceId: "demo-workspace", name: geoAeoOperatingLoop.name });
run = advanceOperatingLoop(run);
run = advanceOperatingLoop(run);
run = advanceOperatingLoop(run);

let approval = createApproval({ id: "demo-approval", workspaceId: "demo-workspace", actionType: "content_publish", summary: "Publish one approved improvement", actorId: "system" });
approval = transitionApproval(approval, "preview", "system");
approval = transitionApproval(approval, "approved", "demo-human");
run = advanceOperatingLoop(run, { approvalStatus: approval.status });

console.log(JSON.stringify({ loop: run.name, phase: run.phase, cycle: run.cycle, approval: approval.status, next: geoAeoOperatingLoop.phases.execute }, null, 2));
