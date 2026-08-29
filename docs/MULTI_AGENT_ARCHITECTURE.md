# LUNA Multi-Agent Architecture

## Topology

LUNA Core is the master orchestrator. Specialist agents do not bypass permissions, security, approval, queue, or audit services.

```text
                         LUNA CORE
                      MASTER / ROUTER
                             |
      +----------+-----------+-----------+----------+
      |          |           |           |          |
   RESEARCH    MEMORY      PLANNER     ACTION    SECURITY
      |          |           |           |          |
   search     recall      plans       tools       guard
      |
 +----+---------+---------+----------+
 |              |                    |
DOCUMENT      CODING              ANALYSIS
```

## Agents

- `luna`: master orchestrator and user-facing agent
- `research`: search and synthesis
- `memory`: durable memory and context
- `planner`: planning, scheduling, workflows
- `action`: approved tool execution
- `security`: permissions and risk checks
- `document`: files and document processing
- `coding`: software engineering
- `analysis`: evaluation and reporting

## Execution boundary

Every action-producing agent must remain behind the existing security and permission architecture:

`request -> route -> permission -> security/guard -> approval (when required) -> queue/action -> audit -> result`

The multi-agent registry is intentionally provider-agnostic. No API keys or external model connections are required to define the architecture.
