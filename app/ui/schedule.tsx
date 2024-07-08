import Schedule, {statusLabels} from '@/lib/schedule'
import {Button, Card, CardActions, CardContent, CardHeader, Stack, Typography} from '@mui/material'
import dayjs from 'dayjs'
import {useMemo} from 'react'
import {EditSchedule} from './editSchedule'

export function ScheduleDay({
  schedule,
  onRemove,
  onUpdate,
}: {
  schedule: Schedule
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
      <CardHeader title={date.format('ddd M/D')} sx={{p: 1, '& span': {fontSize: '1em', whiteSpace: 'nowrap'}}} />
      <CardContent sx={{p: 0, flexGrow: 1, textAlign: 'center'}}>
        {times.map((time, index) => {
          return (
            <Typography
              key={index}
              className={statusLabels[schedule.statuses[index]]}
              sx={{borderRadius: '15px', mb: 0.2}}
            >
              {time.format('hh:mm A')}
            </Typography>
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
          <EditSchedule initial={schedule} onRemove={onRemove} onUpdate={onUpdate} />
        </Stack>
      </CardActions>
    </Card>
  )
}
