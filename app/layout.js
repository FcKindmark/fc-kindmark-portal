import "./globals.css";

export const metadata = {
  title: "FC Kindmark",
  description: "FC Kindmarks klubbportal för spelare, föräldrar och tränare",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}