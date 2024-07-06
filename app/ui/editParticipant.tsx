import {operation} from '@/utils/operation'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {SyntheticEvent, useContext, useEffect, useMemo, useReducer, useState} from 'react'
import {FeedbackContext, SessionContext} from '../context'
import Participant, {type Participants} from '@/lib/participant'
import {Add, Casino, Close} from '@mui/icons-material'
import {ConfirmUpdate} from './confirmUpdate'
import {DatePicker, TimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {Blackout} from '@/lib/blackout'
import {EditBlackout} from './editBlackout'

const daysofweek_labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
type EditParticipantAction =
  | {type: 'replace'; participant: Partial<Participant>}
  | {type: 'edit'; key: string; value: string | boolean | number | string[] | boolean[] | Blackout[]}
function editParticipant(state: Partial<Participant>, action: EditParticipantAction): Participant {
  if (action.type === 'replace') {
    return new Participant(action.participant)
  } else {
    return new Participant({...state, [action.key]: action.value})
  }
}
const state = {current: JSON.stringify(new Participant())}
export default function ParticipantEditDialog({
  study,
  open,
  onClose,
  protocols,
}: {
  study: string
  open: boolean
  onClose: () => void
  protocols: string[]
}) {
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)
  const [participants, setParticipants] = useState<Participants>({New: new Participant({protocols})})
  const [participant, setParticipant] = useReducer(editParticipant, participants.New)
  const [selected, setSelected] = useState('New')
  const [changed, setChanged] = useState(false)
  const updateState = (action: EditParticipantAction) => {
    setParticipant(action)
    if (action.type === 'replace') {
      const id = action.participant.id || 'New'
      setSelected(id)
      participants[id] = new Participant(participants[id])
      state.current = JSON.stringify(participants[id])
      setChanged(false)
    } else {
      ;(participant[action.key as keyof Participant] as typeof action.value) = action.value
      setChanged(state.current !== JSON.stringify(new Participant(participant)))
    }
  }
  const handleChange = (e: SyntheticEvent, value?: boolean) => {
    if ('name' in e.target) {
      const key = e.target.name as keyof Participant
      if ('undefined' === typeof value) {
        if ('value' in e.target) {
          const value = e.target.value as string
          requestAnimationFrame(() => updateState({type: 'edit', key, value}))
        }
      } else {
        requestAnimationFrame(() => updateState({type: 'edit', key, value}))
      }
    }
  }
  const handleSelectChange = (e: SelectChangeEvent) => {
    const key = 'name' in e.target ? (e.target.name as keyof Participant) : ''
    if (key) {
      updateState({type: 'edit', key, value: e.target.value})
    }
  }
  const submitParticipant = async () => {
    const parsed = new Participant(participant)
    const req = await operation({type: 'add_participant', study, id: parsed.id, participant: parsed})
    if (req.error) {
      notify('failed to ' + (selected === 'New' ? 'add' : 'update') + ' participant ' + parsed.id + ': ' + req.status)
    } else {
      notify((selected === 'New' ? 'added' : 'updated') + ' participant ' + parsed.id, true)
      updateState({type: 'replace', participant: parsed})
    }
  }
  const deleteParticipant = async () => {
    const req = await operation({type: 'remove_participant', study, id: selected})
    if (req.error) {
      notify('failed to remove participant ' + selected + ': ' + req.status)
    } else {
      notify('removed participant ' + selected, true)
      delete participants[selected]
      setParticipants({...participants})
      updateState({type: 'replace', participant: participants.New})
    }
  }
  useEffect(() => {
    if (session.signedin && open) {
      const getParticipants = async () => {
        const req = await operation<Participants>({type: 'view_participant', study})
        if (req.error) {
          notify('failed to retrieve participants: ' + req.status)
        } else {
          setParticipants({New: new Participant({protocols}), ...req.content})
        }
      }
      getParticipants()
    }
  }, [session.signedin, open, notify, study])
  const ParticipantList = useMemo(
    () =>
      Object.keys(participants).map(id => (
        <MenuItem key={id} value={id}>
          {id}
        </MenuItem>
      )),
    [participants]
  )
  const DaysOfWeek = useMemo(() => {
    return participant.daysofweek.map((checked, i) => (
      <FormControlLabel
        key={i}
        value={i}
        name="daysofweek"
        control={
          <Checkbox
            checked={checked}
            onChange={(_, dayValue) => {
              const value = [...participant.daysofweek]
              value[i] = dayValue
              updateState({type: 'edit', key: 'daysofweek', value})
            }}
            size="small"
            sx={{pt: 0, pb: 0}}
          />
        }
        label={daysofweek_labels[i]}
        labelPlacement="end"
      />
    ))
  }, [participant.daysofweek])

  const BlackoutDays = useMemo(() => {
    return participant.blackouts.map((blackout, index) => {
      if (blackout) {
        return (
          <EditBlackout
            key={index}
            blackout={blackout}
            onRemove={() => {
              const newBlackouts = [...participant.blackouts]
              newBlackouts.splice(index, 1)
              updateState({type: 'edit', key: 'blackouts', value: newBlackouts})
            }}
            onUpdate={(newBlackout: Blackout) => {
              const newBlackouts = [...participant.blackouts]
              newBlackouts[index] = newBlackout
              updateState({type: 'edit', key: 'blackouts', value: newBlackouts})
            }}
          ></EditBlackout>
        )
      }
    })
  }, [participant.blackouts])

  const existing = selected !== 'New'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{mt: 3, '& .MuiDialog-container > .MuiPaper-root': {height: '100%', width: '100hw', maxWidth: '100%'}}}
    >
      <DialogTitle sx={{p: 1}}>Participant Editor</DialogTitle>
      <IconButton
        aria-label="close participant editor"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 0,
          top: 4,
        }}
        className="close-button"
      >
        <Close />
      </IconButton>
      <DialogContent sx={{p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <FormControl fullWidth sx={{p: 1}}>
          <InputLabel sx={{p: 1}} id="protocol_edit_select">
            Participant ID
          </InputLabel>
          <Select
            labelId="protocol_edit_select"
            label="Protocol ID"
            size="small"
            value={selected}
            onChange={e => {
              const name = e.target.value
              updateState({type: 'replace', participant: {...participants[name]}})
              return
            }}
          >
            {ParticipantList}
          </Select>
        </FormControl>
        <Paper sx={{p: 1, pt: 2, overflowY: 'auto', height: '100%', width: 820, maxWidth: '100%'}}>
          <Stack spacing={2}>
            <Stack spacing={2} direction="row">
              <Stack direction="row">
                <Tooltip
                  placement="top"
                  title="Unique string identifying this participant, to be added to their survey link."
                >
                  <TextField
                    size="small"
                    value={participant.id || ''}
                    name="id"
                    onChange={handleChange}
                    label="ID"
                    error={!participant.id}
                    disabled={existing}
                  />
                </Tooltip>
                <Tooltip title="Generate ID" placement="top">
                  <IconButton
                    disabled={existing}
                    onClick={() => {
                      let value = Math.floor(Math.random() * 1e8)
                      while (value in participants) value = Math.floor(Math.random() * 1e9)
                      updateState({type: 'edit', key: 'id', value})
                    }}
                  >
                    <Casino />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Tooltip placement="top" title="10 digit number (e.g., 1231231234)">
                <TextField
                  size="small"
                  value={participant.phone || ''}
                  name="phone"
                  onChange={handleChange}
                  label="Phone"
                  error={!participant.phone}
                  sx={{width: 130}}
                />
              </Tooltip>
            </Stack>
            <Typography variant="h6">Protocol Sampling</Typography>
            <Stack direction="row" spacing={1}>
              <Autocomplete
                options={['All', ...protocols, '']}
                value={participant.protocols}
                multiple
                renderInput={params => <TextField {...params} size="small" label="Selected Protocols"></TextField>}
                sx={{minWidth: 190, maxWidth: 400}}
                isOptionEqualToValue={option => option === ''}
                getOptionDisabled={option => option === ''}
                onChange={(_, value) => {
                  if (value[value.length - 1] === 'All') {
                    updateState({type: 'edit', key: 'protocols', value: [...protocols]})
                  } else {
                    updateState({type: 'edit', key: 'protocols', value})
                  }
                }}
              />
              <FormControl>
                <Tooltip placement="left" title="Sampling strategy for the selected participants.">
                  <InputLabel id="participant-label-order">Protocol Sampling Order</InputLabel>
                </Tooltip>
                <Select
                  size="small"
                  label="Protocol Sampling Order"
                  labelId="participant-label-order"
                  value={participant.order_type.toLowerCase() || 'shuffle'}
                  name="order_type"
                  onChange={handleSelectChange}
                  sx={{maxWidth: 400, '& p': {overflow: 'hidden', textOverflow: 'ellipsis'}}}
                >
                  <MenuItem value="shuffle">
                    <ListItemText
                      primary="Shuffle"
                      secondary="Shuffle the selected protocols, repeatedly if necessary."
                    />
                  </MenuItem>
                  <MenuItem value="sampled">
                    <ListItemText primary="Sampled" secondary="Independently sample from selected protocols." />
                  </MenuItem>
                  <MenuItem value="ordered">
                    <ListItemText primary="Ordered" secondary="Repeat in the selected order." />
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Typography variant="h6">Day Coverage</Typography>
            <Stack spacing={2} direction="row">
              <Stack spacing={2} sx={{width: 150, pt: 1}}>
                <DatePicker
                  value={dayjs(participant.start_ms.day)}
                  name="start_day"
                  sx={{'& input': {p: 1}}}
                  label="Start Day"
                  onChange={date => {
                    if (date) updateState({type: 'edit', key: 'start_day', value: date.valueOf()})
                  }}
                ></DatePicker>
                <DatePicker
                  value={dayjs(participant.end_ms.day)}
                  name="end_day"
                  sx={{'& input': {p: 1}}}
                  label="End Day"
                  onChange={date => {
                    if (date) updateState({type: 'edit', key: 'end_day', value: date.valueOf()})
                  }}
                ></DatePicker>
              </Stack>
              <FormControl>
                <FormLabel component="legend">Days of the Week</FormLabel>
                <FormGroup aria-label="Days of the Week" sx={{'& .MuiTypography-root': {fontSize: '.8em'}}}>
                  {DaysOfWeek}
                </FormGroup>
              </FormControl>
              <FormControl>
                <Stack spacing={1} direction="row">
                  <FormLabel component="legend">Blackout Days</FormLabel>
                  <IconButton
                    sx={{p: 0}}
                    size="small"
                    title="Add blackout day"
                    onClick={() => {
                      const newBlackouts = [...participant.blackouts]
                      newBlackouts.push(new Blackout({}))
                      updateState({type: 'edit', key: 'blackouts', value: newBlackouts})
                    }}
                  >
                    <Add />
                  </IconButton>
                </Stack>
                <FormGroup aria-label="Blackout Days">
                  <Stack spacing={1} sx={{maxHeight: 160, overflowY: 'auto', pt: 1}}>
                    {BlackoutDays}
                  </Stack>
                </FormGroup>
                {!!BlackoutDays.length ? (
                  <Button
                    sx={{mt: 1}}
                    size="small"
                    color="error"
                    onClick={() => updateState({type: 'edit', key: 'blackouts', value: []})}
                  >
                    Clear
                  </Button>
                ) : (
                  <Chip disabled label="No Blackout Days" />
                )}
              </FormControl>
            </Stack>
            <Typography variant="h6">Time Range</Typography>
            <Stack spacing={2} direction="row">
              <TimePicker
                value={dayjs(participant.start_ms.time)}
                name="start_time"
                sx={{'& input': {p: 1, maxWidth: 70}}}
                label="Start Time"
                onChange={date => {
                  if (date) updateState({type: 'edit', key: 'start_time', value: date.valueOf()})
                }}
              ></TimePicker>
              <TimePicker
                value={dayjs(participant.end_ms.time)}
                name="end_time"
                sx={{'& input': {p: 1, maxWidth: 70}}}
                label="End Time"
                onChange={date => {
                  if (date) updateState({type: 'edit', key: 'end_time', value: date.valueOf()})
                }}
              ></TimePicker>
            </Stack>
          </Stack>
          <Typography variant="h6" sx={{pt: 2}}>
            Schedule
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{justifyContent: 'space-between'}}>
        <Button variant="contained" color="error" disabled={selected === 'New'} onClick={deleteParticipant}>
          Delete
        </Button>
        <Box>
          <Button
            disabled={!changed}
            onClick={() => updateState({type: 'replace', participant: participants[selected]})}
          >
            Reset
          </Button>
          {selected === 'New' ? (
            <Button variant="contained" disabled={!participant.id} onClick={submitParticipant}>
              Add
            </Button>
          ) : (
            <ConfirmUpdate disabled={!changed} name={'participant ' + selected} onConfirm={submitParticipant} />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}
