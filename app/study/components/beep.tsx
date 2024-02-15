import {Box, Stack} from '@mui/material'
import {SCHEDULE_SCALE} from '../params'
import type Schedule from '../classes/schedule'
import {statusClasses} from '../root'

export const Beep = ({schedule, index, start}: {schedule: Schedule; index: number; start?: number}) => {
  return (
    <Stack
      sx={{
        position: 'absolute',
        width: '100%',
        top: start ? (schedule.times[index] - start) / SCHEDULE_SCALE + 'px' : '',
      }}
    >
      <Box sx={{width: '100%', height: '5px'}} className={statusClasses[schedule.statuses[index]]}></Box>
    </Stack>
  )
}
