import {
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {SyntheticEvent, useReducer, useState, useMemo} from 'react'
import {MenuDialog, editData, trackEdits} from './menu_dialog'
import {users} from '../root'
import type {User} from '../types'

export const UsersMenu = ({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) => {
  const edits = useMemo(() => new Map(), [])
  const handleChange = (e: SyntheticEvent, value?: boolean | string) => {
    const key = 'name' in e.target ? (e.target.name as string) : ''
    if (undefined === value && 'value' in e.target) value = e.target.value as string
    if (key && undefined !== value) {
      trackEdits(edits, key, value, users[user][key as keyof User])
      dispatchEdit({key, value})
    }
  }
  const [user, setUser] = useState('New')
  const [userList, setUserList] = useState(Object.keys(users))
  const [data, dispatchEdit] = useReducer(editData<User, any>, users.New)
  return (
    <MenuDialog
      isOpen={isOpen}
      onClose={onClose}
      edited={!!edits.size}
      title="Users"
      options={userList}
      onChange={(option: string) => {
        setUser(option)
        edits.clear()
        dispatchEdit({key: '', value: users[option]})
      }}
      onRemove={(option: string) => {
        if (option !== 'New') {
          delete users[option]
          setUserList(Object.keys(users))
        }
      }}
      onAddUpdate={() => {
        users[data.email] = {...data} as User
        setUserList(Object.keys(users))
        return data.email
      }}
    >
      <Stack spacing={1} paddingLeft={1} paddingRight={1}>
        <TextField value={data.email} name="email" size="small" onChange={handleChange} label="Email" />
        <TableContainer>
          <Table sx={{'& .MuiTableCell-root': {p: 0}}}>
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
                    checked={data.view_study}
                    name="view_study"
                    onChange={handleChange}
                    disabled={true}
                  ></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.add_study} name="add_study" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={data.remove_study}
                    name="remove_study"
                    onChange={handleChange}
                    disabled={true}
                  ></Checkbox>
                </TableCell>
              </TableRow>
              <TableRow key="participants">
                <TableCell>
                  <Typography id="participant-label">Participants</Typography>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.view_participant} name="view_participant" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.add_participant} name="add_participant" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={data.remove_participant}
                    name="remove_participant"
                    onChange={handleChange}
                  ></Checkbox>
                </TableCell>
              </TableRow>
              <TableRow key="protocol">
                <TableCell>
                  <Typography id="protocol-label">Protocols</Typography>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={data.view_protocol}
                    name="view_protocol"
                    onChange={handleChange}
                    disabled={true}
                  ></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.add_protocol} name="add_protocol" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.remove_protocol} name="remove_protocol" onChange={handleChange}></Checkbox>
                </TableCell>
              </TableRow>
              <TableRow key="user">
                <TableCell>
                  <Typography id="user-label">Users</Typography>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.view_user} name="view_user" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.add_user} name="add_user" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.remove_user} name="remove_user" onChange={handleChange}></Checkbox>
                </TableCell>
              </TableRow>
              <TableRow key="log">
                <TableCell>
                  <Typography id="log-label">Logs</Typography>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.view_log} name="view_log" onChange={handleChange}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox checked={data.add_log} name="add_log" onChange={handleChange} disabled={true}></Checkbox>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={data.remove_log}
                    name="remove_log"
                    onChange={handleChange}
                    disabled={true}
                  ></Checkbox>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </MenuDialog>
  )
}
