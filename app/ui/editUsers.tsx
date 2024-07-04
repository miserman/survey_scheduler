import {operation} from '@/utils/operation'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {SyntheticEvent, useContext, useEffect, useMemo, useReducer, useState} from 'react'
import {FeedbackContext, SessionContext} from '../context'
import {User, Users} from '@/lib/user'
import {Close} from '@mui/icons-material'
import {ConfirmUpdate} from './confirmUpdate'

type EditUserAction = {type: 'replace'; user: Partial<User>} | {type: 'edit'; key: string; value: string | boolean}
function editUser(state: Partial<User>, action: EditUserAction): Partial<User> {
  if (action.type === 'replace') {
    return {...action.user}
  } else {
    return {...state, [action.key]: action.value}
  }
}
const state = {current: JSON.stringify(new User())}
export default function UserEditDialog({study, open, onClose}: {study: string; open: boolean; onClose: () => void}) {
  const session = useContext(SessionContext)
  const notify = useContext(FeedbackContext)
  const [users, setUsers] = useState<Users>({New: new User()})
  const [user, setUser] = useReducer(editUser, users.New)
  const [selected, setSelected] = useState('New')
  const [changed, setChanged] = useState(false)
  const changeUser = (user: string) => {
    setSelected(user)
    if (!users[user].email) users[user].email = user
    users[user] = new User(users[user])
    state.current = JSON.stringify(users[user])
  }
  const updateState = (action: EditUserAction) => {
    setUser(action)
    if (action.type === 'replace') {
      setChanged(false)
    } else {
      user[action.key as 'add_study'] = action.value as boolean
      setChanged(state.current !== JSON.stringify(user))
    }
  }
  const handleChange = (e: SyntheticEvent, value?: boolean) => {
    if ('undefined' === typeof value) {
      if ('value' in e.target) {
        const value = e.target.value as string
        updateState({type: 'edit', key: 'email', value})
      }
    } else if ('name' in e.target) {
      const key = e.target.name as 'add_study'
      updateState({type: 'edit', key, value})
    }
  }
  const submitUser = async () => {
    const parsed = new User(user)
    const req = await operation({type: 'add_user', study, name: parsed.email, perms: parsed})
    if (req.error) {
      notify('failed to ' + (selected === 'New' ? 'add' : 'update') + ' user ' + parsed.email + ': ' + req.status)
    } else {
      notify((selected === 'New' ? 'added' : 'updated') + ' user ' + parsed.email, true)
      changeUser(parsed.email)
    }
  }
  const deleteUser = async () => {
    const req = await operation({type: 'remove_user', study, name: selected})
    if (req.error) {
      notify('failed to remove user ' + selected + ': ' + req.status)
    } else {
      notify('removed user ' + selected, true)
      changeUser('New')
    }
  }
  useEffect(() => {
    if (session.signedin) {
      const getUsers = async () => {
        const req = await operation<Users>({type: 'view_user', study})
        if (req.error) {
          notify('failed to retrieve users: ' + req.status)
        } else {
          setUsers({New: new User(), ...req.content})
        }
      }
      getUsers()
    }
  }, [session.signedin, notify, study])
  const UserList = useMemo(
    () =>
      Object.keys(users).map(id => {
        const user = users[id]
        return (
          <MenuItem key={id} value={id}>
            {user.email || id}
          </MenuItem>
        )
      }),
    [users]
  )
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{p: 1}}>User Access Editor</DialogTitle>
      <IconButton
        aria-label="close user editor"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 0,
          top: 4,
        }}
        className="close-button"
      >
        <Close />
      </IconButton>
      <DialogContent sx={{p: 0}}>
        <FormControl fullWidth sx={{p: 1}}>
          <InputLabel sx={{p: 1}} id="user_edit_select">
            User ID
          </InputLabel>
          <Select
            labelId="user_edit_select"
            label="Email"
            size="small"
            value={selected}
            onChange={e => {
              const email = e.target.value
              changeUser(email)
              updateState({type: 'replace', user: {...users[email]}})
              return
            }}
          >
            {UserList}
          </Select>
        </FormControl>
        <Paper sx={{p: 1}}>
          <TextField
            label="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            fullWidth
            size="small"
            sx={{mb: 2}}
            error={!user.email}
          ></TextField>
          <Typography className="note">Permissions</Typography>
          <TableContainer>
            <Table sx={{'& .MuiTableCell-root': {p: 0}}}>
              <TableHead>
                <TableRow sx={{'& .MuiTableCell-head': {width: 70}}}>
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
                    <Checkbox checked={true} name="view_study" onChange={handleChange} disabled={true}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.add_study} name="add_study" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.remove_study} name="remove_study" onChange={handleChange}></Checkbox>
                  </TableCell>
                </TableRow>
                <TableRow key="participants">
                  <TableCell>
                    <Typography id="participant-label">Participants</Typography>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={user.view_participant}
                      name="view_participant"
                      onChange={handleChange}
                    ></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.add_participant} name="add_participant" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={user.remove_participant}
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
                    <Checkbox checked={true} name="view_protocol" onChange={handleChange} disabled={true}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.add_protocol} name="add_protocol" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.remove_protocol} name="remove_protocol" onChange={handleChange}></Checkbox>
                  </TableCell>
                </TableRow>
                <TableRow key="user">
                  <TableCell>
                    <Typography id="user-label">Users</Typography>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.view_user} name="view_user" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.add_user} name="add_user" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.remove_user} name="remove_user" onChange={handleChange}></Checkbox>
                  </TableCell>
                </TableRow>
                <TableRow key="log">
                  <TableCell>
                    <Typography id="log-label">Logs</Typography>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={user.view_log} name="view_log" onChange={handleChange}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={false} name="add_log" onChange={handleChange} disabled={true}></Checkbox>
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={false} name="remove_log" onChange={handleChange} disabled={true}></Checkbox>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>
      <DialogActions sx={{justifyContent: 'space-between'}}>
        <Button variant="contained" color="error" disabled={selected === 'New'} onClick={deleteUser}>
          Delete
        </Button>
        <Box>
          <Button disabled={!changed} onClick={() => updateState({type: 'replace', user: users[selected]})}>
            Reset
          </Button>
          {selected === 'New' ? (
            <Button variant="contained" disabled={!user.email} onClick={submitUser}>
              Add
            </Button>
          ) : (
            <ConfirmUpdate disabled={!changed} name={'user ' + selected} onConfirm={submitUser} />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}
