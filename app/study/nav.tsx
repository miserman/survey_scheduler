import {AppBar, Toolbar, Button} from '@mui/material'
import React, {Ref} from 'react'

export const makeNav = (
  {
    study,
    gutterSize,
    openMenu,
    openAddEdit,
  }: {study: string; gutterSize: number; openMenu: () => void; openAddEdit: () => void},
  ref: Ref<HTMLDivElement>
) => {
  return (
    <AppBar ref={ref} component="nav" position="static">
      <Toolbar variant="dense">
        <Button sx={{width: gutterSize + 'px'}} onClick={openMenu}>
          Menu
        </Button>
        <Button sx={{flexGrow: 1}} href="../">
          {study}
        </Button>
        <Button sx={{width: 90}} onClick={openAddEdit}>
          Add/Edit
        </Button>
      </Toolbar>
    </AppBar>
  )
}
