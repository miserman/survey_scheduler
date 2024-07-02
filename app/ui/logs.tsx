import {Close} from '@mui/icons-material'
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import {useContext, useEffect, useState} from 'react'
import {operation} from '@/utils/operation'
import {FeedbackContext, SessionContext} from '../context'

const fileNameSeps = /[_.]/g
function formatLogName(file: string) {
  const parts = file.split(fileNameSeps)
  const lastPart = parts.length - 2
  if (lastPart < 0 || parts[lastPart].length < 6) return file
  const d = parts[lastPart].split('')
  return d[0] + d[1] + '/' + d[2] + d[3] + '/' + d[4] + d[5]
}
type LogMetadata = {name: string; date: string; time: Date}
function byTime(a: LogMetadata, b: LogMetadata) {
  return a.time > b.time ? -1 : 1
}
export default function ListLogs({study, open, onClose}: {study: string; open: boolean; onClose: () => void}) {
  const session = useContext(SessionContext)
  const theme = useTheme()
  const notify = useContext(FeedbackContext)
  const [logs, setLogs] = useState<{name: string; date: string; time: Date}[]>([])
  useEffect(() => {
    if (study && session.signedin) {
      const getLogFiles = async () => {
        const res = await operation({type: 'list_logs', study})
        if (res.error) {
          notify('failed to list logs: ' + res.status)
          setLogs([])
        } else {
          setLogs(
            (res.content as string[])
              .map(name => {
                const date = formatLogName(name)
                return {
                  name,
                  date,
                  time: new Date(date),
                }
              })
              .sort(byTime)
          )
        }
      }
      getLogFiles()
    }
  }, [study, session.signedin, notify])
  const requestLog = async (file: string) => {
    const res = await operation({type: 'view_log', study, file})
    if (res.error) {
      notify('failed to retrieve log ' + file + ': ' + res.status)
    } else {
      setCurrentLog({file, content: res.content as string})
    }
  }
  const [currentLog, setCurrentLog] = useState({file: '', content: ''})
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      sx={{position: 'fixed', top: 48, right: 0, bottom: 0, left: 0, zIndex: 1300}}
    >
      <DialogTitle sx={{pb: 1}}>Server Logs Viewer</DialogTitle>
      <IconButton
        aria-label="close logs viewer"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 12,
        }}
        className="close-button"
      >
        <Close />
      </IconButton>
      <DialogContent sx={{p: 0, overflow: 'hidden'}}>
        <Stack direction="row">
          <List sx={{p: 0, pt: 4}}>
            {logs.length ? (
              logs.map(({name, date}) => (
                <ListItem sx={{p: 0}} key={name}>
                  <ListItemButton dense onClick={() => requestLog(name)} selected={name === currentLog.file}>
                    <ListItemText primary={date} />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <ListItem sx={{p: 0}}>
                <ListItemButton disabled>
                  <ListItemText primary="No logs found" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
          <Stack direction="column" sx={{position: 'relative', width: '100%', height: '100vh'}}>
            <Typography variant="h6" sx={{position: 'absolute', top: 0}}>
              {currentLog.file ? new Date(formatLogName(currentLog.file)).toDateString() : ''}
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                top: 33,
                bottom: 56,
                width: '100%',
                overflow: 'auto',
                background: theme.palette.mode === 'dark' ? '#000' : '#fff',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '.8em',
                  whiteSpace: 'break-spaces',
                  p: 1,
                  pt: 0.5,
                  pb: 4,
                }}
              >
                {currentLog.content}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
