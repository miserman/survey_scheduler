import Schedule, {statusLabels} from '@/lib/schedule'
import {Add, Casino, Close, Delete} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import {TimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {useMemo, useReducer, useState} from 'react'
import {EditBlackout} from './editBlackout'
import type {Blackout} from '@/lib/blackout'
import type {Protocol, Protocols} from '@/lib/protocol'

type EditScheduleAction =
  | {type: 'add'}
  | {type: 'remove'; index: number}
  | {type: 'edit'; key: 'times' | 'statuses'; value: number[]}
  | {type: 'edit'; key: 'protocol'; value: string}
  | {type: 'add_blackout'; blackout: Partial<Blackout>}
  | {type: 'remove_blackout'; index: number}
  | {type: 'edit_blackout'; index: number; blackout: Partial<Blackout>}
  | {type: 'replace'; schedule: Schedule}
  | {type: 'reroll'; schedule: Schedule; protocol: Protocol}
function updateSchedule(state: Schedule, action: EditScheduleAction) {
  if (action.type === 'replace') return new Schedule(action.schedule)
  if (action.type === 'reroll') return action.schedule.copy(action.protocol)
  const newState = new Schedule(state)
  switch (action.type) {
    case 'add':
      newState.addBeep()
      break
    case 'remove':
      newState.removeBeep(action.index)
      break
    case 'edit':
      ;(newState[action.key] as typeof action.value) = action.value
      break
    case 'add_blackout':
      newState.addBlackout(action.blackout)
      break
    case 'remove_blackout':
      newState.removeBlackout(action.index)
      break
    case 'edit_blackout':
      newState.setBlackout(action.index, action.blackout)
      break
  }
  return newState
}

function StatusSelect({current, onChange}: {current: number; onChange: (status: number) => void}) {
  const options = useMemo(
    () =>
      statusLabels.map(label => (
        <MenuItem key={label} value={label}>
          {label}
        </MenuItem>
      )),
    []
  )
  return (
    <FormControl>
      <InputLabel id="status_edit_select">Status</InputLabel>
      <Select
        sx={{width: 160}}
        labelId="status_edit_select"
        label="Status"
        size="small"
        value={statusLabels[current]}
        onChange={e => {
          if ('value' in e.target) onChange(statusLabels.indexOf(e.target.value))
        }}
      >
        {options}
      </Select>
    </FormControl>
  )
}

export function EditSchedule({
  initial,
  protocols,
  onRemove,
  onUpdate,
}: {
  initial: Schedule
  protocols: Protocols
  onRemove: () => void
  onUpdate: (schedule: Schedule) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  const [schedule, setSchedule] = useReducer(updateSchedule, new Schedule(initial))
  const [current, setCurrent] = useState('')
  useMemo(() => {
    setSchedule({type: 'replace', schedule: initial})
    setCurrent(JSON.stringify(new Schedule(initial)))
  }, [initial])
  const [changed, setChanged] = useState(false)
  const updateState = (action: EditScheduleAction) => {
    setSchedule(action)
    if (action.type === 'replace') {
      setCurrent(JSON.stringify(new Schedule(action.schedule)))
      setChanged(false)
    } else {
      const tempSchedule = new Schedule(schedule)
      if (action.type === 'edit') {
        ;(tempSchedule[action.key as keyof Schedule] as typeof action.value) = action.value
      } else if (action.type === 'remove') {
        tempSchedule.removeBeep(action.index)
      } else {
        tempSchedule.addBeep()
      }
      setChanged(current !== JSON.stringify(tempSchedule))
    }
  }
  const times = schedule.times.map(time => dayjs(time))
  const date = dayjs(schedule.date).format('dddd, MMMM D YYYY')
  const reroll = () => updateState({type: 'reroll', schedule, protocol: protocols[schedule.protocol]})
  return (
    <>
      <Button size="small" variant="outlined" onClick={toggleMenu}>
        Edit
      </Button>
      {menuOpen && (
        <Dialog open={menuOpen} onClose={toggleMenu}>
          <DialogTitle sx={{p: 1}}>{date}</DialogTitle>
          <IconButton
            aria-label="close day schedule editor"
            onClick={toggleMenu}
            sx={{
              position: 'absolute',
              right: 3,
              top: 3,
            }}
            className="close-button"
          >
            <Close />
          </IconButton>
          <DialogContent sx={{p: 0}}>
            <FormControl fullWidth sx={{p: 1}}>
              <InputLabel sx={{p: 1}} id="day_protocol_select">
                Protocol
              </InputLabel>
              <Select
                labelId="day_protocol_select"
                label="Protocol"
                size="small"
                value={schedule.protocol}
                onChange={e => {
                  const value = e.target.value
                  schedule.protocol = value
                  updateState({type: 'reroll', schedule, protocol: protocols[value]})
                }}
              >
                {Object.keys(protocols).map(name => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Toolbar sx={{pl: 1, minHeight: '1px !important'}} disableGutters>
              <Typography variant="h6">Beeps</Typography>
              <IconButton title="Add beep" sx={{width: 40}} onClick={() => updateState({type: 'add'})}>
                <Add />
              </IconButton>
            </Toolbar>
            <Stack spacing={1} sx={{p: 1, pt: 2, mb: 1, bgcolor: 'background.paper'}}>
              {times.map((time, index) => (
                <Stack key={index} spacing={1} direction="row">
                  <TimePicker
                    label="Time"
                    sx={{maxWidth: 140, '& input': {p: 1}}}
                    value={time}
                    onChange={time => {
                      if (time) {
                        const value = [...schedule.times]
                        value[index] = time.valueOf()
                        updateState({type: 'edit', key: 'times', value})
                      }
                    }}
                  />
                  <StatusSelect
                    current={schedule.statuses[index]}
                    onChange={(status: number) => {
                      const value = [...schedule.statuses]
                      value[index] = status
                      updateState({type: 'edit', key: 'statuses', value})
                    }}
                  />
                  <IconButton color="error" onClick={() => updateState({type: 'remove', index})}>
                    <Delete />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Toolbar sx={{pl: 1, minHeight: '1px !important'}} disableGutters>
              <Typography variant="h6">Blackouts</Typography>
              <IconButton
                title="Add Blackout"
                sx={{width: 40}}
                onClick={() => updateState({type: 'add_blackout', blackout: {start: schedule.date}})}
              >
                <Add />
              </IconButton>
            </Toolbar>
            <Stack spacing={1} sx={{mb: 2}}>
              {schedule.blackouts.length ? (
                schedule.blackouts.map((blackout, index) => (
                  <EditBlackout
                    key={index}
                    blackout={blackout}
                    onRemove={() => updateState({type: 'remove_blackout', index})}
                    onUpdate={(blackout: Blackout) => updateState({type: 'edit_blackout', index, blackout})}
                    format="hh:mm A"
                    isTime={true}
                  />
                ))
              ) : (
                <Chip disabled label="No Blackout Times" />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{justifyContent: 'space-between'}}>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                onRemove()
                toggleMenu()
              }}
            >
              Delete
            </Button>
            <Box>
              <IconButton onClick={reroll}>
                <Casino />
              </IconButton>
              <Button
                disabled={!changed}
                onClick={() => {
                  updateState({type: 'replace', schedule: initial})
                }}
              >
                Reset
              </Button>
              <Button
                disabled={!changed}
                variant="contained"
                onClick={() => {
                  onUpdate(schedule)
                  toggleMenu()
                }}
              >
                Update
              </Button>
            </Box>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
