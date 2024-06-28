import {operation} from '@/utils/operation'
import {Button, Stack, TextField} from '@mui/material'
import {useContext, useState} from 'react'
import {FeedbackContext} from '../context'
import {useRouter} from 'next/navigation'

export function AddStudy({existing}: {existing: string[]}) {
  const router = useRouter()
  const notify = useContext(FeedbackContext)
  const [study, setStudy] = useState('')
  const valid = study !== 'demo' && !existing.includes(study)
  return (
    <Stack direction="row" spacing={1} sx={{p: 1, position: 'absolute', justifyContent: 'space-around'}}>
      <TextField
        size="small"
        label="New Study"
        value={study}
        onChange={e => setStudy(e.target.value)}
        error={!valid}
      ></TextField>
      <Button
        variant="contained"
        onClick={async () => {
          const req = await operation({type: 'add_study', study})
          if (req.error) {
            notify('failed to add study ' + study + ': ' + req.status)
          } else {
            notify('added study ' + study)
            router.push('/study/' + study)
          }
        }}
        disabled={!study || !valid}
      >
        Add
      </Button>
    </Stack>
  )
}
