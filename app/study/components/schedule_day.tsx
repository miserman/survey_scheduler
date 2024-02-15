import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material'
import {Beep} from './beep'
import {Protocols, formatDay} from '../root'
import {useMemo, useReducer, useState} from 'react'
import {MenuDialog, trackEdits} from './menu_dialog'
import type {Protocol, ScheduleSpec} from '../types'
import Schedule from '../classes/schedule'

const editScheduleDay = (
  state: ScheduleSpec,
  action: {
    key: string
    value: string | number | number[] | ScheduleSpec
  }
) => {
  if ('object' !== typeof action.value || Array.isArray(action.value)) {
    const newState = {...state}
    ;(newState[action.key as keyof ScheduleSpec] as typeof action.value) = Array.isArray(action.value)
      ? JSON.parse(JSON.stringify(action.value))
      : action.value
    return newState
  }
  return {...action.value}
}

export const ScheduleDay = ({
  index,
  day,
  protocol,
  protocols,
  start,
  height,
  update,
  remove,
}: {
  index: number
  day: ScheduleSpec
  protocol: Protocol
  protocols: string[]
  start: number
  height: string
  update: (index: number, day: ScheduleSpec) => void
  remove: (index: number) => void
}) => {
  const edits = useMemo(() => new Map(), [])
  const [scheduleDay, dispatchEdit] = useReducer(editScheduleDay, day)
  const [editorOpen, setEditorOpen] = useState(false)
  const handleScheduleSelectChange = (e: SelectChangeEvent) => {
    const key = 'name' in e.target ? (e.target.name as keyof ScheduleSpec) : ''
    if (key) {
      const value = e.target.value
      trackEdits(edits, key, value, day[key as keyof ScheduleSpec])
      dispatchEdit({key, value})
    }
  }
  const schedule = useMemo(() => new Schedule(day), [day])
  return (
    <Grid item>
      <Grid
        item
        xs={12}
        sx={{
          textAlign: 'center',
          p: 1,
          backgroundColor: protocol.color,
        }}
      >
        <Typography>{formatDay.format(day.date)}</Typography>
        <Typography>{day.protocol}</Typography>
      </Grid>
      <Grid item xs={12} sx={{height, position: 'relative'}}>
        {day.times.map((_, index) => {
          return <Beep key={index} schedule={schedule} index={index} start={start} />
        })}
      </Grid>
      <Grid item xs={12}>
        <Stack>
          <Button
            variant="contained"
            onClick={() => {
              setEditorOpen(true)
            }}
          >
            Edit
          </Button>
          <Button>Pause</Button>
        </Stack>
      </Grid>
      <MenuDialog
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        edited={!!edits.size}
        title="Schedule Day"
        options={[formatDay.format(day.date)]}
        onChange={() => {
          dispatchEdit({key: '', value: day})
          edits.clear()
        }}
        onRemove={() => {
          remove(index)
          edits.clear()
          setEditorOpen(false)
        }}
        onAddUpdate={() => {
          edits.clear()
          update(index, scheduleDay)
          setEditorOpen(false)
          return ''
        }}
        selected={0}
      >
        <FormControl fullWidth>
          <InputLabel id="schedule-day-protocol">Protocol</InputLabel>
          <Select
            label="Protocol"
            labelId="schedule-day-protocol"
            value={scheduleDay.protocol}
            name="protocol"
            onChange={handleScheduleSelectChange}
          >
            {protocols.map(protocol => (
              <MenuItem key={protocol} value={protocol}>
                <ListItemText primary={protocol} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </MenuDialog>
    </Grid>
  )
}
