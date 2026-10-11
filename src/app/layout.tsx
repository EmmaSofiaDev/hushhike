import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HushHike // The Screenless 30-Second Wilderness Dispatcher",
  description:
    "An offline-first wilderness dispatcher that turns trail telemetry and solar sunset deadlines into an audio dispatch and a 3x5 tactile card, so hikers can keep their phone in their backpack and navigate by sound and natural landmarks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
