import {
  SharedOSKernel,
  CapabilityAuthorizer,
  registerStandardOsTools,
  InMemoryGrantUsageStore,
  type AuditSink,
  type GrantSource,
  type ResourceProvider,
  type AuditEvent
} from "@aicoo/sharedos";
import { ledger } from "./ledger.js";
import dotenv from "dotenv";

dotenv.config({ path: '../../.env' });

export const grantSource: GrantSource = {
  async load(access) {
    try {
      return ledger.getGrants(access.namespaceId, access.actor, access.authority);
    } catch (e) {
      throw new Error("Authority store unavailable");
    }
  }
};

class BatchedAuditSink implements AuditSink {
  private queue: AuditEvent[] = [];
  private timeout: NodeJS.Timeout | null = null;

  async record(event: AuditEvent): Promise<void> {
    // Write to local audit trail
    console.log(`[Audit] ${event.type} - ID: ${event.id}`);
    ledger.addAuditLog(event);
    
    // Queue for batch
    this.queue.push(event);
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), 1000);
    }
  }

  private async flush() {
    this.timeout = null;
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      await fetch("https://www.sharedos.ai/v1/audit/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${process.env.SHAREDOS_KEY}`
        },
        body: JSON.stringify({ events })
      });
    } catch (err) {
      // Fail quietly
      console.error("[Audit] Failed to flush events to SharedOS", err);
    }
  }
}

export const auditSink = new BatchedAuditSink();

export const filesProvider: ResourceProvider = {
  namespace: "files",
  async invoke(operation, signal) {
    signal.throwIfAborted();
    // Mock implementation
    return {
      operationId: operation.operationId,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      output: { message: `Mock file operation ${operation.action} on ${operation.resource.path.join("/")}` }
    };
  }
};

export const kernel = new SharedOSKernel({
  grantSource,
  authorizer: new CapabilityAuthorizer({ usageStore: new InMemoryGrantUsageStore() }),
  audit: auditSink
});

kernel.registerResourceProvider(filesProvider);
registerStandardOsTools(kernel, { files: filesProvider });
