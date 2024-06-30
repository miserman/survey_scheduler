import {AppBar, Toolbar, Typography} from '@mui/material'
import {MainMenu} from './mainMenu'
import {ClientLog, type LogHistory} from './clientLog'
import {ListLogs} from './logs'
import {usePathname} from 'next/navigation'

export function Nav({logEvents}: {logEvents: LogHistory}) {
  const path = usePathname()
  const study = path.split('/')[2] || ''
  return (
    <AppBar component="nav" sx={{zIndex: 1301, pl: 0.5}}>
      <Toolbar variant="dense" disableGutters>
        <MainMenu />
        <Typography sx={{flexGrow: 1, fontSize: '1.2em'}}>{study}</Typography>
        <ClientLog history={logEvents} />
        <ListLogs study={study || 'sessions'} />
      </Toolbar>
    </AppBar>
  )
}
