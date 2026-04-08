import type { Metadata } from "next";
import Navbar, { PageHeader } from "@/components/Navbar/Navbar";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "EduPilot AI",
  description: "Minimal education workflow dashboard built with Next.js",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <Navbar />
          <div className="mainPane">
            <PageHeader />
            <main className="contentArea">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
