import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from 'next-themes';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  openGraph: {
    title: "MirageCodex - The Infinite AI-Generated Library",
    description: "Discover and create infinite stories with AI. Browse existing books or generate new ones tailored to your imagination.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <div 
            className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800"
            style={{
              backgroundImage: 'url(/marble_texture.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
            }}
          >
            {/* Dark mode overlay */}
            <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-slate-900/95 to-slate-800/95" />
            
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
                          <p className="mb-2">
                            Discover and create infinite stories with AI. Browse existing books or generate new ones tailored to your imagination.
                          </p>
                          <p className="text-sm">
                            © 2024 MirageCodex. All books and authors are entirely fictional.
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
