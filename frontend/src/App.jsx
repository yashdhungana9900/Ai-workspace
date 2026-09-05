import { useEffect, useState } from "react";

import ProductShell from "./components/layout/ProductShell";
import ChatWorkspace from "./components/chat/ChatWorkspace";

import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversations,
  getCurrentUser,
  login,
  register,
  renameConversation,
  streamMessage,
} from "./api";

import "./App.css";

const TOKEN_KEY =
  "ai_workspace_access_token";


/* =========================
   LOGIN SCREEN
========================= */

function LoginScreen({
  onLogin,
  onShowRegister,
  loading,
  error,
}) {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !username.trim() ||
      !password
    ) {
      return;
    }

    await onLogin(
      username,
      password
    );
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-brand-mark">
            <span>✦</span>
          </div>

          <span>
            AI Workspace
          </span>
        </div>

        <div className="auth-heading">
          <h1>
            Welcome back
          </h1>

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
                setUsername(
                  event.target.value
                )
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
                setPassword(
                  event.target.value
                )
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
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

        </form>

        <p className="auth-footer">
          Don't have an account?{" "}

          <button
            type="button"
            className="auth-link"
            onClick={onShowRegister}
          >
            Create account
          </button>
        </p>

      </div>
    </div>
  );
}


/* =========================
   REGISTER SCREEN
========================= */

function RegisterScreen({
  onRegister,
  onShowLogin,
  loading,
  error,
}) {
  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return;
    }

    await onRegister({
      username: username.trim(),
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-brand-mark">
            <span>✦</span>
          </div>

          <span>
            AI Workspace
          </span>
        </div>

        <div className="auth-heading">
          <h1>
            Create your account
          </h1>

          <p>
            Start building in your personal AI workspace.
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
                setUsername(
                  event.target.value
                )
              }
              placeholder="Choose a username"
              autoComplete="username"
            />
          </label>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your email"
              autoComplete="email"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>

          <div className="auth-name-row">

            <label>
              First name

              <input
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(
                    event.target.value
                  )
                }
                placeholder="First name"
                autoComplete="given-name"
              />
            </label>

            <label>
              Last name

              <input
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(
                    event.target.value
                  )
                }
                placeholder="Last name"
                autoComplete="family-name"
              />
            </label>

          </div>

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
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>

        </form>

        <p className="auth-footer">
          Already have an account?{" "}

          <button
            type="button"
            className="auth-link"
            onClick={onShowLogin}
          >
            Sign in
          </button>
        </p>

      </div>
    </div>
  );
}


/* =========================
   APP
========================= */

