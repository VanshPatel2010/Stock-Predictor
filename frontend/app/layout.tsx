import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Predictor",
  description: "Realtime stock dashboard with LSTM-powered forecasts"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

