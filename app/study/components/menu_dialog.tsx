import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material'
import {SyntheticEvent, useState, ReactNode} from 'react'
import CloseIcon from '@mui/icons-material/Close'
import type {Blackout} from '../types'
import Schedule from '../classes/schedule'

export const editData = <DataType, _>(
  state: DataType,
  action: {
    key: string
    value: boolean | boolean[] | string[] | Blackout[] | Schedule[] | string | number | DataType
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

export const trackEdits = (edits: Map<string, any>, key: string, value: any, original: any) => {
  if (edits.has(key)) {
    if (edits.get(key) === ('object' === typeof value ? JSON.stringify(value) : value)) edits.delete(key)
  } else {
    edits.set(
      key,
      'undefined' === typeof original
        ? 'boolean' === typeof value
          ? false
          : ''
        : 'number' === typeof original
        ? original + ''
        : 'object' === typeof original
        ? JSON.stringify(original)
        : original
    )
  }
}

export const MenuDialog = ({
  isOpen,
  onClose,
  edited,
  title,
  options,
  onChange,
  children,
  onRemove,
  onAddUpdate,
  selected,
}: {
  isOpen: boolean
  onClose: () => void
  edited: boolean
  title: string
  options: string[]
  onChange: (option: string) => void
  children: ReactNode
  onRemove: (option: string) => void
  onAddUpdate: (option: string) => string
  selected?: number
}) => {
  const openSet = 'undefined' === typeof selected
  const [currentOption, setCurrentOption] = useState(options[selected || 0])
  const [isNewOption, setIsNewOption] = useState(true)
  const handleSelect = (e: SyntheticEvent | SelectChangeEvent | null, selection: string | ReactNode) => {
    const value = 'string' === typeof selection ? selection : e && 'value' in e.target ? e.target.value : ''
    setIsNewOption(value === 'New')
    setCurrentOption(value)
    onChange(value)
  }
  const handleRemove = () => {
    onRemove(currentOption)
    handleSelect(null, openSet ? 'New' : options[0])
  }
  const handleReset = () => {
    handleSelect(null, currentOption)
  }
  const handleAdd = () => {
    const newOption = onAddUpdate(currentOption)
    if (newOption !== '') handleSelect(null, newOption)
  }
  return (
    <Dialog scroll="paper" open={isOpen} onClose={onClose}>
      <DialogTitle sx={{textAlign: 'center'}}>{title}</DialogTitle>
      <IconButton
        aria-label="Close"
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
        }}
        onClick={() => {
          onClose()
        }}
      >
        <CloseIcon />
      </IconButton>
      {openSet ? (
        <Autocomplete
          disableClearable
          options={options}
          value={currentOption || options[0]}
          onChange={handleSelect}
          renderOption={(props, option) => (
            <li {...props} key={option}>
              {option}
            </li>
          )}
          renderInput={params => <TextField {...params} aria-label={title} />}
        ></Autocomplete>
      ) : options.length === 1 ? (
        <Typography>{options[0]}</Typography>
      ) : (
        <Select value={currentOption || options[0]} onChange={handleSelect}>
          {options.map(option => (
            <MenuItem key={option} value={option}>
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      )}
      <DialogContent sx={{p: 0, paddingTop: 1}}>{children}</DialogContent>
      <DialogActions sx={{p: 0, '& .MuiButtonBase-root': {padding: 2}}}>
        <Button color="error" disabled={openSet && isNewOption} onClick={handleRemove}>
          Remove
        </Button>
        <Button disabled={!edited} onClick={handleReset}>
          Reset
        </Button>
        <Button disabled={isNewOption ? false : !edited} onClick={handleAdd} fullWidth>
          {openSet && isNewOption ? 'Add' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
