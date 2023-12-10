import {AppBar, Toolbar, Button} from '@mui/material'
import React, {Ref, useState} from 'react'
import {UsersMenu} from './components/users'
import {GUTTER_LEFT} from './params'
import {SideMenu} from './components/side'
import {ProtocolsMenu} from './components/protocols'
import {ParticipantsMenu} from './components/participants'

export const makeNav = ({study}: {study: string}, ref: Ref<HTMLDivElement>) => {
  const [sideOpen, setSideOpen] = useState(false)
  const [participantOpen, setParticipantOpen] = useState(false)
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  return (
    <>
      <AppBar ref={ref} component="nav" position="static">
        <Toolbar variant="dense">
          <Button sx={{width: GUTTER_LEFT + 'px'}} onClick={() => setSideOpen(true)}>
            Menu
          </Button>
          <Button sx={{flexGrow: 1}} href="../">
            {study}
          </Button>
          <Button onClick={() => setParticipantOpen(true)}>Participants</Button>
          <Button onClick={() => setProtocolOpen(true)}>Protocols</Button>
          <Button onClick={() => setUserOpen(true)}>Users</Button>
        </Toolbar>
      </AppBar>
      <SideMenu isOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <ParticipantsMenu isOpen={participantOpen} onClose={() => setParticipantOpen(false)} />
      <ProtocolsMenu isOpen={protocolOpen} onClose={() => setProtocolOpen(false)} />
      <UsersMenu isOpen={userOpen} onClose={() => setUserOpen(false)} />
    </>
  )
}
