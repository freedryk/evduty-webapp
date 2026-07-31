"use client";

import { createContext, useContext } from "react";
import { useFormStatus } from "react-dom";

import { login } from "@/app/lib/evduty_api.js";
import styles from "@/app/ui/page.module.css";

export const TokenContext = createContext();

function Submit() {
  const status = useFormStatus();

  return (
    <button type="submit" disabled={status.pending}>
      {status.pending ? "Logging in..." : "Login"}
    </button>
  );
}

export function LoginForm() {
  const { setToken } = useContext(TokenContext);

  async function handleLogin(formData) {
    const email = formData.get("email");
    const password = formData.get("password");

    const response = await login(email, password);
    const data = await response.json();
    setToken(data);
  }

  return (
    <form action={handleLogin} className={styles.loginForm}>
      <label htmlFor="email" className={styles.srOnly}>
        Email
      </label>
      <input
        type="text"
        name="email"
        id="email"
        placeholder="Email"
        autoComplete="email"
      />
      <label htmlFor="password" className={styles.srOnly}>
        Password
      </label>
      <input
        type="password"
        name="password"
        id="password"
        placeholder="Password"
        autoComplete="current-password"
      />
      <Submit />
    </form>
  );
}
