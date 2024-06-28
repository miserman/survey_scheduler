import {Close} from '@mui/icons-material'
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography} from '@mui/material'
import {useState} from 'react'

export function ConfirmUpdate({name, onConfirm, disabled}: {name: string; onConfirm: () => void; disabled?: boolean}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  return (
    <>
      <Button disabled={disabled} variant="contained" onClick={toggleMenu}>
        Update
      </Button>
      {menuOpen && (
        <Dialog open={menuOpen} onClose={toggleMenu}>
          <DialogTitle>Confirm</DialogTitle>
          <IconButton
            aria-label="close confirmation dialog"
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
            <Typography>{'This will permanently change ' + name + '.'}</Typography>
          </DialogContent>
          <DialogActions sx={{justifyContent: 'space-between'}}>
            <Button onClick={toggleMenu}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                onConfirm()
                toggleMenu()
              }}
            >
              {'Update ' + name}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
