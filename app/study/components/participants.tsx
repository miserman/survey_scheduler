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
import {SyntheticEvent, useReducer, useState, useMemo} from 'react'
import {MenuDialog, editData, trackEdits} from './menu_dialog'
import {SCHEDULE_SCALE} from '../params'
import Participant from '../classes/participant'
import {ScheduleDay} from './schedule_day'
import {MS_DAY, former, participants, protocols} from '../root'
import Schedule from '../classes/schedule'
import type {Blackout, ScheduleSpec} from '../types'

const editParticipant = (
  data: Participant,
  action: {
    key: string
    value: boolean | boolean[] | string[] | Blackout[] | Schedule[] | string | number | Participant
  }
) => {
  if ('object' === typeof action.value && !Array.isArray(action.value)) {
    action.value = new Participant(action.value)
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
      trackEdits(edits, 'schedule', data.schedule, data.schedule)
      data.rollProtocols(protocols)
      const index = data.schedule.length
      data.scheduleDay(data.start.day_ms, protocols[data.protocol_order[index]], index)
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
      <FormControl fullWidth>
        <Tooltip placement="left" title="Unique string identifying this participant, to be added to their survey link.">
          <TextField variant="standard" value={data.id || ''} name="id" onChange={handleValueChange} label="ID" />
        </Tooltip>
        <Tooltip placement="left" title="10 digit number (e.g., 1231231234)">
          <TextField
            variant="standard"
            value={data.phone || ''}
            name="phone"
            onChange={handleValueChange}
            label="Phone"
          />
        </Tooltip>
        <Stack direction="row">
          <FormControl>
            <Tooltip placement="left" title="Sampling strategy for the selected protocols.">
              <InputLabel id="protocol-label-order">Order Type</InputLabel>
            </Tooltip>
            <Select
              variant="standard"
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
                  onClick={() => {
                    trackEdits(edits, 'schedule', data.protocols, data.protocols)
                    dispatchEdit({key: 'protocols', value: Object.keys(protocols).filter(n => n !== 'New')})
                  }}
                >
                  All
                </Button>
                <Button
                  variant="contained"
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
            <Button variant="outlined" onClick={addBlackout}>
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
                      value={blackout.start}
                      name="start"
                      onChange={editBlackout(index)}
                      type="date"
                    ></TextField>
                    <TextField
                      variant="standard"
                      value={blackout.end}
                      name="end"
                      onChange={editBlackout(index)}
                      type="date"
                    ></TextField>
                    <Button variant="contained" onClick={removeBlackout(index)}>
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
            <TextField
              variant="standard"
              value={data.start.day || ''}
              name="start.day"
              onChange={handleValueChange}
              type="date"
            ></TextField>
            <TextField
              variant="standard"
              value={data.end.day || ''}
              name="end.day"
              onChange={handleValueChange}
              type="date"
            ></TextField>
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
                <TextField
                  variant="standard"
                  value={data.start.time || ''}
                  name="start.time"
                  onChange={handleValueChange}
                  type="time"
                ></TextField>
              </Grid>
              <Grid item xs={12} sx={{height: scheduleHeight}}></Grid>
              <Grid item xs={12}>
                <TextField
                  variant="standard"
                  value={data.end.time || ''}
                  name="end.time"
                  onChange={handleValueChange}
                  type="time"
                ></TextField>
              </Grid>
            </Grid>
            <Grid container item xs={9}>
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
                        start={data.start.day_ms + data.start.time_ms}
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
        <Stack>
          <Button variant="outlined" onClick={addSchedule}>
            Add Day
          </Button>
        </Stack>
      </FormControl>
    </MenuDialog>
  )
}
