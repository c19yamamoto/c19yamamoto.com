import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.scss";
import ProfileSection from "@/components/ProfileSection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <>
      <Head>
        <title>c19yamamoto.com</title>
        <meta name="description" content="c19yamamoto's personal website" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/profile.jpeg" />
      </Head>
      <div
        className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}
      >
        <main className={styles.main}>
          <div className={styles.profileContainer}>
            <img src="/profile.jpeg" alt="Profile" className={styles.profileImage} />
            <h1 className={styles.profileName}>c19yamamoto</h1>
          </div>
          <ProfileSection />
        </main>
      </div>
    </>
  );
}
