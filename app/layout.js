import "./globals.css";

export const metadata = {
  title: "Yashraj Tyres & Alloy Wheels",
  description:
    "Yashraj Tyres & Alloy Wheels - Latur's premium destination for tyres and alloy wheels.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yashraj Tyres"
  },
  icons: {
    apple: "/icon.svg",
    icon: "/icon.svg"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d4a843"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
