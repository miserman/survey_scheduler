import {ReactNode, createContext, useReducer, useContext, useMemo, useState} from 'react'
import type {Protocol, User} from './types'
import {ThemeProvider, createTheme, useMediaQuery} from '@mui/material'
import {palette} from './params'

type Themes = 'system' | 'dark' | 'light'
const ThemeSetter = createContext((theme: Themes) => {})
export const ThemeContext = ({children}: {children: ReactNode}) => {
  const paletteDefaultDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [currentTheme, setCurrentTheme] = useState<Themes>('system')
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: (currentTheme === 'system' && paletteDefaultDark) || currentTheme === 'dark' ? 'dark' : 'light',
          ...palette,
        },
      }),
    [paletteDefaultDark, currentTheme]
  )
  return (
    <ThemeProvider theme={theme}>
      <ThemeSetter.Provider value={setCurrentTheme}>{children}</ThemeSetter.Provider>
    </ThemeProvider>
  )
}
export const useThemeSetter = () => useContext(ThemeSetter)

// dialog states

// const defaultDialogState = {participant: false, protocol: false, user: false}
// const DialogStateContext = createContext(defaultDialogState)
// type DialogAction = {key: keyof typeof defaultDialogState; value: boolean}
// const DialogStateSetterContext = createContext(({key, value}: DialogAction) => {})

// const editDialogState = (state: typeof defaultDialogState, action: DialogAction) => {
//   const newState = {...state}
//   newState[action.key] = action.value
//   return newState
// }

// export const useDialogState = () => useContext(DialogStateContext)
// export const useDialogStateSetter = () => useContext(DialogStateSetterContext)

// export const DialogContext = ({children}: {children: ReactNode}) => {
//   const [dialogState, setDialogState] = useReducer(editDialogState, defaultDialogState)
//   return (
//     <DialogStateContext.Provider value={dialogState}>
//       <DialogStateSetterContext.Provider value={setDialogState}>{children}</DialogStateSetterContext.Provider>
//     </DialogStateContext.Provider>
//   )
// }

export const protocols: {[index: string]: Partial<Protocol>} = {
  New: {},
  signal: {
    name: 'signal',
    color: '#ffcccc',
    beeps: 6,
    minsep: 30,
    random_start: true,
    randomization: 'binned',
    reminder_after: 10,
    close_after: 30,
    accesses: 1,
    initial_message: 'Please complete this survey within 30 minutes:',
    reminder_message: 'Reminder: complete your survey within 20 minutes.',
    reminder_link: true,
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
  event: {
    name: 'event',
    color: '#83f0ff',
    beeps: 1,
    offset: 15,
    randomization: 'none',
    initial_message: 'Please complete this survey after any study-relevant event:',
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
}

// user permission data

export const users: {[index: string]: User} = {
  New: {
    email: '',
    view_study: true,
    view_participant: false,
    view_protocol: true,
    view_user: false,
    view_log: false,
    add_study: false,
    add_participant: false,
    add_protocol: false,
    add_user: false,
    add_log: false,
    remove_study: false,
    remove_participant: false,
    remove_protocol: false,
    remove_user: false,
    remove_log: false,
  },
}
