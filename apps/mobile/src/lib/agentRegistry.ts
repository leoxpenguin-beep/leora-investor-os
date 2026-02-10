// Module 19 — Agent Router + Agent Registry (foundation)
//
// Guardrails:
// - Snapshot-scoped only
// - Read-only
// - If agent is disabled: return EXACT "Not available in this snapshot."

export type AgentId = "vision" | "quant" | "strategist" | "auditor";

export type AgentDefinition = {
  id: AgentId;
  title: string;
  shortDescription: string;
  enabled: boolean;
};

export const NOT_AVAILABLE_IN_SNAPSHOT = "Not available in this snapshot." as const;

export const AGENTS: AgentDefinition[] = [
  {
    id: "vision",
    title: "Vision",
    shortDescription: "Snapshot-scoped narrative responses with citations.",
    enabled: true,
  },
  {
    id: "quant",
    title: "Quant",
    shortDescription: "Locked. No derived metrics or calculations are permitted.",
    enabled: false,
  },
  {
    id: "strategist",
    title: "Strategist",
    shortDescription: "Locked. No advice or predictions.",
    enabled: false,
  },
  {
    id: "auditor",
    title: "Auditor",
    shortDescription: "Locked. Guardrails and evidence-only mode.",
    enabled: false,
  },
];

export function getAgentById(agentId: AgentId): AgentDefinition {
  const found = AGENTS.find((a) => a.id === agentId);
  return (
    found ?? {
      id: "vision",
      title: "Vision",
      shortDescription: "Snapshot-scoped narrative responses with citations.",
      enabled: true,
    }
  );
}

