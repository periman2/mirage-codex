import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from 'next-themes';

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "MirageCodex - The Infinite AI-Generated Library",
  description: "Discover and create infinite stories with AI. Browse existing books or generate new ones tailored to your imagination.",
  keywords: ["AI", "books", "literature", "fiction", "library", "reading"],
  authors: [{ name: "MirageCodex" }],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "MirageCodex - The Infinite AI-Generated Library",
    description: "Discover and create infinite stories with AI. Browse existing books or generate new ones tailored to your imagination.",
    type: "website",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfairDisplay.variable} ${jetbrainsMono.variable} font-serif antialiased min-h-screen`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem={false}
          disableTransitionOnChange
        >
          <div 
            className="min-h-screen bg-gradient-to-r from-gray-100 via-white to-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800"
          >
            {/* Dark mode overlay */}
            <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-amber-950/95 to-yellow-950/95" />
            
            <div className="relative z-10">
              <QueryProvider>
                <AuthProvider>
                  <div className="flex flex-col min-h-screen">
                    <Navbar />

                    <main className="flex-1">
                      {children}
                    </main>

                    <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                      <div className="container mx-auto px-4 py-8">
                        <div className="text-center text-slate-600 dark:text-slate-400">
                          <p className="text-sm">
                            © {new Date().getFullYear()} MirageCodex. All books and authors are entirely fictional.
                          </p>
                        </div>
                      </div>
                    </footer>
                  </div>

                  <Toaster />
                </AuthProvider>
              </QueryProvider>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
