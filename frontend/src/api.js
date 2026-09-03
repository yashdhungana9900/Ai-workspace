const API_BASE_URL = "http://127.0.0.1:8000/api/v1";


async function request(endpoint, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.detail ||
        data?.message ||
        "Something went wrong."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}


export async function login(
  username,
  password
) {
  return request("/auth/login/", {
    method: "POST",

    body: JSON.stringify({
      username,
      password,
    }),
  });
}


export async function register({
  username,
  email,
  password,
  first_name,
  last_name,
}) {
  return request("/auth/register/", {
    method: "POST",

    body: JSON.stringify({
      username,
      email,
      password,
      first_name,
      last_name,
    }),
  });
}


export async function getCurrentUser(
  accessToken
) {
  return request("/auth/me/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}


export async function getConversations(
  accessToken
) {
  return request("/conversations/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}


export async function createConversation(
  accessToken,
  title = "New conversation"
) {
  return request("/conversations/", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${accessToken}`,
    },

    body: JSON.stringify({
      title,
    }),
  });
}


export async function getConversationMessages(
  accessToken,
  conversationId
) {
  return request(
    `/conversations/${conversationId}/messages/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
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
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        content,
      }),
    }
  );
}


export async function streamMessage(
  accessToken,
  conversationId,
  content,
  callbacks
) {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        content,
      }),
    }
  );

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => null);

    const error = new Error(
      data?.detail ||
        data?.message ||
        "Unable to send message."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser."
    );
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

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
      {
        stream: true,
      }
    );

    const events = buffer.split(
      "\n\n"
    );

    buffer =
      events.pop() || "";

    for (const eventBlock of events) {
      if (!eventBlock.trim()) {
        continue;
      }

      let eventType = "message";

      let dataLine = "";

      for (
        const line of eventBlock.split("\n")
      ) {
        if (line.startsWith("event:")) {
          eventType = line
            .slice("event:".length)
            .trim();
        }

        if (line.startsWith("data:")) {
          dataLine += line
            .slice("data:".length)
            .trim();
        }
      }

      if (!dataLine) {
        continue;
      }

      let data;

      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }

      if (eventType === "start") {
        callbacks?.onStart?.(data);
      }

      if (eventType === "delta") {
        callbacks?.onDelta?.(
          data.content || ""
        );
      }

      if (eventType === "done") {
        callbacks?.onDone?.(data);
      }

      if (eventType === "error") {
        callbacks?.onError?.(data);
      }
    }
  }
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
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        title,
      }),
    }
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

      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}