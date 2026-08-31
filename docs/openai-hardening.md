# OpenAI production boundary

The OpenAI adapter validates bounded input, keeps credentials server-side, applies a request timeout and bounded SDK retries, disables response storage, and resolves the model from explicit request/configuration/default in that order.
