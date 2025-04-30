'use client';

import { useContext, useState } from "react";

import { TokenContext, LoginForm } from "@/app/ui/login.js";
import MainMenu from "@/app/ui/mainmenu.js";
import styles from "@/app/ui/page.module.css";


export default function Home() {
  const [token, setToken] = useState();

  const isLoggedIn = token !== undefined;
  console.log('Is logged in:', isLoggedIn);

  const content = isLoggedIn ? <MainMenu /> : <LoginForm />;
  console.log('Content:', content);

  return (
    <div className={styles.container}>
      <TokenContext.Provider value={{ token, setToken }} >
        {content}
      </TokenContext.Provider>
    </div >
  );
}
