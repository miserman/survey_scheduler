import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  TextField,
} from '@mui/material'
import {ReactElement, SyntheticEvent, useMemo, useReducer, useState} from 'react'
import {AddEditUsers} from './users'
import {AddEditProtocol} from './protocols'
import {Protocol, User} from '../types'

const TabPanel = (props: {children: ReactElement; which: number; show: number}) => {
  return (
    <Paper
      role="tabpanel"
      id={'addedit-panel-' + props.which}
      aria-labelledby={'addedit-tab-' + props.which}
      hidden={props.which !== props.show}
    >
      {props.children}
    </Paper>
  )
}

const tabInputLabel = ['Participant', 'Protocol', 'User']

// Protocol
const protocols: {[index: string]: Partial<Protocol>} = {
  New: {},
  signal: {
    name: 'signal',
    color: '#ffcccc',
    beeps: 6,
    minsep: 30,
    random_start: true,
    randomization: 'binned',
    reminder_after: 10,
    close_after: 30,
    accesses: 1,
    initial_message: 'Please complete this survey within 30 minutes:',
    reminder_message: 'Reminder: complete your survey within 20 minutes.',
    reminder_link: true,
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
  event: {
    name: 'event',
    color: '#83f0ff',
    beeps: 1,
    offset: 15,
    randomization: 'none',
    initial_message: 'Please complete this survey after any study-relevant event:',
    link: 'https://datacenter.az1.qualtrics.com/jfe/form/SV_surveyid',
    id_parameter: 'id',
  },
}
const editProtocol = (
  state: Partial<Protocol>,
  action: {key: string; value: boolean | string | number | Partial<Protocol>}
) => {
  if ('object' !== typeof action.value) {
    const newState = {...state}
    ;(newState[action.key as keyof Protocol] as typeof action.value) = action.value
    return newState
  }
  return {...action.value}
}

// User
const basePerms: User = {
  email: '',
  view_study: true,
  view_participant: false,
  view_protocol: true,
  view_user: false,
  view_log: false,
  add_study: false,
  add_participant: false,
  add_protocol: false,
  add_user: false,
  add_log: false,
  remove_study: false,
  remove_participant: false,
  remove_protocol: false,
  remove_user: false,
  remove_log: false,
}
const users: {[index: string]: User} = {
  New: {...basePerms},
}
const editPerms = (state: User, action: {key: string; value: boolean | string | User}) => {
  if ('object' !== typeof action.value) {
    const newState = {...state}
    ;(newState[action.key as keyof User] as typeof action.value) = action.value
    return newState
  }
  return {...action.value}
}

export const AddEdit = ({
  open,
  close,
  tab,
  changeTab,
}: {
  open: boolean
  close: () => void
  tab: number
  changeTab: (e: SyntheticEvent, tab: number) => void
}) => {
  const edits: Map<string, boolean> = new Map()
  const [edited, setEdited] = useState(false)
  const [newOption, setNewOption] = useState(true)

  const [protocolList, setProtocolList] = useState(Object.keys(protocols))
  const [currentProtocol, setCurrentProtocol] = useState('New')
  const [protocol, requestProtocolEdit] = useReducer(editProtocol, protocols.New)

  const [userList, setUserList] = useState(Object.keys(users))
  const [currentUser, setCurrentUser] = useState('New')
  const [perms, requestPermsEdit] = useReducer(editPerms, basePerms)
  const commit = (key: string, value?: any, previous?: any) => {
    if (key === 'clear') {
      edits.clear()
    } else if (edits.has(key)) {
      if (edits.get(key) === value) edits.delete(key)
    } else {
      edits.set(key, previous)
    }
    setEdited(!!edits.size)
  }
  const handleUserChange = (value: string) => {
    commit('clear')
    setCurrentUser(value)
    setNewOption(value === 'New')
    if (value !== 'New') requestPermsEdit({key: value, value: users[value]})
  }
  const handlerProtocolChange = (value: string) => {
    commit('clear')
    setCurrentProtocol(value)
    setNewOption(value === 'New')
    if (value !== 'New') requestProtocolEdit({key: value, value: protocols[value]})
  }
  const handlers = useMemo(() => {
    return {
      Participant: {
        change: (e: SyntheticEvent, value: string) => {},
        remove: (e: SyntheticEvent) => {},
        add: (e: SyntheticEvent) => {},
      },
      Protocol: {
        edit: (key: string, value: string | boolean | number | Partial<Protocol>) => {
          commit(key, value, protocol[key as keyof Protocol])
          requestProtocolEdit({key, value})
        },
        change: (e: SyntheticEvent, p: string) => {
          if (p in protocols) {
            handlers.Protocol.edit('clear', protocol)
            handlerProtocolChange(p)
          }
        },
        remove: (e: SyntheticEvent) => {
          if (currentProtocol !== 'New') {
            delete protocols[currentProtocol]
            handlerProtocolChange('New')
            setProtocolList(Object.keys(protocols))
          }
        },
        add: (e: SyntheticEvent) => {
          if (protocol.name && !(protocol.name in protocols)) {
            protocols[protocol.name] = {...protocol}
            setProtocolList(Object.keys(protocols))
            handlerProtocolChange(perms.email)
          }
        },
      },
      User: {
        edit: (key: string, value: string | boolean | User) => {
          commit(key, value, perms[key as keyof User])
          requestPermsEdit({key, value})
        },
        change: (e: SyntheticEvent, user: string) => {
          if (user in users) {
            handlers.User.edit('clear', perms)
            handleUserChange(user)
          }
        },
        remove: (e: SyntheticEvent) => {
          if (currentUser !== 'New') {
            delete users[currentUser]
            handleUserChange('New')
            setUserList(Object.keys(users))
          }
        },
        add: (e: SyntheticEvent) => {
          if (!(perms.email in users)) {
            users[perms.email] = {...perms}
            setUserList(Object.keys(users))
            handleUserChange(perms.email)
          }
        },
      },
    }
  }, [])
  const handler = handlers[tabInputLabel[tab] as keyof typeof handlers]
  return (
    <Dialog scroll="paper" open={open} onClose={close}>
      <DialogTitle sx={{textAlign: 'center'}}>Add or Edit</DialogTitle>
      <Tabs sx={{marginBottom: 1}} value={tab} onChange={changeTab} aria-label="Add Edit Menu">
        <Tab label="Participants" id="addedit-tab-0" aria-controls="addedit-panel-0"></Tab>
        <Tab label="Protocols" id="addedit-tab-1" aria-controls="addedit-panel-1"></Tab>
        <Tab label="Users" id="addedit-tab-2" aria-controls="addedit-panel-2"></Tab>
      </Tabs>
      <DialogContent sx={{p: 0, paddingTop: 1}}>
        <TabPanel which={0} show={tab}>
          <Box>Participants</Box>
        </TabPanel>
        <TabPanel which={1} show={tab}>
          <>
            <Autocomplete
              disableClearable
              sx={{marginBottom: 4}}
              options={protocolList}
              value={currentProtocol}
              onChange={handlers.Protocol.change}
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  {option}
                </li>
              )}
              renderInput={params => <TextField {...params} label="Protocol" />}
            ></Autocomplete>
            <AddEditProtocol protocol={protocol} edit={handlers.Protocol.edit} />
          </>
        </TabPanel>
        <TabPanel which={2} show={tab}>
          <>
            <Autocomplete
              disableClearable
              sx={{marginBottom: 4}}
              options={userList}
              value={currentUser}
              onChange={handlers.User.change}
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  {option}
                </li>
              )}
              renderInput={params => <TextField {...params} label="User" />}
            ></Autocomplete>
            <AddEditUsers perms={perms} edit={handlers.User.edit} />
          </>
        </TabPanel>
      </DialogContent>
      <DialogActions sx={{p: 0, '& .MuiButtonBase-root': {padding: 2}}}>
        <Button disabled={newOption} onClick={handler.remove}>
          Remove
        </Button>
        <Button disabled={!newOption || !edited} onClick={handler.add} fullWidth>
          {newOption ? 'Add' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
