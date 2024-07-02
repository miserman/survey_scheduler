import {Button, Stack, TextField} from '@mui/material'
import {SyntheticEvent} from 'react'

export const defaultFilter = {
  id: '',
  phone: '',
  protocols: [] as string[],
  orders: [] as string[],
  firstBeep_before: 0,
  firstBeep_after: 0,
  lastBeep_before: 0,
  lastBeep_after: 0,
  upcoming: true,
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
}: {
  filter: Filter
  filterAction: (action: ParticipantFilterUpdateAction) => void
}) {
  const handleChange = (e: SyntheticEvent, value?: string | number | boolean) => {
    if ('name' in e.target && 'value' in e.target) {
      filterAction({type: 'update', key: e.target.name as 'id', value: e.target.value as string})
    }
  }
  return (
    <>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="ID Contains" name="id" value={filter.id} onChange={handleChange} />
          <Button onClick={() => filterAction({type: 'update', key: 'id', value: ''})}>Clear</Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Phone Contains" name="phone" value={filter.phone} onChange={handleChange} />
          <Button onClick={() => filterAction({type: 'update', key: 'phone', value: ''})}>Clear</Button>
        </Stack>
      </Stack>
    </>
  )
}
