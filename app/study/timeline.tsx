import {Box, useTheme} from '@mui/material'
import React, {useState} from 'react'
import {sizing} from './params'

const formatTime = Intl.DateTimeFormat('en-us', {hour: 'numeric', minute: '2-digit', second: 'numeric'})

export default function Timeline() {
  const theme = useTheme()
  const [time, updateTime] = useState('')
  setInterval(() => updateTime(formatTime.format(new Date())), 1e3)
  return (
    <Box sx={{height: sizing.timelineHeight + 'px'}}>
      <Box
        sx={{
          backgroundColor: '#000',
          height: '100%',
          width: '100%',
          top: 0,
        }}
      >
        <Box sx={{position: 'relative', height: '100%'}}></Box>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          backgroundColor: theme.palette.info.main,
          width: '100%',
        }}
      >
        <Box sx={{display: 'flex', flexFlow: 'nowrap', width: '100%', height: '100%'}}>
          <Box sx={{width: sizing.leftGutter + 'px', textAlign: 'center'}}>{time}</Box>
          <Box></Box>
        </Box>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          height: sizing.timelineHeight * 0.6 + 'px',
          width: sizing.leftGutter + 'px',
          borderRight: 'solid 1px ' + theme.palette.error.main,
        }}
      ></Box>
    </Box>
  )
}
