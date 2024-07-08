import {operation} from '@/utils/operation'
import {Button, Divider, IconButton, List, ListItem, ListItemButton, ListItemText, Skeleton} from '@mui/material'
import {ConfirmDelete} from './confirmDelete'
import {useContext} from 'react'
import {FeedbackContext} from '../context'
import {useRouter} from 'next/navigation'
import {Delete} from '@mui/icons-material'

export function StudiesList({
  signedin,
  studies,
  updateStudies,
  loading,
}: {
  signedin: boolean
  studies: string[]
  updateStudies: (studies: string[]) => void
  loading: boolean
}) {
  const router = useRouter()
  const notify = useContext(FeedbackContext)
  return (
    <List>
      {signedin ? (
        studies.length ? (
          studies.map(study => (
            <ListItem
              key={study}
              disableGutters
              sx={{pb: 1}}
              secondaryAction={
                <ConfirmDelete
                  name={'study ' + study}
                  onConfirm={async () => {
                    const res = await operation({type: 'remove_study', study})
                    if (res.error) {
                      notify('failed to remove study ' + study + ': ' + res.status)
                    } else {
                      notify('removed study ' + study)
                      studies.splice(studies.indexOf(study))
                      updateStudies(studies)
                    }
                  }}
                  icon={true}
                />
              }
            >
              <ListItemButton onClick={() => router.push('/study/' + study)}>
                <ListItemText primary={study} />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <ListItem
            disableGutters
            secondaryAction={
              <IconButton disabled>
                <Delete />
              </IconButton>
            }
          >
            <ListItemButton disabled>
              <ListItemText primary={loading ? <Skeleton variant="text" animation="wave" /> : 'No existing studies.'} />
            </ListItemButton>
          </ListItem>
        )
      ) : (
        <ListItem disableGutters sx={{p: 1, pt: 1.72, pb: 1.72}}>
          <Button variant="contained" sx={{mr: 1}} component="a" href="/signin">
            Sign in
          </Button>
          <ListItemText primary="to view available studies." />
        </ListItem>
      )}
      <Divider />
      <ListItem disableGutters>
        <ListItemButton onClick={() => router.push('/study/demo')}>
          <ListItemText primary="demo" />
        </ListItemButton>
      </ListItem>
    </List>
  )
}
