import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Outreach Automation",
  description: "Internal University Outreach Automation Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
