# GraphWright TypeScript chat app

This gets its own docker container, and will eventually be a separate github
repo that kgraph/ will pull in as a git submodule. It should have memory over
a session. We *might* want to allow people to log in, and then there could be
a provision for memory that spans multiple chats (like Claude does).

Removing the old chat interface

- Chainlit's only external connections are `MCP_SSE_URL` (already an env var)
  and LLM APIs
- It doesn't import anything from kgserver Python modules
- The kgserver side just does a `mount_chainlit()` call in `query/server.py`
  that would simply be removed
- So extraction is clean: remove the chainlit mount from the api container,
  delete `kgserver/chainlit/`, and the new TS service talks to mcpserver via
  SSE exactly as before

For the TypeScript replacement of Chainlit, let's use:

- Vercel AI SDK (ai package) — the most mature TS toolkit for streaming LLM
  chat, has built-in MCP client support
- The simplest approach is probably a minimal Next.js app using Vercel AI SDK
  for LLM streaming + MCP client — gives you the chat UI, SSE streaming, and
  MCP connectivity all in one coherent package

For the MCP connectivity from TS: @modelcontextprotocol/sdk has a TypeScript
client that can connect to the existing SSE endpoint, so the mcpserver itself
doesn't need to change.
