import type {Protocol} from '../types'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
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
} from '@mui/material'
import {ReactNode, SyntheticEvent} from 'react'

const url_protocol = /^https?:\/\//
const Message = ({reminder, spec}: {reminder?: boolean; spec: Partial<Protocol>}) => {
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
  return message ? (
    <Paper elevation={4} sx={{p: 1, m: 1, maxWidth: '200px', wordBreak: 'break-word'}}>
      {content}
    </Paper>
  ) : (
    <></>
  )
}

export const AddEditProtocol = ({
  protocol,
  edit,
}: {
  protocol: Partial<Protocol>
  edit: (key: string, value: boolean | string | number) => void
}) => {
  const handleValueChange = (e: SyntheticEvent, value?: boolean | string | number) => {
    const key = 'name' in e.target ? (e.target.name as keyof Protocol) : ''
    if (undefined === value && 'value' in e.target) value = e.target.value as string
    if (key && undefined !== value) {
      edit(key, value)
    }
  }
  const handleValueSelect = (e: SelectChangeEvent) => {
    const key = 'name' in e.target ? (e.target.name as keyof Protocol) : ''
    if (key) {
      edit(key, e.target.value)
    }
  }
  return (
    <FormControl fullWidth>
      <Stack spacing={1}>
        <Tooltip placement="right" title="Unique name of this protocol.">
          <TextField
            label="Name"
            variant="outlined"
            name="name"
            value={protocol.name || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip
          placement="right"
          title="Color representing this protocol, which is the background of each displayed day."
        >
          <TextField
            label="Color"
            variant="outlined"
            name="color"
            type="color"
            value={protocol.color || '#000000'}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip
          placement="right"
          title="Number of days this protocol spans; 0 = An even portion of study days, < 1 = A given percentage of study days, >= 1 Number of days."
        >
          <TextField
            label="Days"
            variant="outlined"
            name="days"
            type="number"
            value={protocol.days || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Number of beeps to send each day.">
          <TextField
            label="Beeps"
            variant="outlined"
            name="beeps"
            type="number"
            value={protocol.beeps || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Minimum minutes between beeps.">
          <TextField
            label="Minimum Separation"
            variant="outlined"
            name="minsep"
            type="number"
            value={protocol.minsep || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Minutes after initial active hour to allow beeps.">
          <TextField
            label="Start Offset"
            variant="outlined"
            name="offset"
            type="number"
            value={protocol.offset || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Minutes after initial active hour to allow beeps.">
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Checkbox
                  checked={protocol.random_start || false}
                  name="random_start"
                  onChange={handleValueChange}
                ></Checkbox>
              }
              label="Random Start"
            />
          </FormControl>
        </Tooltip>
        <Tooltip placement="right" title="Options dictate how beeps are placed within days.">
          <FormControl>
            <InputLabel id="protocol-label-randomization">Randomization</InputLabel>
            <Select
              label="Randomization"
              labelId="protocol-label-randomization"
              value={protocol.randomization || 'none'}
              name="randomization"
              onChange={handleValueSelect}
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
        <Tooltip
          placement="right"
          title="Minutes after each beep to schedule a reminder text, which is canceled if the survey is accessed. 0 = No reminder."
        >
          <TextField
            label="Remind After"
            variant="outlined"
            name="remind_after"
            type="number"
            value={protocol.reminder_after || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Minutes after each beep to allow access to the survey.">
          <TextField
            label="Close After"
            variant="outlined"
            name="close_after"
            type="number"
            value={protocol.close_after || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip
          placement="right"
          title="Number of time the survey can be accessed within each beep period; blank = Unrestricted."
        >
          <TextField
            label="Allowed Accesses"
            variant="outlined"
            name="accesses"
            type="number"
            value={protocol.accesses || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip
          placement="right"
          title="Number of time the survey can be accessed within each beep period; blank = Unrestricted."
        >
          <TextField
            label="Allowed Accesses"
            variant="outlined"
            name="accesses"
            type="number"
            value={protocol.accesses || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Message to send with each beep.">
          <TextField
            label="Initial Message"
            variant="outlined"
            name="initial_message"
            value={protocol.initial_message || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip
          placement="right"
          title="Message to send after `remind after` minutes for each beep if the survey has not been accessed."
        >
          <TextField
            label="Reminder message"
            variant="outlined"
            name="reminder_message"
            value={protocol.reminder_message || ''}
            onChange={handleValueChange}
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
                  onChange={handleValueChange}
                ></Checkbox>
              }
              label="Link with Reminder"
            />
          </FormControl>
        </Tooltip>
        <Tooltip placement="right" title="Link to the survey.">
          <TextField
            label="Link"
            variant="outlined"
            name="link"
            value={protocol.link || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
        <Tooltip placement="right" title="Name of the parameter identifying each participant, to be added to the link.">
          <TextField
            label="ID Parameter"
            variant="outlined"
            name="id_parameter"
            value={protocol.id_parameter || ''}
            onChange={handleValueChange}
          ></TextField>
        </Tooltip>
      </Stack>
      <Stack>
        <Message spec={protocol} />
        <Message reminder={true} spec={protocol} />
      </Stack>
    </FormControl>
  )
}
