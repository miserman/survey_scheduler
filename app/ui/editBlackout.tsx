import {Blackout} from '@/lib/blackout'
import {Close} from '@mui/icons-material'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import {DatePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {useState} from 'react'

export function EditBlackout({
  blackout,
  onRemove,
  onUpdate,
}: {
  blackout: Blackout
  onRemove: () => void
  onUpdate: (blackout: Blackout) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  const [start, setStart] = useState(blackout.start)
  const [end, setEnd] = useState(blackout.start)
  return (
    <>
      <Chip
        label={
          <Typography>
            {blackout.start === blackout.end ? (
              dayjs(blackout.start).format('ddd M/D/YY')
            ) : (
              <>
                <span>{dayjs(blackout.start).format('ddd M/D/YY')}</span> -{' '}
                <span>{dayjs(blackout.end).format('ddd M/D/YY')}</span>
              </>
            )}
          </Typography>
        }
        onDelete={onRemove}
        onClick={toggleMenu}
      />
      {menuOpen && (
        <Dialog open={menuOpen} onClose={toggleMenu}>
          <DialogTitle>Blackout Days Editor</DialogTitle>
          <IconButton
            aria-label="close day blackout editor"
            onClick={toggleMenu}
            sx={{
              position: 'absolute',
              right: 8,
              top: 12,
            }}
            className="close-button"
          >
            <Close />
          </IconButton>
          <DialogContent>
            <Stack spacing={2} direction="row">
              <DatePicker
                value={dayjs(start)}
                sx={{'& input': {p: 1, maxWidth: 110}}}
                label="Start"
                onChange={date => {
                  if (date) {
                    const value = date.valueOf()
                    if (value > end) setEnd(value)
                    setStart(value)
                  }
                }}
              ></DatePicker>
              <DatePicker
                value={dayjs(end)}
                sx={{'& input': {p: 1, maxWidth: 110}}}
                label="End"
                onChange={date => {
                  if (date) {
                    const value = date.valueOf()
                    if (value < start) setStart(value)
                    setEnd(value)
                  }
                }}
              ></DatePicker>
            </Stack>
          </DialogContent>
          <DialogActions sx={{justifyContent: 'space-between'}}>
            <Button color="error" variant="contained" onClick={onRemove}>
              Delete
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                onUpdate(new Blackout({start, end}))
                toggleMenu()
              }}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
