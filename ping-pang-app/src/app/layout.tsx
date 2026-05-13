import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Ping Pang Paris | Training & Social",
  description: "Entraînement de suivi de progression et de connexion pour les joueurs de ping pong.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row' }}>
          <Sidebar />
          <div style={{ flex: 1, paddingBottom: '80px' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
