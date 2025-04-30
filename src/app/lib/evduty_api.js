
export async function login(email, password) {

    console.log("Logging in with email:", email);

    const data = await fetch("https://api.evduty.net/v1/account/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email,
            password: password,
            device: {
                id: "A",
                model: "A",
                type: "ANDROID",
            },
        }),
        timeout: 20,
    });

    return data;
};


export async function get(token, route, params = {}) {
    console.log("get token:", token);
    const data = await fetch(`https://api.evduty.net/${route}`, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": `Bearer ${token}`,
        },
        params: params,
    });

    return data;
}