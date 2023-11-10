'use client'
import {createTheme, useMediaQuery} from '@mui/material'
import {useState, useMemo} from 'react'
import {ThemeProvider} from '@emotion/react'
import {palette} from './study/params'
import Link from 'next/link'

export default function Home() {
  const paletteDefaultDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [paletteMode, setPaletteMode] = useState<'auto' | 'dark' | 'light'>('auto')
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: (paletteMode === 'auto' && paletteDefaultDark) || paletteMode === 'dark' ? 'dark' : 'light',
          ...palette,
        },
      }),
    [paletteDefaultDark, paletteMode]
  )
  return (
    <ThemeProvider theme={theme}>
      <Link href="/study">Demo Study</Link>
    </ThemeProvider>
  )
}
