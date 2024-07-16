import Schedule, {statusLabels} from '@/lib/schedule'
import {Box, Button, Card, CardActions, CardContent, CardHeader, Stack, Tooltip, Typography} from '@mui/material'
import dayjs from 'dayjs'
import {useMemo} from 'react'
import {EditSchedule} from './editSchedule'
import type {Protocols} from '@/lib/protocol'

export function ScheduleDay({
  schedule,
  color,
  protocols,
  onRemove,
  onUpdate,
}: {
  schedule: Schedule
  color: string
  protocols: Protocols
  onRemove: () => void
  onUpdate: (schedule: Schedule) => void
}) {
  const times = useMemo(() => schedule.times.map(time => dayjs(time)), [schedule.times])
  const date = dayjs(schedule.date)
  let anyPending = false
  let anyPaused = false
  schedule.statuses.forEach(status => {
    if (status === 1) anyPending = true
    if (status === 6) anyPaused = true
  })
  return (
    <Card
      variant="outlined"
      sx={{minWidth: 85, display: 'flex', flexDirection: 'column', '& .MuiPaper-root': {height: '100%'}}}
    >
      <CardHeader
        title={
          <Stack spacing={1} sx={{textAlign: 'center'}}>
            {date.format('ddd M/D')}
            <Box
              sx={{
                fontSize: '.8em',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;',
                bgcolor: color,
              }}
            >
              {schedule.protocol}
            </Box>
          </Stack>
        }
        sx={{p: 0, pb: 1, pt: 1, '& span': {fontSize: '1em', whiteSpace: 'nowrap'}}}
      />
      <CardContent sx={{p: 0, flexGrow: 1, textAlign: 'center'}}>
        {times.map((time, index) => {
          return (
            <Tooltip key={index} title={time.toDate().toLocaleString()} placement="left">
              <Typography className={statusLabels[schedule.statuses[index]]} sx={{borderRadius: '15px', mb: 0.2}}>
                {time.format('hh:mm A')}
              </Typography>
            </Tooltip>
          )
        })}
      </CardContent>
      <CardActions sx={{p: 0}}>
        <Stack direction="column" sx={{width: '100%'}}>
          {anyPending ? (
            <Button
              size="small"
              onClick={() => {
                const statuses = schedule.statuses.map(status => {
                  return status === 1 ? 6 : status
                })
                onUpdate(new Schedule({...schedule, statuses}))
              }}
            >
              Pause
            </Button>
          ) : anyPaused ? (
            <Button
              size="small"
              onClick={() => {
                const statuses = schedule.statuses.map(status => {
                  return status === 6 ? 1 : status
                })
                onUpdate(new Schedule({...schedule, statuses}))
              }}
            >
              Resume
            </Button>
          ) : (
            <Button disabled>Pause</Button>
          )}
          <EditSchedule initial={schedule} protocols={protocols} onRemove={onRemove} onUpdate={onUpdate} />
        </Stack>
      </CardActions>
    </Card>
  )
}
