'use client'
import {createTheme, useMediaQuery, Box, Paper, ThemeProvider} from '@mui/material'
import {useState, useMemo, useRef, forwardRef, ReactNode, useContext, createContext} from 'react'
import {SEARCH_BAR_HEIGHT, palette} from './params'
import {makeNav} from './menus'
import Timeline from './timeline'
import {makeSearch} from './search'
import {LocalizationProvider} from '@mui/x-date-pickers'
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs'

const Nav = forwardRef(makeNav)
const Search = forwardRef(makeSearch)

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
        components: {
          // MuiInputLabel: {
          //   styleOverrides: {
          //     root: {
          //       transform: 'translate(7px, 2px) scale(1)',
          //     },
          //   },
          // },
          // MuiOutlinedInput: {
          //   styleOverrides: {
          //     root: {
          //       '& .MuiOutlinedInput-input': {
          //         paddingTop: 2,
          //         paddingLeft: 7,
          //         paddingBottom: 2,
          //         paddingRight: 7,
          //       },
          //     },
          //   },
          // },
        },
      }),
    [paletteDefaultDark, currentTheme]
  )
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <ThemeSetter.Provider value={setCurrentTheme}>{children}</ThemeSetter.Provider>
      </ThemeProvider>
    </LocalizationProvider>
  )
}
export const useThemeSetter = () => useContext(ThemeSetter)

export default function Study({params}: {params: {slug: string}}) {
  // const paletteDefaultDark = useMediaQuery('(prefers-color-scheme: dark)')
  // const [paletteMode, setPaletteMode] = useState<'auto' | 'dark' | 'light'>('auto')
  // const theme = useMemo(
  //   () =>
  //     createTheme({
  //       palette: {
  //         mode: (paletteMode === 'auto' && paletteDefaultDark) || paletteMode === 'dark' ? 'dark' : 'light',
  //         ...palette,
  //       },
  //     }),
  //   [paletteDefaultDark, paletteMode]
  // )
  const [leftAdjust, shiftLeft] = useState(0)
  const navElement = useRef<HTMLDivElement>(null)
  const topAdjust = navElement.current?.clientHeight || 48
  const [searchOpen, setSearch] = useState(false)
  const searchElement = useRef<HTMLDivElement>(null)
  const searchAdjust = searchElement.current
    ? searchElement.current.clientHeight - SEARCH_BAR_HEIGHT
    : SEARCH_BAR_HEIGHT
  const setSearchDrawer = () => {
    setSearch(!searchOpen)
  }
  return (
    <ThemeContext>
      <Nav study={params.slug} ref={navElement} />
      <Paper
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          flexDirection: 'row',
          marginTop: topAdjust + 'px',
          marginLeft: leftAdjust + 'px',
          marginBottom: (searchOpen ? searchAdjust : 0) + 'px',
          transition: 'margin 225ms',
        }}
      >
        <Box component="main" sx={{p: 0}}>
          <Timeline />
        </Box>
        <Search searchAdjust={searchAdjust} setSearchDrawer={setSearchDrawer} ref={searchElement} />
      </Paper>
    </ThemeContext>
  )
}
