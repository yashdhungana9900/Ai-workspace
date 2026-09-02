const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

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

/* ========================= */
/* Authentication */
/* ========================= */

export async function login(username, password) {
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

export async function getCurrentUser(accessToken) {
  return request("/auth/me/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/* ========================= */
/* Conversations */
/* ========================= */

export async function getConversations(accessToken) {
  return request("/conversations/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createConversation(
  accessToken,
  title = "New Chat"
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