import "./globals.css";
import InstallApp from "./components/InstallApp";

export const metadata = {
  title: "FC Kindmark",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable: true, title: "FC Kindmark", statusBarStyle: "default"},
  icons: {icon: "/icons/app-192.png", apple: "/icons/apple-touch-icon.png"},
  description: "FC Kindmarks klubbportal för spelare, föräldrar och tränare",
};

export const viewport = {width: "device-width", initialScale: 1, themeColor: "#dfbc4d"};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body className="min-h-full flex flex-col">{children}<InstallApp/></body>
    </html>
  );
}