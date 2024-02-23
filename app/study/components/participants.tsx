import {
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import {Done as DoneIcon} from '@mui/icons-material'
import {SyntheticEvent, useReducer, useState, useMemo, useEffect} from 'react'
import {MenuDialog, editData, trackEdits} from './menu_dialog'
import {SCHEDULE_SCALE} from '../params'
import Participant from '../classes/participant'
import {ScheduleDay} from './schedule_day'
import {MS_DAY, former, participants, protocols} from '../root'
import Schedule from '../classes/schedule'
import type {Blackout, ScheduleSpec} from '../types'
import {DatePicker, TimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'

const editParticipant = (
  data: Participant,
  action: {
    key: string
    value: boolean | boolean[] | string[] | Blackout[] | Schedule[] | string | number | Participant
  }
) => {
  if ('object' === typeof action.value && !Array.isArray(action.value)) {
    action.value = new Participant(action.value)
  } else if (action.key === 'start' || action.key === 'end') {
    return data
  }
  return new Participant(editData(data, action))
}

const defaultSpec = {
  id: '',
  start: {day: former.dashdate(Date.now()), time: '09:00'},
  end: {day: former.dashdate(Date.now() + MS_DAY * 7), time: '17:00'},
}
export const ParticipantsMenu = ({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) => {
  const edits = useMemo(() => new Map(), [])
  const handleValueChange = (e: SyntheticEvent, value?: boolean | string | number) => {
    const key = 'name' in e.target ? (e.target.name as keyof Participant) : ''
    if (undefined === value && 'value' in e.target) value = e.target.value as string
    if (key && undefined !== value) {
      trackEdits(edits, key, value, participants[participant][key as keyof Participant])
      dispatchEdit({key, value})
    }
  }
  const handleDayChange = (e: SyntheticEvent, dayValue: boolean) => {
    const value = [...data.daysofweek]
    value[+(e.target as HTMLInputElement).value] = dayValue
    trackEdits(edits, 'daysofweek', value, data.daysofweek)
    dispatchEdit({key: 'daysofweek', value})
  }
  const handleValueSelect = (e: SelectChangeEvent) => {
    const key = 'name' in e.target ? (e.target.name as keyof Participant) : ''
    if (key) {
      const value = e.target.value
      trackEdits(edits, key, value, participants[participant][key as keyof Participant])
      dispatchEdit({key, value})
    }
  }
  const addProtocol = (protocol: string) => () => {
    trackEdits(edits, 'protocols', data.protocols, data.protocols)
    dispatchEdit({key: 'protocols', value: [...data.protocols, protocol]})
  }
  const removeProtocol = (index: number) => () => {
    if (data.protocols) {
      const selection = [...data.protocols]
      selection.splice(index, 1)
      trackEdits(edits, 'protocols', data.protocols, data.protocols)
      dispatchEdit({key: 'protocols', value: selection})
    }
  }
  const addBlackout = () => {
    if (!data.blackouts) data.blackouts = []
    trackEdits(edits, 'blackouts', data.blackouts, data.blackouts)
    dispatchEdit({key: 'blackouts', value: [...data.blackouts, {start: '', end: ''}] as Blackout[]})
  }
  const editBlackout = (index: number) => (e: SyntheticEvent) => {
    if (data.blackouts) {
      const input = e.target as HTMLInputElement
      const b = [...data.blackouts]
      const pair = input.name === 'start' ? 'end' : 'start'
      b[index] = {...data.blackouts[index], [input.name]: input.value}
      if (!b[index][pair]) b[index][pair] = +input.value
      trackEdits(edits, 'blackouts', data.blackouts, data.blackouts)
      dispatchEdit({
        key: 'blackouts',
        value: b,
      })
    }
  }
  const removeBlackout = (index: number) => () => {
    if (data.blackouts) {
      data.blackouts.splice(index, 1)
      trackEdits(edits, 'blackouts', data.blackouts, data.blackouts)
      dispatchEdit({
        key: 'blackouts',
        value: data.blackouts,
      })
    }
  }
  const addSchedule = () => {
    if (!data.schedule) data.schedule = []
    if (data.protocols && data.protocols.length) {
      data.addDay(protocols)
      trackEdits(edits, 'end', data.end, data.end)
      dispatchEdit({
        key: 'end',
        value: data.end.day_ms,
      })
      trackEdits(edits, 'schedule', data.schedule, data.schedule)
      dispatchEdit({
        key: 'schedule',
        value: [...data.schedule],
      })
    }
  }
  const [participant, setParticipant] = useState('New')
  if (!(participant in participants)) participants[participant] = new Participant(defaultSpec)
  const [participantList, setParticipantList] = useState(Object.keys(participants))
  const [data, dispatchEdit] = useReducer(editParticipant, participants.New)
  const scheduleHeight = (data.end.time_ms - data.start.time_ms) / SCHEDULE_SCALE + 'px'
  if (!data.protocols.length) data.protocols = Object.keys(protocols).filter(n => n !== 'New')
  if (!data.schedule.length) data.rollSchedule(protocols)
  useEffect(() => data.rollSchedule(protocols), [data.blackouts, data.daysofweek, data.protocol_order, protocols])
  return (
    <MenuDialog
      isOpen={isOpen}
      onClose={onClose}
      edited={!!edits.size}
      title="Participant"
      options={participantList}
      onChange={(option: string) => {
        setParticipant(option)
        edits.clear()
        dispatchEdit({key: 'new', value: new Participant(participants[option])})
      }}
      onRemove={(option: string) => {
        if (option !== 'New') {
          delete participants[option]
          setParticipantList(Object.keys(participants))
        }
      }}
      onAddUpdate={() => {
        const id = data.id as string
        participants[id] = JSON.parse(JSON.stringify(data)) as Participant
        setParticipantList(Object.keys(participants))
        return id
      }}
    >
      <Stack spacing={1} paddingLeft={1} paddingRight={1}>
        <Tooltip placement="left" title="Unique string identifying this participant, to be added to their survey link.">
          <TextField size="small" value={data.id || ''} name="id" onChange={handleValueChange} label="ID" />
        </Tooltip>
        <Tooltip placement="left" title="10 digit number (e.g., 1231231234)">
          <TextField size="small" value={data.phone || ''} name="phone" onChange={handleValueChange} label="Phone" />
        </Tooltip>
        <Stack direction="row">
          <FormControl>
            <Tooltip placement="left" title="Sampling strategy for the selected protocols.">
              <InputLabel id="protocol-label-order">Order Type</InputLabel>
            </Tooltip>
            <Select
              size="small"
              label="Order Type"
              labelId="protocol-label-order"
              value={data.order_type || 'shuffle'}
              name="order_type"
              onChange={handleValueSelect}
            >
              <MenuItem value="shuffle">
                <ListItemText primary="Shuffle" secondary="Randomize the order, selecting all before repeating." />
              </MenuItem>
              <MenuItem value="sampled">
                <ListItemText primary="Sampled" secondary="Independently sample from selected protocols." />
              </MenuItem>
              <MenuItem value="ordered">
                <ListItemText primary="Ordered" secondary="Repeat in the selected order." />
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Available</InputLabel>
            <ButtonGroup orientation="vertical" aria-label="Available">
              <ButtonGroup aria-label="Protocol Controls">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    trackEdits(edits, 'schedule', data.protocols, data.protocols)
                    dispatchEdit({key: 'protocols', value: Object.keys(protocols).filter(n => n !== 'New')})
                  }}
                >
                  All
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    trackEdits(edits, 'schedule', data.protocols, data.protocols)
                    dispatchEdit({key: 'protocols', value: []})
                  }}
                >
                  None
                </Button>
              </ButtonGroup>
              {Object.keys(protocols)
                .filter(n => n !== 'New')
                .map(label => (
                  <Chip label={label} key={label} onClick={addProtocol(label)} icon={<DoneIcon />} />
                ))}
            </ButtonGroup>
          </FormControl>
          <FormControl>
            <InputLabel>Selected</InputLabel>
            <ButtonGroup orientation="vertical" aria-label="Selected">
              {data.protocols.map((label, index) => (
                <Chip label={label} key={label} onDelete={removeProtocol(index)} />
              ))}
            </ButtonGroup>
          </FormControl>
        </Stack>
        <Tooltip placement="left" title="Days of each week in which beeps can be scheduled.">
          <FormLabel component="legend">Days of the Week</FormLabel>
        </Tooltip>
        <FormGroup
          aria-label="Days of the Week"
          sx={{
            '& .MuiTypography-root': {fontSize: '.85rem'},
            '& .MuiFormControlLabel-root': {marginLeft: 1, marginRight: 1},
          }}
          row
        >
          {data.daysofweek.map((checked, i) => (
            <FormControlLabel
              key={i}
              value={i}
              name="daysofweek"
              control={<Checkbox checked={checked} onChange={handleDayChange} />}
              label="Sunday"
              labelPlacement="top"
            />
          ))}
        </FormGroup>
        <Stack direction="row">
          <Stack direction="column">
            <Tooltip placement="left" title="Start and end dates on and between which beeps cannot be schedules.">
              <FormLabel component="legend">Blackout Days</FormLabel>
            </Tooltip>
            <Button variant="outlined" size="small" onClick={addBlackout}>
              Add
            </Button>
          </Stack>
          {data.blackouts &&
            data.blackouts.map((blackout, index) => {
              if (blackout) {
                return (
                  <Paper key={index} elevation={5} sx={{display: 'flex', flexDirection: 'column', m: 1}}>
                    <TextField
                      variant="standard"
                      size="small"
                      value={blackout.start}
                      name="start"
                      onChange={editBlackout(index)}
                      type="date"
                    ></TextField>
                    <TextField
                      variant="standard"
                      size="small"
                      value={blackout.end}
                      name="end"
                      onChange={editBlackout(index)}
                      type="date"
                    ></TextField>
                    <Button variant="contained" size="small" onClick={removeBlackout(index)}>
                      Remove
                    </Button>
                  </Paper>
                )
              }
            })}
        </Stack>
        <Grid container>
          <Grid item xs={3}>
            <Tooltip placement="left" title="First and last days of the participant's full study period.">
              <FormLabel component="legend">Day Range</FormLabel>
            </Tooltip>
          </Grid>
          <Grid item xs={9} sx={{display: 'flex', justifyContent: 'space-between'}}>
            <DatePicker
              value={dayjs(data.start.day_ms || '')}
              name="start.day"
              onChange={date => {
                if (date) {
                  const value = date.toDate().getTime()
                  trackEdits(edits, 'start.day', value, participants[participant].start.day_ms)
                  dispatchEdit({key: 'start.day', value})
                }
              }}
            ></DatePicker>
            <DatePicker
              value={dayjs(data.end.day_ms || '')}
              name="end.day"
              onChange={date => {
                if (date) {
                  const value = date.toDate().getTime()
                  trackEdits(edits, 'end.day', value, participants[participant].end.day_ms)
                  dispatchEdit({key: 'end.day', value})
                }
              }}
            ></DatePicker>
          </Grid>
          <Grid container>
            <Grid container item xs={3} spacing={0} sx={{alignContent: 'flex-start'}}>
              <Grid item xs={12} sx={{height: '64px'}}>
                <Tooltip
                  placement="left"
                  title="Earliest and latest time each day between which beeps can be schedules."
                >
                  <FormLabel component="legend">Time Range</FormLabel>
                </Tooltip>
                <TimePicker
                  value={dayjs(data.start.time_ms || '')}
                  name="start.time"
                  onChange={date => {
                    if (date) {
                      const value = date.toDate().getTime()
                      trackEdits(edits, 'start.time', value, participants[participant].start.time_ms)
                      dispatchEdit({key: 'start.time', value})
                    }
                  }}
                ></TimePicker>
              </Grid>
              <Grid item xs={12} sx={{height: scheduleHeight}}></Grid>
              <Grid item xs={12}>
                <TimePicker
                  value={dayjs(data.end.time_ms || '')}
                  name="end.time"
                  onChange={date => {
                    if (date) {
                      const value = date.toDate().getTime()
                      trackEdits(edits, 'end.time', value, participants[participant].end.time_ms)
                      dispatchEdit({key: 'end.time', value})
                    }
                  }}
                ></TimePicker>
              </Grid>
            </Grid>
            <Grid container item xs={9} sx={{overflow: 'auto'}}>
              <Grid flexWrap="nowrap" container>
                {data.schedule &&
                  data.schedule.map((schedule, index) => {
                    if (schedule) {
                      return (
                        <ScheduleDay
                          key={index}
                          index={index}
                          day={schedule}
                          protocol={protocols[data.protocol_order[index]]}
                          protocols={data.protocols}
                          start={data.start.time_ms}
                          end={data.end.time_ms}
                          height={scheduleHeight}
                          update={(index: number, day: ScheduleSpec) => {
                            data.schedule[index] = JSON.parse(JSON.stringify(day))
                            trackEdits(edits, 'schedule', data.schedule, data.schedule)
                            dispatchEdit({key: 'schedule', value: data.schedule})
                          }}
                          remove={(index: number) => {
                            data.schedule.splice(index, 1)
                            trackEdits(edits, 'schedule', data.schedule, data.schedule)
                            dispatchEdit({key: 'schedule', value: data.schedule})
                          }}
                        ></ScheduleDay>
                      )
                    }
                  })}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Stack>
          <Button variant="contained" size="small" onClick={addSchedule}>
            Add Day
          </Button>
        </Stack>
      </Stack>
    </MenuDialog>
  )
}
