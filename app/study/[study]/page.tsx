'use client'
import {Box, Button, Stack, Typography} from '@mui/material'
import {useContext, useEffect, useMemo, useReducer, useState} from 'react'
import {BottomDrawer} from '@/app/ui/bottomDrawer'
import {FeedbackContext, SessionContext} from '@/app/context'
import {redirect} from 'next/navigation'
import dynamic from 'next/dynamic'
import {Participants, ParticipantSummary} from '@/lib/participant'
import {operation} from '@/utils/operation'
import {ParticipantFilter, defaultFilter, updateFilter} from '@/app/ui/participantFilter'
import Participant from '@/lib/participant'

const UserEditDialog = dynamic(() => import('@/app/ui/editUsers'))
const ProtocolEditDialog = dynamic(() => import('@/app/ui/editProtocols'))

const drawerHeight = '20vh'

export default function Study({params}: {params: {study: string}}) {
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [protocolOpen, setProtocolOpen] = useState(false)

  const [filter, setFilter] = useReducer(
    updateFilter,
    JSON.parse(JSON.stringify(defaultFilter)) as typeof defaultFilter
  )

  const [participants, setParticipants] = useState<Participants>({})
  const [summary, setSummary] = useState(new ParticipantSummary())
  useEffect(() => {
    if (session.signedin) {
      const requestParticipants = async () => {
        const req = await operation<Participants>({type: 'view_participant', study: params.study})
        if (req.error) {
          notify('failed to retrieve participants: ' + req.status)
        } else {
          setParticipants(req.content)
          const newSummary = new ParticipantSummary()
          const now = Date.now()
          Object.values(req.content).forEach(p => {
            const order = p.order_type.toLowerCase()
            if (p.last > now) newSummary.upcoming++
            if (order in newSummary.orders) {
              newSummary.orders[order]++
            } else {
              newSummary.orders[order] = 1
            }
            const protocolAdded: {[index: string]: boolean} = {}
            p.protocols.forEach(name => {
              if (!(name in protocolAdded)) {
                if (name in newSummary.protocols) {
                  newSummary.protocols[name]++
                } else {
                  newSummary.protocols[name] = 1
                }
              }
              protocolAdded[name] = true
            })
            if (newSummary.first.earliest > p.first) newSummary.first.earliest = p.first
            if (newSummary.first.latest < p.first) newSummary.first.latest = p.first
            if (newSummary.last.earliest > p.last) newSummary.last.earliest = p.last
            if (newSummary.last.latest < p.last) newSummary.last.latest = p.last
          })
          setSummary(newSummary)
          defaultFilter.protocols = Object.keys(newSummary.protocols)
          setFilter({type: 'update', key: 'protocols', value: defaultFilter.protocols})
        }
      }
      requestParticipants()
    }
  }, [session.signedin, params.study])

  const participantsDisplay = useMemo(
    () =>
      Object.keys(participants).map(id => {
        return {schedule: participants[id], display: <li key={id}>{id}</li>}
      }),
    [participants]
  )

  const includeParticipant = ({schedule}: {schedule: Participant}) => {
    const now = Date.now()
    let pass = true
    if (filter.id && !schedule.id.includes(filter.id)) pass = false
    if (pass && filter.upcoming && schedule.last < now) pass = false
    if (pass && filter.firstBeep_after && filter.firstBeep_after > schedule.first) pass = false
    if (pass && filter.firstBeep_before && filter.firstBeep_before < schedule.first) pass = false
    if (pass && filter.lastBeep_after && filter.lastBeep_after > schedule.last) pass = false
    if (pass && filter.lastBeep_before && filter.lastBeep_before < schedule.last) pass = false
    if (pass && filter.phone && !(schedule.phone + '').includes(filter.phone)) pass = false
    if (pass && (!filter.orders.length || !filter.orders.includes(schedule.order_type.toLowerCase()))) {
      pass = false
    }
    if (pass) {
      if (filter.protocols.length) {
        let any = false
        for (let i = schedule.protocols.length; i--; ) {
          if (filter.protocols.includes(schedule.protocols[i])) {
            any = true
            break
          }
        }
        if (!any) pass = false
      } else {
        pass = false
      }
    }
    return pass
  }
  const filteredParticipants = useMemo(() => {
    return participantsDisplay.filter(includeParticipant).map(({display}) => display)
  }, [participantsDisplay, filter])

  return session.signedin ? (
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
      <ul>{filteredParticipants}</ul>
      <BottomDrawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        height={drawerHeight}
        filter={<ParticipantFilter filter={filter} filterAction={setFilter} summary={summary} />}
      >
        <Stack spacing={1} direction="row" sx={{pl: 1, width: '100%', justifyContent: 'space-between'}}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => setUserOpen(true)}>
              Participants
            </Button>
            <Typography className="note" sx={{alignSelf: 'center'}}>
              {filteredParticipants.length + ' / ' + participantsDisplay.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => setUserOpen(true)}>
              Users
            </Button>
            <Button variant="contained" onClick={() => setProtocolOpen(true)}>
              Protocols
            </Button>
          </Stack>
        </Stack>
      </BottomDrawer>
      {userOpen && <UserEditDialog study={params.study} open={userOpen} onClose={() => setUserOpen(false)} />}
      {protocolOpen && (
        <ProtocolEditDialog study={params.study} open={protocolOpen} onClose={() => setProtocolOpen(false)} />
      )}
    </Box>
  ) : (
    redirect('/')
  )
}
