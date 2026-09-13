import { EscrowEngine } from "./engine.js";

async function run() {
  const engine = new EscrowEngine();
  
  console.log("1. Constructing Grant...");
  await engine.constructDeterministicGrant("buyer_test", "worker_test", [
    {
      resource: { namespace: "files", path: ["Work"] },
      actions: ["search"],
      scope: "descendants"
    }
  ]);
  
  console.log("2. Executing Turn (this will generate real audit logs)...");
  const result = await engine.executeEscrowTurn("worker_test", "buyer_test");
  
  console.log("3. Turn completed:", result.status);
  
  console.log("Waiting 2 seconds for AuditSink batch flush...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log("Done.");
}

run().catch(console.error);
