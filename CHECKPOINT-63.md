Checkpoint 63: isolated Mail Send capability boundary.

This checkpoint separates mail send from mail read. It introduces a dedicated provider boundary and durable outbound queue contract. Live provider transport and execution authorization are intentionally added only in subsequent small blocks. Send must never reuse mail:read authority.