import { useEffect, useRef, useState } from "react";
import { chatFn, getMessagesFn } from "../server/runs";
import type { CampaignMessage } from "../lib/campaign/types";

type CampaignChatProps = {
  campaignId: string | null;
  refreshToken?: number;
};

export function CampaignChat({ campaignId, refreshToken }: CampaignChatProps) {
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campaignId) {
      setMessages([]);
      return;
    }
    getMessagesFn({ data: { campaignId } })
      .then((rows) => setMessages(rows as CampaignMessage[]))
      .catch(() => null);
  }, [campaignId, refreshToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!campaignId) return null;

  async function handleSend() {
    if (!campaignId || !input.trim() || busy) return;
    const content = input.trim();
    setInput("");
    setBusy(true);
    try {
      const result = await chatFn({ data: { campaignId, content } });
      setMessages(result.messages as CampaignMessage[]);
    } catch {
      // silent — message will be re-shown on next load
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Assistant</p>
        <h2>Campaign Chat</h2>
        <p>Ask questions or request refinements to your campaign strategy.</p>
      </div>
      <div className="card-bd">
        {messages.length > 0 && (
          <div className="chat-messages">
            {messages.map((m) => (
              <div className={`chat-msg chat-msg--${m.role}`} key={m.id}>
                <div className="chat-msg-header">
                  <span className="chat-msg-role">{m.role === "user" ? "You" : "Assistant"}</span>
                  {m.messageType === "refinement" && <span className="chat-msg-badge chat-msg-badge--refinement">Refinement</span>}
                  {m.messageType === "system_event" && <span className="chat-msg-badge chat-msg-badge--system">System</span>}
                </div>
                <p>{m.content}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
        <div className="chat-input-row">
          <label style={{ flex: 1 }}>
            <textarea
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your campaign... (Enter to send)"
              rows={3}
              value={input}
            />
          </label>
          <button
            className="secondary-button"
            disabled={busy || !input.trim()}
            onClick={() => void handleSend()}
            style={{ alignSelf: "flex-end" }}
            type="button"
          >
            {busy ? "..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
