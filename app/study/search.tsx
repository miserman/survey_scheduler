import {
  Stack,
  FormGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton,
  Checkbox,
  Typography,
  TextField,
  Button,
  Paper,
} from '@mui/material'
import {Menu as MenuIcon} from '@mui/icons-material'
import React, {Ref} from 'react'

export const makeSearch = (
  {searchAdjust, setSearchDrawer}: {searchAdjust: number; setSearchDrawer: () => void},
  ref: Ref<HTMLDivElement>
) => {
  return (
    <Paper sx={{position: 'absolute', bottom: 0, width: '100%', marginBottom: -searchAdjust + 'px'}} ref={ref}>
      <Stack component="form" direction="row" spacing={1}>
        <IconButton sx={{p: 2}} aria-label="menu" onClick={setSearchDrawer}>
          <MenuIcon />
        </IconButton>
        <TextField variant="filled" label="Filter by ID" />
        <Button variant="outlined">Reset</Button>
      </Stack>
      <Stack direction="row" spacing={3} sx={{p: 1, marginLeft: '56px'}}>
        <TextField variant="filled" label="Phone contains" />
        <FormControl component="fieldset">
          <FormLabel component="legend">Order Type</FormLabel>
          <FormGroup>
            {['Shuffle', 'Sample', 'Ordered'].map(item => {
              return <FormControlLabel key={item} label={item} control={<Checkbox defaultChecked />} />
            })}
          </FormGroup>
        </FormControl>
        <FormControl component="fieldset">
          <FormLabel component="legend">Used</FormLabel>
          <FormGroup>
            {['signal', 'event'].map(item => {
              return <FormControlLabel key={item} label={item} control={<Checkbox defaultChecked />} />
            })}
          </FormGroup>
        </FormControl>
        <Stack spacing={1}>
          <Typography>First Beep</Typography>
          <TextField variant="filled" label="After" type="date"></TextField>
          <TextField variant="filled" label="Before" type="date"></TextField>
        </Stack>
        <Stack spacing={1}>
          <Typography>Last Beep</Typography>
          <TextField variant="filled" label="After" type="date" InputLabelProps={{filled: false}}></TextField>
          <TextField variant="filled" label="Before" type="date"></TextField>
        </Stack>
      </Stack>
    </Paper>
  )
}
