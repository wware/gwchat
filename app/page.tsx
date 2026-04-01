"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, TextUIPart } from "ai";
import ReactMarkdown from "react-markdown";

interface SessionInfo {
  app_title: string;
  app_description: string;
  examples: Record<string, string>;
  mcp: {
    connected: boolean;
    tools: string[];
    error?: string;
  };
  llm: {
    provider: string;
    orchestrator_model: string;
    synthesis_model: string;
  };
}

const BILLING_PATTERNS = [
  "billing", "credit", "rate limit", "quota", "usage limit",
  "exceeded", "insufficient credit", "payment required", "429",
];

function looksLikeBillingIssue(text: string): boolean {
  const lower = text.toLowerCase();
  return BILLING_PATTERNS.some((p) => lower.includes(p));
}

export default function ChatPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session info on mount
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data: SessionInfo) => setSession(data))
      .catch((err) => setSessionError(String(err)));
  }, []);

  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const isLoading = status === "streaming" || status === "submitted";

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function submitMessage(text: string) {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function sendPrompt(prompt: string) {
    submitMessage(prompt);
  }

  const examples = session?.examples ?? {};

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4">
      {/* Header */}
      <header className="py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h1 className="text-xl font-semibold">
          {session?.app_title ?? "Knowledge Graph Chat"}
        </h1>
        {session && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {session.app_description}
          </p>
        )}
      </header>

      {/* Status bar */}
      {session && (
        <div className="py-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 space-y-0.5">
          {session.mcp.connected ? (
            <p>
              ✅ MCP connected — {session.mcp.tools.length} tools:{" "}
              <span className="font-mono">{session.mcp.tools.join(", ")}</span>
            </p>
          ) : (
            <p className="text-amber-600 dark:text-amber-400">
              ⚠️ {session.mcp.error ?? "MCP not connected"}
            </p>
          )}
          <p>
            LLM: <span className="font-mono">{session.llm.provider}</span> —
            orchestrator:{" "}
            <span className="font-mono">{session.llm.orchestrator_model}</span>{" "}
            → synthesis:{" "}
            <span className="font-mono">{session.llm.synthesis_model}</span>
          </p>
        </div>
      )}
      {sessionError && (
        <p className="py-2 text-xs text-red-500">Session error: {sessionError}</p>
      )}

      {/* Example prompts — only shown before any messages */}
      {Object.keys(examples).length > 0 && messages.length === 0 && (
        <div className="py-3 flex-shrink-0">
          <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
            Example prompts:
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(examples).map(([label, prompt]) => (
              <button
                key={label}
                onClick={() => sendPrompt(prompt)}
                disabled={isLoading}
                className="text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600
                           hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.map((m) => {
          const textParts = m.parts.filter((p): p is TextUIPart => p.type === "text");
          const fullText = textParts.map((p) => p.text).join("");
          return (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                  ${m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                  }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{fullText}</p>
                ) : (
                  <>
                    <div className="prose">
                      <ReactMarkdown>{fullText}</ReactMarkdown>
                    </div>
                    {looksLikeBillingIssue(fullText) && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 border-t border-amber-300 pt-1">
                        ⚠️ This response may indicate an API billing or rate limit issue.
                        Check your provider dashboard or API key.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="text-sm text-gray-500 animate-pulse">Working…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="py-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => { e.preventDefault(); submitMessage(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitMessage(input);
              }
            }}
            placeholder="Ask about the knowledge graph…"
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-900 px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium
                       hover:bg-blue-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
