

export async function login(email, password) {

    console.log("Logging in with email:", email);

    const response = await fetch("https://api.evduty.net/v1/account/login", {
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

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    return data;

}