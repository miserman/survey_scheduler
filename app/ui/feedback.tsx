import {Alert, Snackbar} from '@mui/material'

export default function Feedback({message, clearMessage}: {message: string; clearMessage: () => void}) {
  return (
    <Snackbar open={!!message} onClose={clearMessage}>
      <Alert onClose={clearMessage} severity="error" variant="filled">
        {message}
      </Alert>
    </Snackbar>
  )
}
