import { useEffect, useState } from "react";
import "./App.css";

import {
  createConversation,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  login,
  register,
  sendMessage,
} from "./api";


function App() {
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("access_token")
  );

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [error, setError] = useState("");

  const [showRegister, setShowRegister] = useState(false);


  /* ========================= */
  /* Authentication */
  /* ========================= */

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    loadUser();
    loadConversations();
  }, [accessToken]);


  async function loadUser() {
    try {
      const currentUser =
        await getCurrentUser(accessToken);

      setUser(currentUser);
    } catch (error) {
      console.error(error);

      logout();
    }
  }


  async function loadConversations() {
    try {
      const data =
        await getConversations(accessToken);

      setConversations(data);

      if (data.length > 0 && !activeConversation) {
        selectConversation(data[0]);
      }
    } catch (error) {
      console.error(error);
    }
  }


  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setAccessToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
  }


  /* ========================= */
  /* Login */
  /* ========================= */

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const data = await login(
        username,
        password
      );

      localStorage.setItem(
        "access_token",
        data.access
      );

      localStorage.setItem(
        "refresh_token",
        data.refresh
      );

      setAccessToken(data.access);
    } catch (error) {
      console.error(error);

      setError(
        "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  }


  /* ========================= */
  /* Register */
  /* ========================= */

  async function handleRegister(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const username = formData.get("username");
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      await register({
        username,
        email,
        password,
      });

      const data = await login(
        username,
        password
      );

      localStorage.setItem(
        "access_token",
        data.access
      );

      localStorage.setItem(
        "refresh_token",
        data.refresh
      );

      setAccessToken(data.access);
    } catch (error) {
      console.error(error);

      if (error.data) {
        const firstError =
          Object.values(error.data)[0];

        if (Array.isArray(firstError)) {
          setError(firstError[0]);
        } else {
          setError(
            "Registration failed."
          );
        }
      } else {
        setError(
          "Registration failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }


  /* ========================= */
  /* Conversations */
  /* ========================= */

  async function selectConversation(conversation) {
    setActiveConversation(conversation);

    setLoadingMessages(true);
    setMessages([]);

    try {
      const data =
        await getConversationMessages(
          accessToken,
          conversation.id
        );

      setMessages(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load conversation."
      );
    } finally {
      setLoadingMessages(false);
    }
  }


  async function handleNewChat() {
    setError("");

    try {
      const conversation =
        await createConversation(
          accessToken,
          "New Chat"
        );

      setConversations((previous) => [
        conversation,
        ...previous,
      ]);

      setActiveConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to create a new chat."
      );
    }
  }


  /* ========================= */
  /* Send message */
  /* ========================= */

  async function handleSubmit(event) {
    event.preventDefault();

    const content = message.trim();

    if (!content || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      let conversation =
        activeConversation;

      /* Create conversation automatically */

      if (!conversation) {
        conversation =
          await createConversation(
            accessToken,
            content.slice(0, 50)
          );

        setConversations((previous) => [
          conversation,
          ...previous,
        ]);

        setActiveConversation(conversation);
      }

      setMessage("");

      const result =
        await sendMessage(
          accessToken,
          conversation.id,
          content
        );

      setMessages((previous) => [
        ...previous,
        result.user_message,
        result.assistant_message,
      ]);

      /* Refresh conversation list */

      const updated =
        await getConversations(
          accessToken
        );

      setConversations(updated);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to send your message."
      );
    } finally {
      setLoading(false);
    }
  }


  /* ========================= */
  /* Login/Register screen */
  /* ========================= */

  if (!accessToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-logo">
            AI
          </div>

          <h1>
            {showRegister
              ? "Create your account"
              : "Welcome back"}
          </h1>

          <p className="auth-subtitle">
            {showRegister
              ? "Create an AI Workspace account."
              : "Sign in to your AI Workspace."}
          </p>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {showRegister ? (
            <form
              onSubmit={handleRegister}
              className="auth-form"
            >
              <label>
                Username
                <input
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  minLength="8"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Create account"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleLogin}
              className="auth-form"
            >
              <label>
                Username
                <input
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </button>
            </form>
          )}

          <button
            className="auth-switch"
            onClick={() => {
              setShowRegister(
                (previous) => !previous
              );

              setError("");
            }}
          >
            {showRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Create one"}
          </button>

        </div>
      </div>
    );
  }


  /* ========================= */
  /* Main application */
  /* ========================= */

  return (
    <div className="app">

      {/* Sidebar */}

      <aside className="sidebar">

        <div className="sidebar-header">
          <button className="workspace-selector">

            <div className="workspace-icon">
              A
            </div>

            <div className="workspace-info">
              <span className="workspace-name">
                AI Workspace
              </span>

              <span className="workspace-plan">
                Personal workspace
              </span>
            </div>

            <span className="workspace-arrow">
              ⌄
            </span>

          </button>
        </div>


        <div className="sidebar-actions">

          <button
            className="new-chat-button"
            onClick={handleNewChat}
          >
            <span className="new-chat-icon">
              +
            </span>

            <span>
              New chat
            </span>

            <span className="shortcut">
              Ctrl K
            </span>
          </button>

          <button className="sidebar-button">
            <span className="sidebar-icon">
              ⌕
            </span>

            <span>
              Search chats
            </span>
          </button>

        </div>


        <div className="sidebar-section">

          <div className="sidebar-section-header">
            <span>
              Recent
            </span>
          </div>

          <div className="conversation-list">

            {conversations.map(
              (conversation) => (
                <button
                  key={conversation.id}
                  className={`conversation-item ${
                    activeConversation?.id ===
                    conversation.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectConversation(
                      conversation
                    )
                  }
                >
                  <span className="conversation-icon">
                    ◌
                  </span>

                  <span className="conversation-title">
                    {conversation.title}
                  </span>
                </button>
              )
            )}

            {conversations.length === 0 && (
              <div className="empty-conversations">
                No conversations yet
              </div>
            )}

          </div>
        </div>


        <div className="sidebar-bottom">

          <button className="sidebar-button">
            <span className="sidebar-icon">
              ⚙
            </span>

            <span>
              Settings
            </span>
          </button>


          <button
            className="user-profile"
            onClick={logout}
            title="Sign out"
          >
            <div className="user-avatar">
              {user?.username
                ?.charAt(0)
                .toUpperCase() || "U"}
            </div>

            <div className="user-info">

              <span className="user-name">
                {user?.username || "User"}
              </span>

              <span className="user-email">
                Sign out
              </span>

            </div>

            <span className="profile-menu">
              •••
            </span>
          </button>

        </div>

      </aside>


      {/* Main content */}

      <main className="main-content">

        <header className="topbar">

          <div className="mobile-title">
            {activeConversation?.title ||
              "AI Workspace"}
          </div>

          <div className="topbar-spacer"></div>

          <div className="topbar-actions">

            <button className="topbar-button">
              Share
            </button>

            <button className="topbar-icon-button">
              •••
            </button>

          </div>

        </header>


        <section className="chat-area">

          <div className="chat-content">

            {!activeConversation &&
              messages.length === 0 && (
                <div className="welcome-section">

                  <div className="welcome-logo">
                    AI
                  </div>

                  <h1>
                    How can I help you today?
                  </h1>

                  <p>
                    Ask questions, work with
                    documents, write code, or
                    explore ideas with your AI
                    workspace.
                  </p>

                </div>
              )}


            {loadingMessages && (
              <div className="loading-state">
                Loading conversation...
              </div>
            )}


            <div className="messages-list">

              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`message ${
                    item.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >

                  <div className="message-avatar">
                    {item.role === "user"
                      ? user?.username
                          ?.charAt(0)
                          .toUpperCase()
                      : "AI"}
                  </div>

                  <div className="message-content">

                    <strong>
                      {item.role === "user"
                        ? user?.username ||
                          "You"
                        : "AI Assistant"}
                    </strong>

                    <p>
                      {item.content}
                    </p>

                  </div>

                </div>
              ))}

            </div>

          </div>


          {/* Composer */}

          <div className="composer-section">

            {error && (
              <div className="chat-error">
                {error}
              </div>
            )}

            <form
              className="composer"
              onSubmit={handleSubmit}
            >

              <div className="composer-top">

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  placeholder="Message AI Workspace..."
                  rows="1"
                  disabled={loading}
                />

              </div>


              <div className="composer-bottom">

                <div className="composer-left">

                  <button
                    type="button"
                    className="composer-icon-button"
                    title="Attach file"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className="composer-tool-button"
                  >
                    <span>
                      ◈
                    </span>

                    Tools
                  </button>

                </div>


                <div className="composer-right">

                  <span className="model-label">
                    GPT-4o mini
                  </span>

                  <button
                    type="submit"
                    className="send-button"
                    disabled={
                      !message.trim() ||
                      loading
                    }
                  >
                    {loading
                      ? "..."
                      : "↑"}
                  </button>

                </div>

              </div>

            </form>


            <p className="disclaimer">
              AI Workspace may make mistakes.
              Verify important information.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;