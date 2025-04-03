'use client';

import LoginForm from "@/app/ui/login.js";
import MainMenu from "@/app/ui/mainmenu.js";

import styles from "@/app/ui/page.module.css";


let isLoggedIn = false;

export default function Home() {
  let content = null;

  if (isLoggedIn) {
    content = <MainMenu />;
  } else {
    content = <LoginForm />;
  }

  console.log("isLoggedIn: ", isLoggedIn);
  return (
    <div className={styles.container}>
      {content}
    </div>
  );

}
