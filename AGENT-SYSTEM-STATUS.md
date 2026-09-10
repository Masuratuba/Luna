# LUNA Agent System

The agent registry contains the 10 current agents: LUNA Core, Research, Memory, Planner, Action, Security, Document, Coding, Analysis, and Shop.

## Routing

`selectAgent()` first applies explicit domain routing through `agentForTask()`, then falls back to the existing decision router. This keeps the current chat behavior while making the agent directory functional for common domain requests.

## Safety

Agent dispatch continues to respect `requiresApproval`. Action and Coding remain approval-gated. Capability checks remain enforced by `dispatchWithCapability()` and the Guardian gateway.

## Scope

This change improves deterministic agent selection only. It does not bypass Guardian, alter Microsoft OAuth configuration, or change provider permissions.
