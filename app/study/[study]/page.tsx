'use client'
import {Box, Button, Stack, Typography} from '@mui/material'
import {forwardRef, useContext, useEffect, useMemo, useReducer, useRef, useState} from 'react'
import {BottomDrawer} from '@/app/ui/bottomDrawer'
import {FeedbackContext, SessionContext} from '@/app/context'
import {redirect} from 'next/navigation'
import dynamic from 'next/dynamic'
import {Participants, ParticipantSummary} from '@/lib/participant'
import {operation} from '@/utils/operation'
import {ParticipantFilter, defaultFilter, updateFilter} from '@/app/ui/participantFilter'
import Participant from '@/lib/participant'
import {Protocols} from '@/lib/protocol'

const ParticipantEditDialog = dynamic(() => import('@/app/ui/editParticipant'))
const UserEditDialog = dynamic(() => import('@/app/ui/editUsers'))
const ProtocolEditDialog = dynamic(() => import('@/app/ui/editProtocols'))

export default function Study({params}: {params: {study: string}}) {
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [participantOpen, setParticipantOpen] = useState(false)
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
          const newParticipants: Participants = {}
          Object.keys(req.content).forEach(id => {
            newParticipants[id] = new Participant(req.content[id])
          })
          setParticipants(newParticipants)
          const newSummary = new ParticipantSummary()
          const now = Date.now()
          Object.values(newParticipants).forEach(p => {
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

  const [protocols, setProtocols] = useState<Protocols>({})
  useEffect(() => {
    if (session.signedin) {
      const getProtocols = async () => {
        const req = await operation<Protocols>({type: 'view_protocol', study: params.study})
        if (req.error) {
          notify('failed to retrieve protocols: ' + req.status)
        } else {
          setProtocols(req.content)
        }
      }
      getProtocols()
    }
  }, [session.signedin, notify, params.study])

  const participantsDisplay = useMemo(
    () =>
      Object.keys(participants).map(id => {
        return {schedule: participants[id], display: <li key={id}>{id}</li>}
      }),
    [participants]
  )

  const includeParticipant = ({schedule}: {schedule: Participant}) => {
    const now = Date.now()
    if (filter.upcoming && schedule.last < now) return false
    if (filter.id && !schedule.id.includes(filter.id)) return false
    if (filter.firstBeep_after && filter.firstBeep_after > schedule.first) return false
    if (filter.firstBeep_before && filter.firstBeep_before < schedule.first) return false
    if (filter.lastBeep_after && filter.lastBeep_after > schedule.last) return false
    if (filter.lastBeep_before && filter.lastBeep_before < schedule.last) return false
    if (filter.phone && !(schedule.phone + '').includes(filter.phone)) return false
    if (!filter.orders.length || !filter.orders.includes(schedule.order_type.toLowerCase())) {
      return false
    }
    if (filter.protocols.length) {
      let any = false
      for (let i = schedule.protocols.length; i--; ) {
        if (filter.protocols.includes(schedule.protocols[i])) {
          any = true
          break
        }
      }
      if (!any) return false
    } else {
      return false
    }
    return true
  }
  const filteredParticipants = useMemo(() => {
    return participantsDisplay.filter(includeParticipant).map(({display}) => display)
  }, [participantsDisplay, filter])

  const Drawer = forwardRef(BottomDrawer)
  const drawerElement = useRef<HTMLDivElement>(null)
  const drawerHeight = drawerElement.current ? drawerElement.current.clientHeight - 4 : 0

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
      <Drawer
        open={drawerOpen}
        setOpen={setDrawerOpen}
        ref={drawerElement}
        filter={<ParticipantFilter filter={filter} filterAction={setFilter} summary={summary} />}
      >
        <Stack spacing={1} direction="row" sx={{pl: 1, width: '100%', justifyContent: 'space-between'}}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => setParticipantOpen(true)}>
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
      </Drawer>
      <ParticipantEditDialog
        open={participantOpen}
        onClose={() => setParticipantOpen(false)}
        study={params.study}
        currentParticipants={participants}
        updateParticipants={newParticipants => setParticipants(newParticipants)}
        protocols={protocols}
      />
      <UserEditDialog study={params.study} open={userOpen} onClose={() => setUserOpen(false)} />
      <ProtocolEditDialog
        study={params.study}
        open={protocolOpen}
        onClose={() => setProtocolOpen(false)}
        currentProtocols={protocols}
        setCurrentProtocols={(protocols: Protocols) => setProtocols(protocols)}
      />
    </Box>
  ) : (
    redirect('/')
  )
}
