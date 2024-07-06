import {operation} from '@/utils/operation'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import {ReactNode, SyntheticEvent, useContext, useEffect, useMemo, useReducer, useState} from 'react'
import {FeedbackContext, SessionContext} from '../context'
import {Protocol, type Protocols} from '@/lib/protocol'
import {Close} from '@mui/icons-material'
import {ConfirmUpdate} from './confirmUpdate'

const url_protocol = /^https?:\/\//
const MessagePreview = ({reminder, spec}: {reminder?: boolean; spec: Partial<Protocol>}) => {
  const link = spec.link && (!reminder || spec.reminder_link) ? spec.link + '?' + spec.id_parameter + '=12345678' : ''
  const message = spec[reminder ? 'reminder_message' : 'initial_message']
  const content: ReactNode[] = []
  if (message)
    content.push(
      <Typography sx={{fontSize: '.9em'}} key={message}>
        {message}
      </Typography>
    )
  if (link)
    content.push(
      <Link sx={{fontSize: '.9em'}} key={link} href={link} rel="noreferrer" target="_blank">
        {link.replace(url_protocol, '')}
      </Link>
    )
  return (
    message && (
      <Paper elevation={4} sx={{p: 1, m: 1, maxWidth: '200px', wordBreak: 'break-word'}}>
        {content}
      </Paper>
    )
  )
}

type EditProtocolAction =
  | {type: 'replace'; protocol: Partial<Protocol>}
  | {type: 'edit'; key: string; value: string | boolean | number}
