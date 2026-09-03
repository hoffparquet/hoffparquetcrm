import "./globals.css";

export const metadata = {
  title: "Hoff Parquet CRM",
  description: "Internal CRM for Hoff Parquet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
