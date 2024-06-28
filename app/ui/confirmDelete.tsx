import {Close, Delete} from '@mui/icons-material'
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography} from '@mui/material'
import {useState} from 'react'

export function ConfirmDelete({name, onConfirm}: {name: string; onConfirm: () => void}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen(!menuOpen)
  return (
    <>
      <IconButton color="error" onClick={toggleMenu} aria-label="delete">
        <Delete />
      </IconButton>
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
