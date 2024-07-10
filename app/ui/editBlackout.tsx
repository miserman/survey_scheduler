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
import {DatePicker, TimePicker} from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import {useState} from 'react'

export function EditBlackout({
  blackout,
  onRemove,
  onUpdate,
  format,
  isTime,
}: {
  blackout: Blackout
  onRemove: () => void
  onUpdate: (blackout: Blackout) => void
  format: string
  isTime?: boolean
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
              dayjs(blackout.start).format(format)
            ) : (
              <>
                <span>{dayjs(blackout.start).format(format)}</span> - <span>{dayjs(blackout.end).format(format)}</span>
              </>
            )}
          </Typography>
        }
        onDelete={onRemove}
        onClick={toggleMenu}
      />
      {menuOpen && (
        <Dialog open={menuOpen} onClose={toggleMenu}>
          <DialogTitle>Blackout Editor</DialogTitle>
          <IconButton
            aria-label="close blackout editor"
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
            {isTime ? (
              <Stack spacing={2} direction="row">
                <TimePicker
                  value={dayjs(start)}
                  sx={{'& input': {p: 1, maxWidth: 110}}}
                  label="Start"
                  onChange={time => {
                    if (time) {
                      const value = time.valueOf()
                      if (value > end) setEnd(value)
                      setStart(value)
                    }
                  }}
                ></TimePicker>
                <TimePicker
                  value={dayjs(end)}
                  sx={{'& input': {p: 1, maxWidth: 110}}}
                  label="End"
                  onChange={time => {
                    if (time) {
                      const value = time.valueOf()
                      if (value < start) setStart(value)
                      setEnd(value)
                    }
                  }}
                ></TimePicker>
              </Stack>
            ) : (
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
            )}
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
