import type {Metadata} from 'next'
import './globals.css'

export const metadata: Metadata = {
  icons: 'icon.png',
  title: 'Survey Scheduler',
  description: 'Schedule experience sampling surveys.',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
