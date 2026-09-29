import "./globals.css";

export const metadata = {
  title: "Hoff Parquet CRM",
  description: "Internal CRM for Hoff Parquet",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
