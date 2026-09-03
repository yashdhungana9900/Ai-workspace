import { useEffect, useState } from "react";

import ProductShell from "./components/layout/ProductShell";
import ChatWorkspace from "./components/chat/ChatWorkspace";

import {
  createConversation,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  login,
  streamMessage,
} from "./api";

import "./App.css";

const TOKEN_KEY = "ai_workspace_access_token";

function LoginScreen({ onLogin, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      return;
    }

    await onLogin(username, password);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <span>✦</span>
          </div>

          <span>AI Workspace</span>
        </div>

        <div className="auth-heading">
          <h1>Welcome back</h1>

          <p>
            Sign in to continue to your workspace.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            Username

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter your username"
              autoComplete="username"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          AI Workspace · Personal account
        </p>
      </div>
    </div>
  );
}

function App() {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    initializeApp();
  }, [accessToken]);

  async function initializeApp() {
    try {
      setLoading(true);
      setError("");

      const currentUser =
        await getCurrentUser(accessToken);

      setUser(currentUser);

      const conversationList =
        await getConversations(accessToken);

      setConversations(conversationList);

      if (conversationList.length > 0) {
        const firstConversation = conversationList[0];

        setActiveConversationId(
          firstConversation.id
        );

        const conversationMessages =
          await getConversationMessages(
            accessToken,
            firstConversation.id
          );

        setMessages(conversationMessages);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);

      localStorage.removeItem(TOKEN_KEY);

      setAccessToken(null);
      setUser(null);
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(username, password) {
    try {
      setLoginLoading(true);
      setError("");

      const data = await login(
        username,
        password
      );

      localStorage.setItem(
        TOKEN_KEY,
        data.access
      );

      setAccessToken(data.access);
    } catch (err) {
      console.error(err);

      setError(
        err?.data?.detail ||
          "Invalid username or password."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);

    setAccessToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
  }

  async function handleNewConversation() {
    if (!accessToken) {
      return;
    }

    try {
      setError("");

      const conversation =
        await createConversation(
          accessToken,
          "New conversation"
        );

      setConversations((previous) => [
        conversation,
        ...previous,
      ]);

      setActiveConversationId(
        conversation.id
      );

      setMessages([]);
      setInput("");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to create a new conversation."
      );
    }
  }

  async function handleSelectConversation(
    conversationId
  ) {
    if (!accessToken) {
      return;
    }

    try {
      setError("");

      setActiveConversationId(
        conversationId
      );

      const conversationMessages =
        await getConversationMessages(
          accessToken,
          conversationId
        );

      setMessages(conversationMessages);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load this conversation."
      );
    }
  }

  async function handleSendMessage() {
    const content = input.trim();

    if (
      !content ||
      !accessToken ||
      !activeConversationId ||
      isSending
    ) {
      return;
    }

    const conversationId =
      activeConversationId;

    const streamingMessageId =
      `streaming-${Date.now()}`;

    try {
      setIsSending(true);
      setError("");
      setInput("");

      await streamMessage(
        accessToken,
        conversationId,
        content,
        {
          onStart: ({
            user_message,
            conversation,
          }) => {
            setMessages((previous) => [
              ...previous,
              user_message,
              {
                id: streamingMessageId,
                conversation:
                  conversationId,
                role: "assistant",
                content: "",
                created_at:
                  new Date().toISOString(),
              },
            ]);

            // Update the sidebar immediately
            // with the generated conversation title.
            setConversations((previous) =>
              previous.map((item) =>
                item.id === conversationId
                  ? {
                      ...item,
                      title:
                        conversation.title,
                      updated_at:
                        conversation.updated_at,
                    }
                  : item
              )
            );
          },

          onDelta: (delta) => {
            setMessages((previous) =>
              previous.map((message) =>
                message.id ===
                streamingMessageId
                  ? {
                      ...message,
                      content:
                        message.content + delta,
                    }
                  : message
              )
            );
          },

          onDone: ({ assistant_message }) => {
            setMessages((previous) =>
              previous.map((message) =>
                message.id ===
                streamingMessageId
                  ? assistant_message
                  : message
              )
            );

            setConversations((previous) =>
              previous.map((conversation) =>
                conversation.id ===
                conversationId
                  ? {
                      ...conversation,
                      updated_at:
                        assistant_message.created_at,
                    }
                  : conversation
              )
            );
          },

          onError: ({ message }) => {
            setError(
              message ||
                "The AI service is currently unavailable."
            );
          },
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to send your message."
      );

      setInput(content);
    } finally {
      setIsSending(false);
    }
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-mark">
          <span>✦</span>
        </div>

        <span>Loading workspace...</span>
      </div>
    );
  }

  if (!accessToken || !user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={loginLoading}
        error={error}
      />
    );
  }

  const activeConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        activeConversationId
    );

  return (
    <>
      {error && (
        <div className="global-error">
          {error}

          <button
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      <ProductShell
        user={user}
        conversations={conversations}
        activeConversationId={
          activeConversationId
        }
        onSelectConversation={
          handleSelectConversation
        }
        onNewConversation={
          handleNewConversation
        }
        onLogout={handleLogout}
      >
        <ChatWorkspace
          conversation={activeConversation}
          messages={messages}
          input={input}
          setInput={setInput}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          onNewConversation={
            handleNewConversation
          }
        />
      </ProductShell>
    </>
  );
}

export default App;