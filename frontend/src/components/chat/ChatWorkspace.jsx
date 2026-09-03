import {
  ArrowUp,
  ChevronDown,
  FileText,
  Image,
  Paperclip,
  Plus,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef } from "react";

function ChatWorkspace({
  conversation,
  messages,
  input,
  setInput,
  onSendMessage,
  isSending,
  onNewConversation,
}) {
  const messagesEndRef = useRef(null);

  const suggestions = [
    {
      icon: FileText,
      title: "Analyze a document",
      description:
        "Summarize, extract insights, or answer questions.",
      prompt:
        "Help me analyze this document.",
    },
    {
      icon: Sparkles,
      title: "Build something",
      description:
        "Plan architecture, write code, or debug a problem.",
      prompt:
        "Help me design and build a software project.",
    },
    {
      icon: Image,
      title: "Understand an image",
      description:
        "Analyze screenshots, diagrams, or visual content.",
      prompt:
        "Help me understand this image.",
    },
    {
      icon: SlidersHorizontal,
      title: "Explore an idea",
      description:
        "Research concepts and turn them into clear plans.",
      prompt:
        "Help me explore this idea.",
    },
  ];

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!isSending && input.trim()) {
        onSendMessage();
      }
    }
  };

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <section className="chat-workspace">
      <header className="chat-header">
        <div className="chat-header-left">
          <button className="chat-title-button">
            <div className="chat-title-icon">
              <Sparkles
                size={15}
                strokeWidth={2.1}
              />
            </div>

            <div className="chat-title-copy">
              <span className="chat-title">
                {conversation?.title ||
                  "New conversation"}
              </span>

              <span className="chat-subtitle">
                Personal workspace
              </span>
            </div>

            <ChevronDown size={15} />
          </button>
        </div>

        <div className="chat-header-right">
          <button
            className="header-icon-button"
            aria-label="New conversation"
            onClick={onNewConversation}
          >
            <Plus size={18} />
          </button>

          <button className="model-selector">
            <span className="model-dot" />
            <span>GPT-4o mini</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <div className="chat-content">
        {!hasMessages ? (
          <div className="chat-empty-state">
            <div className="hero-mark">
              <Sparkles
                size={22}
                strokeWidth={2}
              />
            </div>

            <div className="hero-copy">
              <h1>
                What can I help you build?
              </h1>

              <p>
                Ask a question, analyze a document,
                write code, or start something new.
              </p>
            </div>

            <div className="suggestion-grid">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    className="suggestion-card"
                    key={suggestion.title}
                    onClick={() =>
                      setInput(
                        suggestion.prompt
                      )
                    }
                  >
                    <div className="suggestion-icon">
                      <Icon
                        size={17}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="suggestion-copy">
                      <span className="suggestion-title">
                        {suggestion.title}
                      </span>

                      <span className="suggestion-description">
                        {suggestion.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message) => {
              const isStreaming =
                typeof message.id ===
                  "string" &&
                message.id.startsWith(
                  "streaming-"
                );

              return (
                <div
                  className={`message-row ${
                    message.role
                  } ${
                    isStreaming
                      ? "streaming"
                      : ""
                  }`}
                  key={message.id}
                >
                  <div className="message-avatar">
                    {message.role ===
                    "assistant" ? (
                      <Sparkles size={15} />
                    ) : (
                      "Y"
                    )}
                  </div>

                  <div className="message-body">
                    <div className="message-author">
                      {message.role ===
                      "assistant"
                        ? "AI Workspace"
                        : "You"}
                    </div>

                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              ref={messagesEndRef}
              className="messages-end"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div className="composer-area">
        <div className="composer">
          <div className="composer-input-row">
            <button
              className="composer-icon"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              className="composer-input"
              placeholder="Message AI Workspace..."
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isSending}
            />

            <button
              className={`send-button ${
                !input.trim() || isSending
                  ? "disabled"
                  : ""
              }`}
              aria-label="Send message"
              onClick={onSendMessage}
              disabled={
                !input.trim() || isSending
              }
            >
              <ArrowUp
                size={18}
                strokeWidth={2.4}
              />
            </button>
          </div>

          <div className="composer-footer">
            <div className="composer-tools">
              <button className="composer-tool">
                <Paperclip size={14} />
                Attach
              </button>

              <button className="composer-tool">
                <Sparkles size={14} />
                Tools
              </button>
            </div>

            <span className="composer-hint">
              Enter to send · Shift + Enter
              for newline
            </span>
          </div>
        </div>

        <p className="composer-disclaimer">
          AI Workspace can make mistakes.
          Check important information.
        </p>
      </div>
    </section>
  );
}

export default ChatWorkspace;