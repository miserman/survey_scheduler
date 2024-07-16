'use client'
import {createContext, useCallback, useEffect, useMemo, useReducer, useState, type ReactNode} from 'react'
import type {SessionStatus} from '../lib/sessions'
import {MS_HOUR} from '@/utils/times'
import {Box, Container, CssBaseline, ThemeProvider, createTheme, useMediaQuery} from '@mui/material'
import {Nav} from './ui/nav'
import Feedback from './ui/feedback'
import type {LogHistory} from './ui/clientLog'

export const SessionContext = createContext<SessionStatus>({signedin: false, expires: Date.now()})
export const FeedbackContext = createContext((message: string, noFeedback?: boolean) => {})
export const PaletteModeContext = createContext(() => {})
const palette = {
  primary: {
    main: '#a875e2',
  },
  secondary: {
    main: '#afe275',
  },
  error: {
    main: '#ec7187',
  },
  warning: {
    main: '#e2a875',
  },
  info: {
    main: '#797979',
  },
  success: {
    main: '#7579e2',
  },
}

function pushEvent(state: LogHistory, message: string) {
  return [{time: new Date().toLocaleTimeString(), message}, ...state]
}

const timers: {[index: string]: number | NodeJS.Timeout} = {feedback: -1}
export function Context({children}: {children: ReactNode}) {
  const [logEvents, setLogEvents] = useReducer(pushEvent, [])

  const [session, setSession] = useState<SessionStatus>({signedin: false, expires: Date.now()})
  useEffect(() => {
    const maintainSession = () =>
      fetch('/session').then(async status => {
        const req = status.json()
        req.catch(e => console.error(e))
        const res = await req
        if (res.signedin) setLogEvents('established session')
        setSession(res)
      })
    const timer = setInterval(maintainSession, MS_HOUR - 5e4)
    maintainSession()
    return () => clearInterval(timer)
  }, [])

  const [feedback, setFeedback] = useState('')
  const clearFeedback = () => {
    clearTimeout(timers.feedback)
    setFeedback('')
  }
  const notify = useCallback((message: string, noFeedback?: boolean) => {
    if (!noFeedback) {
      clearTimeout(timers.feedback)
      setFeedback(message)
      timers.feedback = setTimeout(clearFeedback, 7000)
    }
    setLogEvents(message)
  }, [])

  const paletteDefaultDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [paletteMode, setPaletteMode] = useState<'auto' | 'dark' | 'light'>('dark')
  useEffect(() => {
    if ('undefined' !== typeof window) {
      setPaletteMode((localStorage.getItem('survey_scheduler_mode') as 'auto') || 'auto')
    }
  }, [setPaletteMode])
  const darkMode = (paletteMode === 'auto' && paletteDefaultDark) || paletteMode === 'dark'
  const paletteModeToggler = () => {
    const mode = darkMode ? 'light' : 'dark'
    localStorage.setItem('survey_scheduler_mode', mode)
    setPaletteMode(mode)
  }
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          ...palette,
        },
      }),
    [darkMode]
  )

  return (
    <SessionContext.Provider value={session}>
      <FeedbackContext.Provider value={notify}>
        <PaletteModeContext.Provider value={paletteModeToggler}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Container>
              <Nav logEvents={logEvents} />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  mt: '3em',
                }}
              >
                {children}
              </Box>
            </Container>
            <Feedback message={feedback} clearMessage={clearFeedback} />
          </ThemeProvider>
        </PaletteModeContext.Provider>
      </FeedbackContext.Provider>
    </SessionContext.Provider>
  )
}
