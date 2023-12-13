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
import {Schedule} from '../types'
import {MenuDialog, trackEdits} from './menu_dialog'

const editScheduleDay = (
  state: Schedule,
  action: {
    key: string
    value: string | number | number[] | Schedule
  }
) => {
  if ('object' !== typeof action.value || Array.isArray(action.value)) {
    const newState = {...state}
    ;(newState[action.key as keyof typeof state] as typeof action.value) = Array.isArray(action.value)
      ? JSON.parse(JSON.stringify(action.value))
      : action.value
    return newState
  }
  return {...action.value}
}

export const ScheduleDay = ({
  index,
  day,
  protocols,
  protocolOrder,
  start,
  height,
  update,
  remove,
}: {
  index: number
  day: Schedule
  protocols: Protocols
  protocolOrder: string[]
  start: number
  height: string
  update: (index: number, day: Schedule) => void
  remove: (index: number) => void
}) => {
  const edits = useMemo(() => new Map(), [])
  const [scheduleDay, dispatchEdit] = useReducer(editScheduleDay, day)
  const [editorOpen, setEditorOpen] = useState(false)
  const handleScheduleSelectChange = (e: SelectChangeEvent) => {
    const key = 'name' in e.target ? (e.target.name as keyof Schedule) : ''
    if (key) {
      const value = e.target.value
      trackEdits(edits, key, value, day[key as keyof Schedule])
      dispatchEdit({key, value})
    }
  }
  return (
    <Grid item>
      <Grid
        item
        xs={12}
        sx={{
          textAlign: 'center',
          p: 1,
          backgroundColor: protocols[day.protocol].color,
        }}
      >
        <Typography>{formatDay.format(day.date)}</Typography>
        <Typography>{day.protocol}</Typography>
      </Grid>
      <Grid item xs={12} sx={{height: height}}>
        {day.times.map((_, index) => {
          return <Beep key={index} schedule={day} index={index} start={start} />
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
            {protocolOrder.map(protocol => (
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
