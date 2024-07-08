import Schedule, {statusLabels} from '@/lib/schedule'
import {Add, Close, Delete} from '@mui/icons-material'
import {
  Box,
  Button,
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
} from '@mui/material'
import {TimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {useMemo, useReducer, useState} from 'react'

type EditScheduleAction =
  | {type: 'add'}
  | {type: 'remove'; index: number}
  | {type: 'replace'; schedule: Schedule}
  | {type: 'edit'; key: 'times' | 'statuses'; value: number[]}
  | {type: 'edit'; key: 'protocol'; value: string}
function updateSchedule(state: Schedule, action: EditScheduleAction) {
  if (action.type === 'replace') return new Schedule(action.schedule)
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

const state = {current: JSON.stringify(new Schedule())}
export function EditSchedule({
  initial,
  onRemove,
  onUpdate,
}: {
  initial: Schedule
  onRemove: () => void
  onUpdate: (schedule: Schedule) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  const [schedule, setSchedule] = useReducer(updateSchedule, new Schedule(initial))
  useMemo(() => {
    setSchedule({type: 'replace', schedule: initial})
    state.current = JSON.stringify(initial)
  }, [initial])
  const [changed, setChanged] = useState(false)
  const updateState = (action: EditScheduleAction) => {
    setSchedule(action)
    if (action.type === 'replace') {
      state.current = JSON.stringify(action.schedule)
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
      setChanged(state.current !== JSON.stringify(tempSchedule))
    }
  }
  const times = schedule.times.map(time => dayjs(time))
  const date = dayjs(schedule.date).format('dddd, MMMM D YYYY')
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
          <DialogContent sx={{p: 1}}>
            <Stack spacing={1}>
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
              <Box>
                <IconButton
                  title="Add beep"
                  sx={{width: 40, float: 'right'}}
                  onClick={() => updateState({type: 'add'})}
                >
                  <Add />
                </IconButton>
              </Box>
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
              <Button disabled={!changed} onClick={() => updateState({type: 'replace', schedule: initial})}>
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
