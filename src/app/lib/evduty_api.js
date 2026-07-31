const API_BASE_URL = "https://api.evduty.net/";

export async function login(email, password) {
  const body = {
    email: email,
    password: password,
    device: {
      id: "A",
      model: "A",
      type: "ANDROID",
    },
  };

  return await post(null, "v1/account/login", body);
}

export async function get(token, route, params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();

  return fetch(`${API_BASE_URL}${route}${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json;charset=UTF-8",
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getActivities(
  token,
  stationId,
  terminalId,
  { limit = 100 } = {},
) {
  const MAX_PAGES = 1000;
  const sessions = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await get(
      token,
      `v2/account/stations/${stationId}/terminals/${terminalId}/activities`,
      { limit, offset },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch activities for terminal ${terminalId}: ${response.status} ${response.statusText}`,
      );
    }

    const body = await response.json();
    const data = body.data ?? [];
    sessions.push(...data);

    if (data.length < limit) {
      break;
    }
    offset += limit;
  }

  return sessions;
}

export async function post(token, route, body = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json;charset=UTF-8",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${route}`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
}
