import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material'
import {SyntheticEvent, useState, ReactNode} from 'react'
import CloseIcon from '@mui/icons-material/Close'

export const editData = (
  state: {[index: string]: any},
  action: {
    key: string
    value: boolean | string | number | {[index: string]: any}
  }
) => {
  if ('object' !== typeof action.value) {
    const newState = {...state}
    ;(newState[action.key] as typeof action.value) = action.value
    return newState
  }
  return {...action.value}
}

export const trackEdits = (edits: Map<string, any>, key: string, value: any, original: any) => {
  if (edits.has(key)) {
    if (edits.get(key) === value) edits.delete(key)
  } else {
    edits.set(
      key,
      'undefined' === typeof original
        ? 'boolean' === typeof value
          ? false
          : ''
        : 'number' === typeof original
        ? original + ''
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
}) => {
  const [currentOption, setCurrentOption] = useState(options[0])
  const [isNewOption, setIsNewOption] = useState(true)
  const handleSelect = (e: SyntheticEvent | null, value: string) => {
    setIsNewOption(value === 'New')
    setCurrentOption(value)
    onChange(value)
  }
  const handleRemove = () => {
    onRemove(currentOption)
    handleSelect(null, 'New')
  }
  const handleAdd = () => {
    const newUser = onAddUpdate(currentOption)
    handleSelect(null, newUser)
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
      <Autocomplete
        disableClearable
        sx={{marginBottom: 4}}
        options={options}
        value={currentOption}
        onChange={handleSelect}
        renderOption={(props, option) => (
          <li {...props} key={option}>
            {option}
          </li>
        )}
        renderInput={params => <TextField {...params} aria-label={title} />}
      ></Autocomplete>
      <DialogContent sx={{p: 0, paddingTop: 1}}>{children}</DialogContent>
      <DialogActions sx={{p: 0, '& .MuiButtonBase-root': {padding: 2}}}>
        <Button disabled={isNewOption} onClick={handleRemove}>
          Remove
        </Button>
        <Button disabled={isNewOption ? false : !edited} onClick={handleAdd} fullWidth>
          {isNewOption ? 'Add' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
