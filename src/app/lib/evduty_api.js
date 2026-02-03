export async function login(email, password) {
  console.log('Logging in with email:', email)

  const body = {
    email: email,
    password: password,
    device: {
      id: 'A',
      model: 'A',
      type: 'ANDROID',
    },
  }

  return await post(null, 'v1/account/login', body)
}

export async function get(token, route, params = {}) {
  return fetch(`https://api.evduty.net/${route}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      Authorization: `Bearer ${token}`,
    },
    params: params,
  })
}

export async function post(token, route, body = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`https://api.evduty.net/${route}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  })
}