function App() {
  const [accessToken, setAccessToken] =
    useState(
      () =>
        localStorage.getItem(
          TOKEN_KEY
        )
    );

  const [user, setUser] =
    useState(null);

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  const [
    registerLoading,
    setRegisterLoading,
  ] = useState(false);

  const [authMode, setAuthMode] =
    useState("login");

  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const [error, setError] =
    useState("");


  /* =========================
     INITIALIZE WORKSPACE
  ========================= */

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
        await getCurrentUser(
          accessToken
        );

      setUser(currentUser);

      const conversationList =
        await getConversations(
          accessToken
        );

      setConversations(
        conversationList
      );

      if (
        conversationList.length > 0
      ) {
        const firstConversation =
          conversationList[0];

        setActiveConversationId(
          firstConversation.id
        );

        const conversationMessages =
          await getConversationMessages(
            accessToken,
            firstConversation.id
          );

        setMessages(
          conversationMessages
        );
      } else {
        setActiveConversationId(
          null
        );

        setMessages([]);
      }

    } catch (err) {
      console.error(
        "INITIALIZATION ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to initialize workspace."
      );

    } finally {
      setLoading(false);
    }
  }


  /* =========================
     LOGIN
  ========================= */

  async function handleLogin(
    username,
    password
  ) {
    try {
      setLoginLoading(true);
      setError("");

      const data =
        await login(
          username,
          password
        );

      if (!data?.access) {
        throw new Error(
          "Login succeeded but no access token was returned."
        );
      }

      localStorage.setItem(
        TOKEN_KEY,
        data.access
      );

      setAccessToken(
        data.access
      );

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      setError(
        err?.data?.detail ||
          err?.message ||
          "Invalid username or password."
      );

    } finally {
      setLoginLoading(false);
    }
  }


  /* =========================
     REGISTER
  ========================= */

  async function handleRegister(
    registrationData
  ) {
    try {
      setRegisterLoading(true);
      setError("");

      await register(
        registrationData
      );

      setAuthMode("login");

      setError(
        "Account created successfully. Please sign in."
      );

    } catch (err) {
      console.error(
        "REGISTER ERROR:",
        err
      );

      let message =
        "Unable to create your account.";

      if (
        err?.data &&
        typeof err.data ===
          "object"
      ) {
        const data =
          err.data;

        if (data.username) {
          message =
            Array.isArray(
              data.username
            )
              ? data.username[0]
              : data.username;

        } else if (data.email) {
          message =
            Array.isArray(
              data.email
            )
              ? data.email[0]
              : data.email;

        } else if (data.password) {
          message =
            Array.isArray(
              data.password
            )
              ? data.password[0]
              : data.password;

        } else if (data.detail) {
          message =
            data.detail;
        }

      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      setError(message);

    } finally {
      setRegisterLoading(false);
    }
  }


  /* =========================
     LOGOUT
  ========================= */

  function handleLogout() {
    localStorage.removeItem(
      TOKEN_KEY
    );

    setAccessToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
    setAuthMode("login");
  }


  /* =========================
     NEW CONVERSATION
  ========================= */

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

      setConversations(
        (previous) => [
          conversation,
          ...previous,
        ]
      );

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


  /* =========================
     SELECT CONVERSATION
  ========================= */

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

      setMessages(
        conversationMessages
      );

    } catch (err) {
      console.error(err);

      setError(
        "Unable to load this conversation."
      );
    }
  }


  /* =========================
     RENAME CONVERSATION
  ========================= */

  async function handleRenameConversation(
    conversationId,
    title
  ) {
    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      return;
    }

    try {
      setError("");

      const updatedConversation =
        await renameConversation(
          accessToken,
          conversationId,
          cleanTitle
        );

      setConversations(
        (previous) =>
          previous.map(
            (conversation) =>
              conversation.id ===
              conversationId
                ? updatedConversation
                : conversation
          )
      );

    } catch (err) {
      console.error(err);

      setError(
        "Unable to rename this conversation."
      );
    }
  }


  /* =========================
     DELETE CONVERSATION
  ========================= */

  async function handleDeleteConversation(
    conversationId
  ) {
    try {
      setError("");

      await deleteConversation(
        accessToken,
        conversationId
      );

      setConversations(
        (previous) =>
          previous.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          )
      );

      if (
        activeConversationId ===
        conversationId
      ) {
        setActiveConversationId(
          null
        );

        setMessages([]);
      }

    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete this conversation."
      );
    }
  }


  /* =========================
     SEND MESSAGE
  ========================= */

  async function handleSendMessage() {
    const content =
      input.trim();

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

      /*
       * IMPORTANT:
       *
       * Create the user message and
       * empty assistant message
       * immediately.
       *
       * We no longer wait for an
       * onStart SSE event because
       * the Django backend currently
       * sends token events directly.
       */

      setMessages((previous) => [
        ...previous,

        {
          id: `user-${Date.now()}`,
          conversation:
            conversationId,
          role: "user",
          content,
          created_at:
            new Date().toISOString(),
        },

        {
          id:
            streamingMessageId,
          conversation:
            conversationId,
          role: "assistant",
          content: "",
          sources: [],
          created_at:
            new Date().toISOString(),
        },
      ]);


      await streamMessage(
        accessToken,
        conversationId,
        content,
        {

          /* =========================
             STREAM TOKENS
          ========================= */

          onDelta: (delta) => {
            setMessages(
              (previous) =>
                previous.map(
                  (message) =>
                    message.id ===
                    streamingMessageId
                      ? {
                          ...message,
                          content:
                            message.content +
                            delta,
                        }
                      : message
                )
            );
          },


          /* =========================
             RAG SOURCES
          ========================= */

          onSources: (sources) => {
            setMessages(
              (previous) =>
                previous.map(
                  (message) =>
                    message.id ===
                    streamingMessageId
                      ? {
                          ...message,
                          sources,
                        }
                      : message
                )
            );
          },


          /* =========================
             STREAM COMPLETE
          ========================= */

          onDone: async () => {
            try {

              /*
               * Reload messages from
               * PostgreSQL.
               *
               * This replaces the
               * temporary streaming
               * message with the actual
               * persisted assistant
               * message.
               */

              const latestMessages =
                await getConversationMessages(
                  accessToken,
                  conversationId
                );

              setMessages(
                latestMessages
              );


              /*
               * Refresh conversation
               * title and updated_at.
               */

              const latestConversations =
                await getConversations(
                  accessToken
                );

              setConversations(
                latestConversations
              );

            } catch (error) {
              console.error(
                "Failed to refresh conversation:",
                error
              );
            }
          },


          /* =========================
             STREAM ERROR
          ========================= */

          onError: ({
            message,
          }) => {

            setError(
              message ||
                "The AI service is currently unavailable."
            );


            /*
             * Remove the temporary
             * assistant message.
             */

            setMessages(
              (previous) =>
                previous.filter(
                  (message) =>
                    message.id !==
                    streamingMessageId
                )
            );
          },
        }
      );

    } catch (err) {

      console.error(
        "SEND MESSAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to send your message."
      );

      setInput(content);


      /*
       * Remove temporary assistant
       * message if the request itself
       * failed.
       */

      setMessages(
        (previous) =>
          previous.filter(
            (message) =>
              message.id !==
              streamingMessageId
          )
      );

    } finally {
      setIsSending(false);
    }
  }


  /* =========================
     LOADING SCREEN
  ========================= */

  if (loading) {
    return (
      <div className="app-loading">

        <div className="loading-mark">
          <span>✦</span>
        </div>

        <span>
          Loading workspace...
        </span>

      </div>
    );
  }


  /* =========================
     AUTH SCREENS
  ========================= */

  if (
    !accessToken ||
    !user
  ) {

    if (
      authMode ===
      "register"
    ) {
      return (
        <RegisterScreen
          onRegister={
            handleRegister
          }
          onShowLogin={() => {
            setAuthMode(
              "login"
            );

            setError("");
          }}
          loading={
            registerLoading
          }
          error={error}
        />
      );
    }

    return (
      <LoginScreen
        onLogin={
          handleLogin
        }
        onShowRegister={() => {
          setAuthMode(
            "register"
          );

          setError("");
        }}
        loading={
          loginLoading
        }
        error={error}
      />
    );
  }


  /* =========================
     ACTIVE CONVERSATION
  ========================= */

  const activeConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        activeConversationId
    );


  /* =========================
     WORKSPACE
  ========================= */

  return (
    <>
      {error && (
        <div className="global-error">

          {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>

        </div>
      )}

      <ProductShell
        user={user}
        conversations={
          conversations
        }
        activeConversationId={
          activeConversationId
        }
        onSelectConversation={
          handleSelectConversation
        }
        onNewConversation={
          handleNewConversation
        }
        onRenameConversation={
          handleRenameConversation
        }
        onDeleteConversation={
          handleDeleteConversation
        }
        onLogout={
          handleLogout
        }
      >

        <ChatWorkspace
          accessToken={
            accessToken
          }
          conversation={
            activeConversation
          }
          messages={
            messages
          }
          input={
            input
          }
          setInput={
            setInput
          }
          onSendMessage={
            handleSendMessage
          }
          isSending={
            isSending
          }
          onNewConversation={
            handleNewConversation
          }
        />

      </ProductShell>
    </>
  );
}


export default App;