import type {Metadata} from 'next'
import './globals.css'
import {StrictMode} from 'react'
import {Context} from './context'

export const metadata: Metadata = {
  icons: 'icon.png',
  title: 'Survey Scheduler',
  description: 'Schedule experience sampling surveys.',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <StrictMode>
          <Context>{children}</Context>
        </StrictMode>
      </body>
    </html>
  )
}
