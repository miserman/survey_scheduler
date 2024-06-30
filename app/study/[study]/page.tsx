'use client'
import {Box, Stack, Typography} from '@mui/material'
import {useState} from 'react'
import {BottomDrawer} from '@/app/ui/bottomDrawer'
import {UserEditDialog} from '@/app/ui/editUsers'
import {ProtocolEditDialog} from '@/app/ui/editProtocols'

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
      <BottomDrawer open={drawerOpen} setOpen={setDrawerOpen} height={drawerHeight}>
        <Stack spacing={1} direction="row">
          <UserEditDialog study={params.study} />
          <ProtocolEditDialog study={params.study} />
        </Stack>
      </BottomDrawer>
    </Box>
  )
}
