'use client'
import {Box, Typography} from '@mui/material'
import {useState} from 'react'
import {BottomDrawer} from '@/app/ui/bottomDrawer'
import {UserEditDialog} from '@/app/ui/editUsers'

const drawerHeight = '30vh'

export default function Study({params}: {params: {study: string}}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: drawerOpen ? drawerHeight : 0,
        right: 0,
        pb: '3em',
        transition: 'bottom 225ms cubic-bezier(0, 0, 0.2, 1)',
      }}
    >
      <Typography sx={{fontSize: '1.2em', position: 'fixed', top: 10, left: 50, zIndex: 1301}} noWrap>
        {params.study}
      </Typography>
      <BottomDrawer open={drawerOpen} setOpen={setDrawerOpen} height={drawerHeight}>
        <UserEditDialog study={params.study} />
      </BottomDrawer>
    </Box>
  )
}
