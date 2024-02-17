import {Box, Stack, Tooltip} from '@mui/material'
import {SCHEDULE_SCALE} from '../params'
import type Schedule from '../classes/schedule'
import {former, statusClasses} from '../root'

export const Beep = ({schedule, index, start}: {schedule: Schedule; index: number; start?: number}) => {
  return (
    <Stack
      sx={{
        position: 'absolute',
        width: '100%',
        top: start ? (schedule.times[index] - start) / SCHEDULE_SCALE + 'px' : '',
      }}
    >
      <Tooltip
        title={
          <Box textAlign="center">
            <p>{former.time.format(schedule.times[index])}</p>
            <p>{former.date.format(schedule.times[index])}</p>
          </Box>
        }
      >
        <Box sx={{width: '100%', height: '5px'}} className={statusClasses[schedule.statuses[index]]}></Box>
      </Tooltip>
    </Stack>
  )
}
