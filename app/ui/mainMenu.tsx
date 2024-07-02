import {Close, DarkMode, LightMode, Menu} from '@mui/icons-material'
import {Button, Card, CardActions, CardContent, CardHeader, Drawer, IconButton, Stack, useTheme} from '@mui/material'
import {useContext, useState} from 'react'
import {useRouter} from 'next/navigation'
import {PaletteModeContext, SessionContext} from '../context'

export function MainMenu() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  const theme = useTheme()
  const togglePaletteMode = useContext(PaletteModeContext)
  const session = useContext(SessionContext)
  const signio = session.signedin ? 'out' : 'in'
  return (
    <>
      <IconButton onClick={toggleMenu} aria-label="open main menu">
        <Menu />
      </IconButton>
      {menuOpen && (
        <Drawer anchor="left" open={menuOpen} onClose={toggleMenu} sx={{zIndex: 1303}}>
          <Card sx={{height: '100%', display: 'contents'}} elevation={5}>
            <CardHeader
              title="Menu"
              action={
                <IconButton onClick={toggleMenu} aria-label="close main menu" className="close-button">
                  <Close />
                </IconButton>
              }
            ></CardHeader>
            <CardContent sx={{mb: 'auto'}}>
              <Stack spacing={2}>
                <Button variant="contained" onClick={() => (window.location.href = '/sign' + signio)}>
                  {'sign ' + signio}
                </Button>
                <Button
                  onClick={() => {
                    router.push('/')
                    toggleMenu()
                  }}
                  variant="contained"
                  disabled={window.location.pathname === '/'}
                >
                  Change Study
                </Button>
              </Stack>
            </CardContent>
            <CardActions>
              <IconButton
                title={'switch to ' + (theme.palette.mode === 'dark' ? 'light' : 'dark') + ' mode'}
                onClick={togglePaletteMode}
              >
                {theme.palette.mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </CardActions>
          </Card>
        </Drawer>
      )}
    </>
  )
}
