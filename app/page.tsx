import DashboardReference from "./components/DashboardReference";
import { lunaAgents } from "../lib/luna/agents";
import type { LunaAgentId } from "../lib/luna/agents";

function isAgentId(value: string | undefined): value is LunaAgentId {
  return Boolean(value && lunaAgents.some((agent) => agent.id === value));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawAgent = Array.isArray(params.agent) ? params.agent[0] : params.agent;
  const selectedAgentId = isAgentId(rawAgent) ? rawAgent : "luna";
  return <DashboardReference initialAgentId={selectedAgentId} />;
}
