# LUNA Multi-Agent Architecture

## Topology

LUNA Core is the master orchestrator. Specialist agents do not bypass permissions, security, approval, queue, or audit services.

```text
                         LUNA CORE
                      MASTER / ROUTER
                             |
      +----------+-----------+-----------+----------+---------+
      |          |           |           |          |         |
   RESEARCH    MEMORY      PLANNER     ACTION    SECURITY    SHOP
      |          |           |           |          |         |
   search     recall      plans       tools       guard    commerce
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
- `shop`: isolated commerce research, catalog and controlled publishing

## Execution boundary

Every action-producing agent must remain behind the existing security and permission architecture:

`request -> route -> permission -> security/guard -> approval (when required) -> queue/action -> audit -> result`

The Shop Agent has the additional `store.publish` approval boundary and cannot bypass the general Guardian Gateway.

The multi-agent registry is provider-agnostic. No API keys or external model connections are required to define the architecture.
