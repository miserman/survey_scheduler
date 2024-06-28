import {AppBar, Box, Button, Card, CardContent, Drawer, Toolbar} from '@mui/material'
import type {ReactNode} from 'react'

export function BottomDrawer({
  open,
  setOpen,
  height,
  children,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  height: string
  children: ReactNode
}) {
  return (
    <>
      <AppBar sx={{position: 'absolute', bottom: 0, left: 0, right: 0, top: 'initial', height: '4em', pl: 2, pr: 2}}>
        <Toolbar disableGutters sx={{justifyContent: 'space-between'}}>
          <Button variant="outlined" onClick={() => setOpen(!open)}>
            Filter
          </Button>
          <Box>{children}</Box>
        </Toolbar>
      </AppBar>
      <Drawer anchor="bottom" open={open} variant="persistent" hideBackdrop={true}>
        <Card sx={{height}}>
          <CardContent></CardContent>
        </Card>
      </Drawer>
    </>
  )
}
