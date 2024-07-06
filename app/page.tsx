'use client'
import {forwardRef, useContext, useEffect, useMemo, useState} from 'react'
import {Button, Card, CardActions, CardContent, CardHeader, Slide, useTheme} from '@mui/material'
import {StudiesList} from './ui/studiesList'
import {operation} from '@/utils/operation'
import {AddStudy} from './ui/addStudy'
import {FeedbackContext, SessionContext} from './context'

export default function Home() {
  const theme = useTheme()
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)

  const [studies, setStudies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (session.signedin) {
      setLoading(true)
      const getStudyNames = async () => {
        const res = await operation({type: 'list_studies'})
        if (res.error) {
          notify('failed to list studies: ' + res.status)
          setStudies([])
        } else {
          setStudies(res.content as string[])
        }
        setLoading(false)
      }
      getStudyNames()
    }
  }, [session.signedin, notify])

  const [newStudy, setNewStudy] = useState(false)
  const NewStudy = useMemo(
    () =>
      forwardRef<HTMLDivElement>(function AddStudyWrap(props, ref) {
        return (
          <div ref={ref} {...props}>
            <AddStudy existing={studies} />
          </div>
        )
      }),
    [studies]
  )
  const ExistingStudies = useMemo(
    () =>
      forwardRef<HTMLDivElement>(function StudiesListWrap(props, ref) {
        return (
          <div ref={ref} {...props}>
            <StudiesList signedin={session.signedin} studies={studies} updateStudies={setStudies} loading={loading} />
          </div>
        )
      }),
    [session.signedin, studies, loading]
  )

  return (
    <Card sx={{width: 400, maxWidth: '100%', margin: 'auto', mt: 5}} variant="outlined">
      <CardHeader title="Studies" />
      <CardContent sx={{p: 0, backgroundColor: theme.palette.action.selected}}>
        <Slide direction="left" in={newStudy}>
          <NewStudy />
        </Slide>
        <Slide direction="right" in={!newStudy} appear={false}>
          <ExistingStudies />
        </Slide>
      </CardContent>
      <CardActions sx={{justifyContent: 'right'}}>
        <Button variant="contained" onClick={() => setNewStudy(!newStudy)} disabled={!session.signedin}>
          {newStudy ? 'Existing Studies' : 'New Study'}
        </Button>
      </CardActions>
    </Card>
  )
}
