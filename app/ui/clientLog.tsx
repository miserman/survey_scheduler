import {Close} from '@mui/icons-material'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import {useMemo, useState} from 'react'

export type LogEntry = {time: string; message: string}
export type LogHistory = LogEntry[]

export function ClientLog({history}: {history: LogHistory}) {
  const [open, setOpen] = useState(false)
  const toggleDrawer = () => setOpen(!open)
  const nEvents = history.length
  const historyList = useMemo(() => {
    if (history.length) {
      const list = history.map((entry, i) => (
        <ListItem key={i} sx={{pt: 0, pb: 0, alignItem: 'baseline'}}>
          <ListItemIcon>
            <Typography variant="caption" sx={{pt: '4px', pr: 1, opacity: 0.7}}>
              {entry.time}
            </Typography>
          </ListItemIcon>
          <ListItemText primary={entry.message} />
        </ListItem>
      ))
      requestAnimationFrame(() => {
        const e = document.getElementById('client_event_log')
        if (e && e.lastElementChild) e.lastElementChild.scrollIntoView()
      })
      return list
    }
  }, [history])
  return (
    <>
      <Button
        onClick={toggleDrawer}
        sx={{
          maxWidth: '100%',
          textTransform: 'none',
          justifyContent: 'left',
          color: 'text.primary',
          textWrap: 'nowrap',
          pt: 1,
          pb: 1,
        }}
        disabled={!nEvents}
      >
        {!!nEvents && (
          <Typography
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span className="note">{history[0].time + ': '}</span>
            {history[0].message}
          </Typography>
        )}
      </Button>
      {open && (
        <Drawer open={open} onClose={toggleDrawer} anchor="right" sx={{maxWidth: '100%', zIndex: 1302}}>
          <Card sx={{height: '100%'}}>
            <CardHeader title="Event Log" sx={{pb: 1}} />
            <IconButton
              aria-label="close event logs"
              onClick={toggleDrawer}
              sx={{
                position: 'absolute',
                right: 8,
                top: 12,
              }}
              className="close-button"
            >
              <Close />
            </IconButton>
            <CardContent sx={{p: 0, maxHeight: '100%', overflowY: 'auto'}}>
              <List id="client_event_log">{historyList}</List>
            </CardContent>
          </Card>
        </Drawer>
      )}
    </>
  )
}
