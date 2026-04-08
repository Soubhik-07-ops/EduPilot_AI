"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h5v8H3v-8Zm7 4h11v4H10v-4Zm3-7h8v5h-8v-5Z" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l4 4h-3v6h-2V7H8l4-4Zm-7 9h2v6h10V12h2v8H5v-8Zm14-3a3 3 0 1 1 0 6h-2v-2h2a1 1 0 0 0 0-2h-1V9h1Z" />
      </svg>
    ),
  },
  {
    href: "/results",
    label: "Results",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16v2H4v-2Zm2-2H4V9h2v8Zm5 0H9V5h2v12Zm5 0h-2v-7h2v7Zm5 0h-2V3h2v14Z" />
      </svg>
    ),
  },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/results": "Results",
  "/analytics": "Analytics",
};

export default function Navbar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.brand} prefetch={false}>
        <span className={styles.brandIcon} aria-hidden="true">
          E
        </span>
        <span className={styles.brandText}>EduPilot AI</span>
      </Link>
      <nav aria-label="Primary" className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
          const linkClassName = isActive ? `${styles.link} ${styles.linkActive}` : styles.link;

          return (
            <Link key={item.href} href={item.href} className={linkClassName} prefetch={false}>
              <span className={styles.linkIcon}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <span className={styles.versionBadge}>v1.0</span>
      </div>
    </aside>
  );
}

export function PageHeader() {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "EduPilot AI";

  return (
    <header className={styles.topBar}>
      <div className={styles.pageTitleWrap}>
        <span className={styles.pageTitleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 12h6v8H4v-8Zm10-8h6v16h-6V4Zm-5 5h4v11H9V9Z" />
          </svg>
        </span>
        <p className={styles.breadcrumb}>EduPilot / {pageTitle}</p>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>
      <div className={styles.avatar} aria-label="User profile">
        EP
      </div>
    </header>
  );
}
