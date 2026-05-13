import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
