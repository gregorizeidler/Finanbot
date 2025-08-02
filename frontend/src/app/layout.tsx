import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'FinanBot - Assistente IA para Finanças Pessoais',
    template: '%s | FinanBot'
  },
  description: 'FinanBot te ajuda a entender, conversar e planejar seu dinheiro em tempo real, sem precisar de planilhas. Integração com Open Finance.',
  keywords: [
    'finanças pessoais',
    'open finance',
    'assistente financeiro',
    'IA',
    'chatbot',
    'gestão financeira',
    'controle de gastos',
    'orçamento'
  ],
  authors: [{ name: 'FinanBot Team' }],
  creator: 'FinanBot',
  publisher: 'FinanBot',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://finanbot.com',
    siteName: 'FinanBot',
    title: 'FinanBot - Assistente IA para Finanças Pessoais',
    description: 'Converse com seu dinheiro através de IA. Integração completa com Open Finance.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FinanBot - Assistente IA para Finanças Pessoais',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinanBot - Assistente IA para Finanças Pessoais',
    description: 'Converse com seu dinheiro através de IA. Integração completa com Open Finance.',
    images: ['/og-image.png'],
    creator: '@finanbot',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16a34a' },
    { media: '(prefers-color-scheme: dark)', color: '#16a34a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-background`}>
        <div id="root">
          {children}
        </div>
        <div id="modal-root" />
        <div id="toast-root" />
      </body>
    </html>
  )
} 