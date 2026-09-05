const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY =
  "ai_workspace_access_token";


async function request(
  endpoint,
  options = {},
  accessToken = null
) {
  const token =
    accessToken ||
    localStorage.getItem(TOKEN_KEY);

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const contentType =
    response.headers.get("content-type");

  const data =
    contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data?.detail
        ? data.detail
        : typeof data === "object" &&
          data?.error
        ? data.error
        : "Something went wrong.";

    const error =
      new Error(message);

    error.data = data;

    throw error;
  }

  return data;
}


/* =========================
   AUTH
========================= */

export async function login(
  username,
  password
) {
  return request(
    "/auth/login/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );
}


export async function register(
  data
) {
  return request(
    "/auth/register/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(data),
    }
  );
}


export async function getCurrentUser(
  accessToken
) {
  return request(
    "/auth/me/",
    {},
    accessToken
  );
}


/* =========================
   CONVERSATIONS
========================= */

export async function getConversations(
  accessToken
) {
  return request(
    "/conversations/",
    {},
    accessToken
  );
}


export async function createConversation(
  accessToken,
  title = "New conversation"
) {
  return request(
    "/conversations/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        title,
      }),
    },
    accessToken
  );
}


export async function getConversationMessages(
  accessToken,
  conversationId
) {
  return request(
    `/conversations/${conversationId}/messages/`,
    {},
    accessToken
  );
}


export async function sendMessage(
  accessToken,
  conversationId,
  content
) {
  return request(
    `/conversations/${conversationId}/messages/`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        content,
      }),
    },
    accessToken
  );
}


export async function renameConversation(
  accessToken,
  conversationId,
  title
) {
  return request(
    `/conversations/${conversationId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        title,
      }),
    },
    accessToken
  );
}


export async function deleteConversation(
  accessToken,
  conversationId
) {
  return request(
    `/conversations/${conversationId}/`,
    {
      method: "DELETE",
    },
    accessToken
  );
}


/* =========================
   STREAMING CHAT
========================= */

export async function streamMessage(
  accessToken,
  conversationId,
  content,
  {
    onStart,
    onDelta,
    onSources,
    onDone,
    onError,
  } = {}
) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
    }
  );

  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorMessage = "Failed to send message.";

    try {
      if (contentType?.includes("application/json")) {
        const data = await response.json();

        errorMessage =
          data?.detail ||
          data?.error ||
          errorMessage;
      } else {
        const text = await response.text();

        if (text) {
          errorMessage = text;
        }
      }
    } catch {
      // Ignore parsing errors.
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  const processEvent = (rawEvent) => {
    const lines = rawEvent.split("\n");

    let eventType = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line
          .slice(6)
          .trim();
      }

      if (line.startsWith("data:")) {
        data += line
          .slice(5)
          .trim();
      }
    }

    if (!data) {
      return;
    }

    try {
      const parsed = JSON.parse(data);

      /*
       * Backend currently sends:
       *
       * data: {"type":"token", ...}
       *
       * rather than:
       *
       * event: delta
       * data: {...}
       *
       * Therefore support both formats.
       */

      const type =
        eventType !== "message"
          ? eventType
          : parsed.type;

      if (type === "start") {
        if (onStart) {
          onStart(parsed);
        }
      }

      if (
        type === "token" ||
        type === "delta"
      ) {
        if (onDelta) {
          onDelta(parsed);
        }
      }

      if (type === "sources") {
        if (onSources) {
          onSources(
            parsed.sources || []
          );
        }
      }

      if (type === "done") {
        if (onDone) {
          onDone(parsed);
        }
      }

      if (type === "error") {
        if (onError) {
          onError(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Invalid SSE data:",
        data,
        error
      );
    }
  };

  while (true) {
    const {
      value,
      done,
    } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      { stream: true }
    );

    const events =
      buffer.split("\n\n");

    buffer =
      events.pop() || "";

    for (const rawEvent of events) {
      processEvent(rawEvent);
    }
  }

  if (buffer.trim()) {
    processEvent(buffer);
  }
}

/* =========================
   DOCUMENTS
========================= */

export async function getDocuments(
  accessToken
) {
  return request(
    "/documents/",
    {},
    accessToken
  );
}


export async function uploadDocument(
  accessToken,
  file
) {
  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_BASE_URL}/documents/`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    );

  const data =
    contentType?.includes(
      "application/json"
    )
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    let message =
      "Failed to upload document.";

    if (
      typeof data === "object"
    ) {
      if (
        Array.isArray(data?.file)
      ) {
        message = data.file[0];
      } else if (data?.file) {
        message = data.file;
      } else if (data?.detail) {
        message = data.detail;
      } else if (data?.error) {
        message = data.error;
      }
    }

    const error =
      new Error(message);

    error.data = data;

    throw error;
  }

  return data;
}


export async function deleteDocument(
  accessToken,
  documentId
) {
  return request(
    `/documents/${documentId}/`,
    {
      method: "DELETE",
    },
    accessToken
  );
}