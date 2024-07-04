import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {SyntheticEvent} from 'react'
import {DateTimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {Close} from '@mui/icons-material'
import type {ParticipantSummary} from '@/lib/participant'

const orders = ['shuffle', 'sample', 'ordered']
export const defaultFilter = {
  id: '',
  phone: '',
  protocols: [] as string[],
  orders: [...orders],
  firstBeep_before: 0,
  firstBeep_after: 0,
  lastBeep_before: 0,
  lastBeep_after: 0,
  upcoming: false,
}
type Filter = typeof defaultFilter

export type ParticipantFilterUpdateAction =
  | {type: 'reset'}
  | {type: 'update'; key: keyof Filter; value: string | string[] | number | boolean}
export function updateFilter(state: Filter, action: ParticipantFilterUpdateAction) {
  const newState = {...state}
  if (action.type === 'reset') {
    Object.keys(newState).forEach(key => {
      const defaultValue = defaultFilter[key as keyof Filter]
      ;(newState[key as keyof Filter] as typeof defaultValue) = Array.isArray(defaultValue)
        ? [...defaultValue]
        : defaultValue
    })
  } else {
    newState[action.key as 'id'] = action.value as string
  }
  return newState
}

export function ParticipantFilter({
  filter,
  filterAction,
  summary,
}: {
  filter: Filter
  filterAction: (action: ParticipantFilterUpdateAction) => void
  summary: ParticipantSummary
}) {
  const handleChange = (e: SyntheticEvent, value?: string | number | boolean) => {
    if ('name' in e.target) {
      const key = e.target.name as keyof Filter
      if ('boolean' === typeof value) {
        if (key === 'upcoming') {
          filterAction({type: 'update', key, value})
        } else {
          const keyPath = key.split('.')
          const keyEntry = keyPath[0] as 'orders'
          const newValue = [...filter[keyEntry]]
          const i = newValue.indexOf(keyPath[1])
          if (-1 === i) {
            newValue.push(keyPath[1])
          } else {
            newValue.splice(i, 1)
          }
          filterAction({type: 'update', key: keyEntry, value: newValue})
        }
      } else if ('value' in e.target) {
        filterAction({type: 'update', key: e.target.name as 'id', value: e.target.value as string})
      }
    }
  }
  const protocols = Object.keys(summary.protocols)
  return (
    <>
      <Stack spacing={1} direction="row" sx={{pb: 1, justifyContent: 'space-between'}}>
        <FormControlLabel
          control={<Switch name="upcoming" checked={filter.upcoming} onChange={handleChange} />}
          label="Only Upcoming"
        />
        <Button size="small" variant="contained" onClick={() => filterAction({type: 'reset'})}>
          Reset
        </Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Paper elevation={5} sx={{p: 1}}>
          <Stack spacing={1}>
            <Typography>Participant Info</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="ID Contains" name="id" value={filter.id} onChange={handleChange} />
              <IconButton onClick={() => filterAction({type: 'update', key: 'id', value: ''})}>
                <Close />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Phone Contains"
                name="phone"
                value={filter.phone}
                onChange={handleChange}
              />
              <IconButton onClick={() => filterAction({type: 'update', key: 'phone', value: ''})}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
        <Paper elevation={5} sx={{p: 1}}>
          <Typography>Schedule Parameters</Typography>
          <Stack spacing={1} direction="row">
            <FormControl>
              <FormLabel>Order Types</FormLabel>
              <FormGroup>
                {orders.map(name => (
                  <FormControlLabel
                    key={name}
                    control={
                      <Checkbox
                        sx={{pt: 0, pb: 0}}
                        name={'orders.' + name}
                        checked={filter.orders.includes(name)}
                        onChange={handleChange}
                      />
                    }
                    label={name + ' (' + (name in summary.orders ? summary.orders[name] : 0) + ')'}
                  ></FormControlLabel>
                ))}
              </FormGroup>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => filterAction({type: 'update', key: 'orders', value: []})}>None</Button>
                <Button onClick={() => filterAction({type: 'update', key: 'orders', value: [...orders]})}>All</Button>
              </Stack>
            </FormControl>
            <FormControl>
              <FormLabel>Protocols</FormLabel>
              <FormGroup>
                {protocols.map(name => (
                  <FormControlLabel
                    key={name}
                    control={
                      <Checkbox
                        sx={{pt: 0, pb: 0}}
                        name={'protocols.' + name}
                        checked={filter.protocols.includes(name)}
                        onChange={handleChange}
                      />
                    }
                    label={name + ' (' + (name in summary.protocols ? summary.protocols[name] : 0) + ')'}
                  ></FormControlLabel>
                ))}
              </FormGroup>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => filterAction({type: 'update', key: 'protocols', value: []})}>None</Button>
                <Button onClick={() => filterAction({type: 'update', key: 'protocols', value: [...protocols]})}>
                  All
                </Button>
              </Stack>
            </FormControl>
          </Stack>
        </Paper>
        <Paper elevation={5} sx={{p: 1}}>
          <Typography>Beep Times</Typography>
          <Stack spacing={3} sx={{pt: 2}}>
            <Stack spacing={1} direction="row">
              <Stack direction="row">
                <DateTimePicker
                  value={dayjs(filter.firstBeep_after || summary.first.earliest)}
                  name="firstBeep_after"
                  label="First Beep After"
                  onChange={date =>
                    filterAction({type: 'update', key: 'firstBeep_after', value: date ? date.toDate().getTime() : 0})
                  }
                  sx={{'& input': {p: 1}}}
                ></DateTimePicker>
                <IconButton onClick={() => filterAction({type: 'update', key: 'firstBeep_after', value: 0})}>
                  <Close />
                </IconButton>
              </Stack>
              <Stack direction="row">
                <DateTimePicker
                  value={dayjs(filter.firstBeep_before || summary.first.latest)}
                  name="firstBeep_before"
                  label="First Beep Before"
                  onChange={date =>
                    filterAction({type: 'update', key: 'firstBeep_before', value: date ? date.toDate().getTime() : 0})
                  }
                  sx={{'& input': {p: 1}}}
                ></DateTimePicker>
                <IconButton onClick={() => filterAction({type: 'update', key: 'firstBeep_before', value: 0})}>
                  <Close />
                </IconButton>
              </Stack>
            </Stack>
            <Stack spacing={1} direction="row">
              <Stack direction="row">
                <DateTimePicker
                  value={dayjs(filter.lastBeep_after || summary.last.earliest)}
                  name="lastBeep_after"
                  label="Last Beep After"
                  onChange={date =>
                    filterAction({type: 'update', key: 'lastBeep_after', value: date ? date.toDate().getTime() : 0})
                  }
                  sx={{'& input': {p: 1}}}
                ></DateTimePicker>
                <IconButton onClick={() => filterAction({type: 'update', key: 'lastBeep_after', value: 0})}>
                  <Close />
                </IconButton>
              </Stack>
              <Stack direction="row">
                <DateTimePicker
                  value={dayjs(filter.lastBeep_before || summary.last.latest)}
                  name="lastBeep_before"
                  label="Last Beep Before"
                  onChange={date =>
                    filterAction({type: 'update', key: 'lastBeep_before', value: date ? date.toDate().getTime() : 0})
                  }
                  sx={{'& input': {p: 1}}}
                ></DateTimePicker>
                <IconButton onClick={() => filterAction({type: 'update', key: 'lastBeep_before', value: 0})}>
                  <Close />
                </IconButton>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </>
  )
}
