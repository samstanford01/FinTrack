import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "./api";

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi, I'm FinBot. Ask me about your spending, saving tips, or things like ISAs and the 50/30/20 rule.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="AI Assistant" className="flex flex-col h-[calc(100vh-8rem)] max-h-[600px]">
      <h2 className="text-lg font-medium text-zinc-300 mb-4">FinBot</h2>
      <div className="flex-1 overflow-y-auto rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-4 min-h-0">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-4 py-2 text-zinc-400 text-sm">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your budget or saving tips…"
          className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={loading}
          aria-label="Message to FinBot"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
