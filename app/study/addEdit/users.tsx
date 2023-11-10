import type {User} from '../types'
import {
  Checkbox,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {SyntheticEvent} from 'react'

export const AddEditUsers = ({perms, edit}: {perms: User; edit: (key: string, value: boolean | string) => void}) => {
  const handlePermChange = (e: SyntheticEvent, value?: boolean | string) => {
    const key = 'name' in e.target ? (e.target.name as string) : ''
    if (undefined === value && 'value' in e.target) value = e.target.value as string
    if (key && undefined !== value) {
      edit(key, value)
    }
  }
  return (
    <FormControl fullWidth>
      <TextField value={perms.email} name="email" onChange={handlePermChange} label="Email" />
      <TableContainer>
        <Table sx={{'& .MuiTableCell-root': {p: 1}}}>
          <TableHead>
            <TableRow>
              <TableCell>Access to</TableCell>
              <TableCell>View</TableCell>
              <TableCell>Add/Edit</TableCell>
              <TableCell>Remove</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow key="study">
              <TableCell>
                <Typography id="study-label">Study</Typography>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.view_study}
                  name="view_study"
                  onChange={handlePermChange}
                  disabled={true}
                ></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.add_study} name="add_study" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.remove_study}
                  name="remove_study"
                  onChange={handlePermChange}
                  disabled={true}
                ></Checkbox>
              </TableCell>
            </TableRow>
            <TableRow key="participants">
              <TableCell>
                <Typography id="participant-label">Participants</Typography>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.view_participant}
                  name="view_participant"
                  onChange={handlePermChange}
                ></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.add_participant} name="add_participant" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.remove_participant}
                  name="remove_participant"
                  onChange={handlePermChange}
                ></Checkbox>
              </TableCell>
            </TableRow>
            <TableRow key="protocol">
              <TableCell>
                <Typography id="protocol-label">Protocols</Typography>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.view_protocol}
                  name="view_protocol"
                  onChange={handlePermChange}
                  disabled={true}
                ></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.add_protocol} name="add_protocol" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.remove_protocol} name="remove_protocol" onChange={handlePermChange}></Checkbox>
              </TableCell>
            </TableRow>
            <TableRow key="user">
              <TableCell>
                <Typography id="user-label">Users</Typography>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.view_user} name="view_user" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.add_user} name="add_user" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.remove_user} name="remove_user" onChange={handlePermChange}></Checkbox>
              </TableCell>
            </TableRow>
            <TableRow key="log">
              <TableCell>
                <Typography id="log-label">Logs</Typography>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.view_log} name="view_log" onChange={handlePermChange}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox checked={perms.add_log} name="add_log" onChange={handlePermChange} disabled={true}></Checkbox>
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={perms.remove_log}
                  name="remove_log"
                  onChange={handlePermChange}
                  disabled={true}
                ></Checkbox>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </FormControl>
  )
}
