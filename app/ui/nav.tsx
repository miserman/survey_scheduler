import {AppBar, IconButton, Toolbar, Tooltip, Typography} from '@mui/material'
import {MainMenu} from './mainMenu'
import {ClientLog, type LogHistory} from './clientLog'
import {usePathname} from 'next/navigation'
import {ReceiptLong} from '@mui/icons-material'
import {useContext, useState} from 'react'
import {SessionContext} from '../context'
import dynamic from 'next/dynamic'

const ListLogs = dynamic(() => import('./logs'))

export function Nav({logEvents}: {logEvents: LogHistory}) {
  const path = usePathname()
  const study = path.split('/')[2] || ''
  const session = useContext(SessionContext)
  const [openLogs, setOpenLogs] = useState(false)
  return (
    <AppBar component="nav" sx={{zIndex: 1301, pl: 0.5}}>
      <Toolbar variant="dense" disableGutters>
        <MainMenu />
        <Typography sx={{flexGrow: 1, fontSize: '1.2em'}}>{study}</Typography>
        <ClientLog history={logEvents} />
        <Tooltip title="Server Logs" placement="left">
          <span>
            <IconButton onClick={() => setOpenLogs(!openLogs)} disabled={!session.signedin}>
              <ReceiptLong />
            </IconButton>
            {openLogs && <ListLogs study={study || 'sessions'} open={openLogs} onClose={() => setOpenLogs(false)} />}
          </span>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
