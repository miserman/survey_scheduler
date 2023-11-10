'use client'
import {
  createTheme,
  useMediaQuery,
  Stack,
  Box,
  Drawer,
  Typography,
  Button,
  TextField,
  FormGroup,
  Tooltip,
  Switch,
  FormControlLabel,
  FormControl,
  FormLabel,
  Grid,
  Paper,
} from '@mui/material'
import {useState, useMemo, useRef, forwardRef, SyntheticEvent} from 'react'
import {ThemeProvider} from '@emotion/react'
import {sizing, palette} from './params'
import {makeNav} from './nav'
import {AddEdit} from './addEdit'
import Timeline from './timeline'
import {makeSearch} from './search'

const Nav = forwardRef(makeNav)
const Search = forwardRef(makeSearch)

export default function Study({params}: {params: {slug: string}}) {
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
  const [menuOpen, setMenu] = useState(false)
  const [addEditOpen, setEditOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)
  const [leftAdjust, shiftLeft] = useState(0)
  const navElement = useRef<HTMLDivElement>(null)
  const topAdjust = navElement.current?.clientHeight || 48
  const [searchOpen, setSearch] = useState(false)
  const searchElement = useRef<HTMLDivElement>(null)
  const searchAdjust = searchElement.current
    ? searchElement.current.clientHeight - sizing.searchBarHeight
    : sizing.searchBarHeight
  const setSearchDrawer = () => {
    setSearch(!searchOpen)
  }
  const openMenu = () => {
    shiftLeft(sizing.menuWidth)
    setMenu(true)
  }
  const closeMenu = () => {
    shiftLeft(0)
    setMenu(false)
  }
  const openAddEdit = () => {
    setEditOpen(true)
  }
  const closeAddEdit = () => {
    setEditOpen(false)
  }
  const showAddEditTab = (e: SyntheticEvent | undefined, which: number) => {
    setCurrentTab(which)
  }
  return (
    <ThemeProvider theme={theme}>
      <Nav
        study={params.slug}
        gutterSize={sizing.leftGutter}
        openMenu={openMenu}
        openAddEdit={openAddEdit}
        ref={navElement}
      />
      <Drawer
        sx={{
          '& .MuiDrawer-paper': {
            p: 1,
            width: sizing.menuWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        open={menuOpen}
        onClose={closeMenu}
      >
        <Box sx={{marginBottom: 1}}>
          <Button onClick={closeMenu} variant="outlined" fullWidth>
            Close
          </Button>
        </Box>
        <Button>sign out</Button>
        <Button>change study</Button>
        <Typography variant="h5">Data</Typography>
        <Button>rescan</Button>
        <Button>export</Button>
        <Button>logs</Button>
        <Typography variant="h6">Options</Typography>
        <Grid container spacing={1}>
          <Grid sx={{width: '100%'}} item>
            <FormControl fullWidth>
              <FormControlLabel
                label="Dark"
                control={
                  <Switch
                    checked={theme.palette.mode === 'dark'}
                    onChange={() => setPaletteMode(theme.palette.mode === 'dark' ? 'light' : 'dark')}
                  />
                }
              />
            </FormControl>
          </Grid>
          <Grid item>
            <Tooltip placement="right" title="Resolution of the timeline; increase to see more distant beeps.">
              <TextField size="small" type="number" label="time scale" defaultValue="1" fullWidth />
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip
              placement="right"
              title="Number of days before and after the current time to show schedules, based on their first and last beep."
            >
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{marginBottom: 1}}>
                  Day Range
                </FormLabel>
                <FormGroup sx={{flexWrap: 'nowrap'}} row>
                  <TextField size="small" type="number" defaultValue="1" label="first" sx={{marginRight: 1}} />
                  <TextField size="small" type="number" defaultValue="1" label="last" />
                </FormGroup>
              </FormControl>
            </Tooltip>
          </Grid>
        </Grid>
        <Button variant="outlined" sx={{marginTop: 5}} color="error">
          Clear Storage
        </Button>
      </Drawer>
      <AddEdit open={addEditOpen} close={closeAddEdit} tab={currentTab} changeTab={showAddEditTab} />
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
    </ThemeProvider>
  )
}
