import {
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  FormControlLabel,
  Switch,
  Tooltip,
  TextField,
  FormLabel,
  FormGroup,
  Drawer,
  useTheme,
} from '@mui/material'
import {MENU_WIDTH} from '../params'
import {useThemeSetter} from '../root'

export const SideMenu = ({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) => {
  const theme = useTheme()
  const setTheme = useThemeSetter()
  return (
    <Drawer
      sx={{
        '& .MuiDrawer-paper': {
          p: 1,
          width: MENU_WIDTH,
          boxSizing: 'border-box',
        },
      }}
      variant="persistent"
      open={isOpen}
      onClose={onClose}
    >
      <Box sx={{marginBottom: 1}}>
        <Button onClick={onClose} variant="outlined" fullWidth>
          Close
        </Button>
      </Box>
      <Button>sign out</Button>
      <Button>change study</Button>
      <Typography variant="h5">Data</Typography>
      <Button>rescan</Button>
      <Button>export</Button>
      <Button>logs</Button>
      <Typography variant="h6">Options</Typography>
      <Grid container spacing={1}>
        <Grid sx={{width: '100%'}} item>
          <FormControl fullWidth>
            <FormControlLabel
              label="Dark"
              control={
                <Switch
                  checked={theme.palette.mode === 'dark'}
                  onChange={() => setTheme(theme.palette.mode === 'dark' ? 'light' : 'dark')}
                />
              }
            />
          </FormControl>
        </Grid>
        <Grid item>
          <Tooltip placement="right" title="Resolution of the timeline; increase to see more distant beeps.">
            <TextField size="small" type="number" label="time scale" defaultValue="1" fullWidth />
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip
            placement="right"
            title="Number of days before and after the current time to show schedules, based on their first and last beep."
          >
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{marginBottom: 1}}>
                Day Range
              </FormLabel>
              <FormGroup sx={{flexWrap: 'nowrap'}} row>
                <TextField size="small" type="number" defaultValue="1" label="first" sx={{marginRight: 1}} />
                <TextField size="small" type="number" defaultValue="1" label="last" />
              </FormGroup>
            </FormControl>
          </Tooltip>
        </Grid>
      </Grid>
      <Button variant="outlined" sx={{marginTop: 5}} color="error">
        Clear Storage
      </Button>
    </Drawer>
  )
}
