import {Close, Delete} from '@mui/icons-material'
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography} from '@mui/material'
import {useState} from 'react'

export function ConfirmDelete({
  name,
  onConfirm,
  disabled,
  icon,
}: {
  name: string
  onConfirm: () => void
  disabled?: boolean
  icon?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  return (
    <>
      {icon ? (
        <IconButton color="error" onClick={toggleMenu} aria-label="delete" disabled={disabled}>
          <Delete />
        </IconButton>
      ) : (
        <Button color="error" variant="contained" onClick={toggleMenu} disabled={disabled}>
          Delete
        </Button>
      )}
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
            <Typography>{'This will completely remove ' + name + '.'}</Typography>
          </DialogContent>
          <DialogActions sx={{justifyContent: 'space-between'}}>
            <Button onClick={toggleMenu}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                onConfirm()
                toggleMenu()
              }}
            >
              {'delete ' + name}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
