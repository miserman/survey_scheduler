import {AppBar, Toolbar, Typography} from '@mui/material'
import {MainMenu} from './mainMenu'
import {ClientLog, type LogHistory} from './clientLog'

export function Nav({logEvents}: {logEvents: LogHistory}) {
  return (
    <AppBar component="nav" sx={{zIndex: 1301, pl: 0.5}}>
      <Toolbar variant="dense" disableGutters>
        <MainMenu />
        <Typography sx={{flexGrow: 1}}></Typography>
        <ClientLog history={logEvents} />
      </Toolbar>
    </AppBar>
  )
}
