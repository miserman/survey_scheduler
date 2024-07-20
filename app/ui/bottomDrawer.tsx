import {AppBar, Button, Card, CardContent, Drawer, Toolbar} from '@mui/material'
import type {ReactNode, Ref} from 'react'

export function BottomDrawer(
  {
    open,
    setOpen,
    filter,
    children,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    filter: ReactNode
    children: ReactNode
  },
  ref: Ref<HTMLDivElement>
) {
  return (
    <>
      <AppBar sx={{position: 'absolute', bottom: 0, left: 0, right: 0, top: 'initial', height: '4em', pl: 2, pr: 2}}>
        <Toolbar disableGutters>
          <Button variant="outlined" onClick={() => setOpen(!open)}>
            Filter
          </Button>
          {children}
        </Toolbar>
      </AppBar>
      <Drawer anchor="bottom" open={open} variant="persistent" hideBackdrop={true}>
        <Card ref={ref}>
          <CardContent>{filter}</CardContent>
        </Card>
      </Drawer>
    </>
  )
}