function editProtocol(state: Partial<Protocol>, action: EditProtocolAction): Partial<Protocol> {
  if (action.type === 'replace') {
    return new Protocol(action.protocol)
  } else {
    return new Protocol({...state, [action.key]: action.value})
  }
}
const state = {current: JSON.stringify(new Protocol())}
export default function ProtocolEditDialog({
  study,
  open,
  onClose,
}: {
  study: string
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)
  const [protocols, setProtocols] = useState<Protocols>({New: new Protocol()})
  const [protocol, setProtocol] = useReducer(editProtocol, protocols.New)
  const [selected, setSelected] = useState('New')
  const [changed, setChanged] = useState(false)
  const updateState = (action: EditProtocolAction) => {
    setProtocol(action)
    if (action.type === 'replace') {
      const name = action.protocol.name || 'New'
      setSelected(name)
      protocols[name] = new Protocol(protocols[name])
      state.current = JSON.stringify(protocols[name])
      setChanged(false)
    } else {
      ;(protocol[action.key as keyof Protocol] as typeof action.value) = action.value
      setChanged(state.current !== JSON.stringify(new Protocol(protocol)))
    }
  }
  const handleChange = (e: SyntheticEvent, value?: boolean) => {
    if ('name' in e.target) {
      const key = e.target.name as keyof Protocol
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
    const key = 'name' in e.target ? (e.target.name as keyof Protocol) : ''
    if (key) {
      updateState({type: 'edit', key, value: e.target.value})
    }
  }
  const submitProtocol = async () => {
    const parsed = new Protocol(protocol)
    const req = await operation({type: 'add_protocol', study, name: parsed.name, params: parsed})
    if (req.error) {
      notify('failed to ' + (selected === 'New' ? 'add' : 'update') + ' protocol ' + parsed.name + ': ' + req.status)
    } else {
      notify((selected === 'New' ? 'added' : 'updated') + ' protocol ' + parsed.name, true)
      updateState({type: 'replace', protocol: parsed})
    }
  }
  const deleteProtocol = async () => {
    const req = await operation({type: 'remove_protocol', study, name: selected})
    if (req.error) {
      notify('failed to remove protocol ' + selected + ': ' + req.status)
    } else {
      notify('removed protocol ' + selected, true)
      delete protocols[selected]
      setProtocols({...protocols})
      updateState({type: 'replace', protocol: protocols.New})
    }
  }
  useEffect(() => {
    if (session.signedin && open) {
      const getProtocols = async () => {
        const req = await operation<Protocols>({type: 'view_protocol', study})
        if (req.error) {
          notify('failed to retrieve protocols: ' + req.status)
        } else {
          setProtocols({New: new Protocol(), ...req.content})
        }
      }
      getProtocols()
    }
  }, [session.signedin, open, notify, study])
  const ProtocolList = useMemo(
    () =>
      Object.keys(protocols).map(id => (
        <MenuItem key={id} value={id}>
          {id}
        </MenuItem>
      )),
    [protocols]
  )
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{mt: 3, '& .MuiDialog-container > .MuiPaper-root': {height: '100%', width: 500, maxWidth: '100%'}}}
    >
      <DialogTitle sx={{p: 1}}>Protocol Editor</DialogTitle>
      <IconButton
        aria-label="close protocol editor"
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
            Protocol ID
          </InputLabel>
          <Select
            labelId="protocol_edit_select"
            label="Protocol ID"
            size="small"
            value={selected}
            onChange={e => {
              const name = e.target.value
              updateState({type: 'replace', protocol: {...protocols[name]}})
              return
            }}
          >
            {ProtocolList}
          </Select>
        </FormControl>
        <Paper sx={{pt: 2, overflowY: 'auto', height: '100%'}}>
          <Stack spacing={1} paddingLeft={1} paddingRight={1}>
            <Stack spacing={1}>
              <Stack sx={{width: '100%'}} spacing={1} direction="row">
                <Tooltip placement="left" title="Unique name of this protocol.">
                  <TextField
                    label="Name"
                    variant="outlined"
                    size="small"
                    name="name"
                    value={protocol.name}
                    onChange={handleChange}
                    error={!protocol.name || (selected === 'New' && protocol.name in protocols)}
                    fullWidth
                  ></TextField>
                </Tooltip>
                <Tooltip
                  placement="bottom"
                  title="Color representing this protocol, which is the background of each displayed day."
                >
                  <TextField
                    label="Color"
                    variant="outlined"
                    size="small"
                    name="color"
                    type="color"
                    value={protocol.color || '#000000'}
                    sx={{
                      width: 100,
                      borderRadius: '3px',
                      backgroundColor: protocol.color || '#000000',
                      '& input::-webkit-color-swatch': {border: 'none'},
                      '& input::-moz-color-swatch': {border: 'none'},
                      '& label': {
                        backgroundColor: theme.palette.background.paper,
                        borderRadius: '25px',
                        pl: 1,
                        pr: 1,
                        pb: 0.5,
                        ml: '-5px',
                      },
                    }}
                    onChange={handleChange}
                  ></TextField>
                </Tooltip>
                <Tooltip
                  placement="right"
                  title="Number of days this protocol spans; 0 = An even portion of study days, < 1 = A given percentage of study days, >= 1 Number of days."
                >
                  <TextField
                    label="Days"
                    variant="outlined"
                    size="small"
                    name="days"
                    type="number"
                    value={protocol.days}
                    onChange={handleChange}
                    sx={{width: 100}}
                    inputProps={{min: 0}}
                  ></TextField>
                </Tooltip>
              </Stack>
              <Typography variant="h6">Beep Distribution</Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip placement="left" title="Minutes after initial active hour to allow beeps.">
                  <TextField
                    label="Start Offset"
                    variant="outlined"
                    size="small"
                    name="offset"
                    type="number"
                    value={protocol.offset}
                    onChange={handleChange}
                    inputProps={{min: 0}}
                    fullWidth
                  ></TextField>
                </Tooltip>
                <Tooltip placement="right" title="Minutes after initial active hour to allow beeps.">
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={protocol.random_start || false}
                          name="random_start"
                          onChange={handleChange}
                        ></Checkbox>
                      }
                      label="Random Start"
                    />
                  </FormControl>
                </Tooltip>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Tooltip placement="left" title="Number of beeps to send each day.">
                  <TextField
                    label="Beeps"
                    variant="outlined"
                    size="small"
                    name="beeps"
                    type="number"
                    value={protocol.beeps}
                    onChange={handleChange}
                    inputProps={{min: 1}}
                    fullWidth
                  ></TextField>
                </Tooltip>
                <Tooltip placement="right" title="Minimum minutes between beeps.">
                  <TextField
                    label="Minimum Separation"
                    variant="outlined"
                    size="small"
                    name="minsep"
                    type="number"
                    value={protocol.minsep}
                    onChange={handleChange}
                    inputProps={{min: 0}}
                    fullWidth
                  ></TextField>
                </Tooltip>
              </Stack>
              <Tooltip placement="right" title="Options dictate how beeps are placed within days.">
                <FormControl>
                  <InputLabel id="protocol-label-randomization">Randomization</InputLabel>
                  <Select
                    label="Randomization"
                    size="small"
                    labelId="protocol-label-randomization"
                    value={protocol.randomization || 'none'}
                    name="randomization"
                    onChange={handleSelectChange}
                    sx={{'& p': {overflow: 'hidden', textOverflow: 'ellipsis'}}}
                  >
                    <MenuItem value="none">
                      <ListItemText primary="None" secondary="Places beeps exactly every Minimum separation apart." />
                    </MenuItem>
                    <MenuItem value="binned">
                      <ListItemText
                        primary="Binned"
                        secondary="Draws a time between the participant's time range, and places a beep if the time is not within a blackout range or within Minimum separation from another beep."
                      />
                    </MenuItem>
                    <MenuItem value="independent">
                      <ListItemText
                        primary="Independent"
                        secondary="Minutes after each beep to schedule a reminder text, which is canceled if the survey is accessed. 0 = No reminder."
                      />
                    </MenuItem>
                  </Select>
                </FormControl>
              </Tooltip>
              <Typography variant="h6">Survey Access</Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip placement="left" title="Minutes after each beep to allow access to the survey.">
                  <TextField
                    label="Close After"
                    variant="outlined"
                    size="small"
                    name="close_after"
                    type="number"
                    value={protocol.close_after}
                    onChange={handleChange}
                    inputProps={{min: 0}}
                    fullWidth
                  ></TextField>
                </Tooltip>
                <Tooltip
                  placement="right"
                  title="Number of time the survey can be accessed within each beep period; blank = Unrestricted."
                >
                  <TextField
                    label="Allowed Accesses"
                    variant="outlined"
                    size="small"
                    name="accesses"
                    type="number"
                    value={protocol.accesses}
                    onChange={handleChange}
                    inputProps={{min: 1}}
                    fullWidth
                  ></TextField>
                </Tooltip>
              </Stack>
              <Typography variant="h6">Message</Typography>
              <Tooltip placement="right" title="Message to send with each beep.">
                <TextField
                  label="Initial Message"
                  variant="outlined"
                  size="small"
                  name="initial_message"
                  value={protocol.initial_message}
                  onChange={handleChange}
                  error={!protocol.initial_message}
                ></TextField>
              </Tooltip>
              <Tooltip placement="right" title="Link to the survey.">
                <TextField
                  label="Link"
                  variant="outlined"
                  size="small"
                  name="link"
                  value={protocol.link}
                  onChange={handleChange}
                ></TextField>
              </Tooltip>
              <Tooltip
                placement="right"
                title="Name of the parameter identifying each participant, to be added to the link."
              >
                <TextField
                  label="ID Parameter"
                  variant="outlined"
                  size="small"
                  name="id_parameter"
                  value={protocol.id_parameter}
                  onChange={handleChange}
                ></TextField>
              </Tooltip>
              <Typography variant="h6">Reminder</Typography>
              <Tooltip
                placement="right"
                title="Message to send after `remind after` minutes for each beep if the survey has not been accessed."
              >
                <TextField
                  label="Reminder message"
                  variant="outlined"
                  size="small"
                  name="reminder_message"
                  value={protocol.reminder_message}
                  onChange={handleChange}
                  fullWidth
                ></TextField>
              </Tooltip>
              <Stack direction="row" spacing={1}>
                <Tooltip
                  placement="left"
                  title="Minutes after each beep to schedule a reminder text, which is canceled if the survey is accessed. 0 = No reminder."
                >
                  <TextField
                    label="Remind After"
                    variant="outlined"
                    size="small"
                    name="reminder_after"
                    type="number"
                    value={protocol.reminder_after}
                    onChange={handleChange}
                    inputProps={{min: 0}}
                  ></TextField>
                </Tooltip>
                <Tooltip
                  placement="right"
                  title="If checked, the link is sent with the reminder message as well as the initial message."
                >
                  <FormControl fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={protocol.reminder_link || false}
                          name="reminder_link"
                          onChange={handleChange}
                        ></Checkbox>
                      }
                      label="Link with Reminder"
                    />
                  </FormControl>
                </Tooltip>
              </Stack>
            </Stack>
            {protocol.initial_message && (
              <Stack>
                <Typography variant="h6">Message Preview</Typography>
                <MessagePreview spec={protocol} />
                <MessagePreview reminder={true} spec={protocol} />
              </Stack>
            )}
          </Stack>
        </Paper>
      </DialogContent>
      <DialogActions sx={{justifyContent: 'space-between'}}>
        <Button variant="contained" color="error" disabled={selected === 'New'} onClick={deleteProtocol}>
          Delete
        </Button>
        <Box>
          <Button disabled={!changed} onClick={() => updateState({type: 'replace', protocol: protocols[selected]})}>
            Reset
          </Button>
          {selected === 'New' ? (
            <Button variant="contained" disabled={!protocol.name} onClick={submitProtocol}>
              Add
            </Button>
          ) : (
            <ConfirmUpdate disabled={!changed} name={'protocol ' + selected} onConfirm={submitProtocol} />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}
