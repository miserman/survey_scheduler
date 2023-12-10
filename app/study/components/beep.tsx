import {Stack, Typography} from '@mui/material'
import {Schedule} from '../types'
import {SCHEDULE_SCALE} from '../params'

export const Beep = ({schedule, index, start}: {schedule: Schedule; index: number; start?: number}) => {
  return (
    <Stack
      sx={{
        position: 'absolute',
        top: start ? (schedule.times[index] - schedule.date - start) / SCHEDULE_SCALE + 'px' : '',
      }}
    >
      <Typography>{schedule.times[index]}</Typography>
    </Stack>
  )
}
