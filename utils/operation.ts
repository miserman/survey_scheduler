import {Protocol} from '@/lib/protocol'
import {User} from '@/lib/user'

export type Operations =
  | {type: 'list_studies'}
  | {type: 'add_study' | 'remove_study'; study: string}
  | {type: 'list_logs'; study: string}
  | {type: 'view_log'; study: string; file: string}
  | {type: 'view_user'; study: string}
  | {type: 'add_user'; study: string; name: string; perms: User}
  | {type: 'remove_user'; study: string; name: string}
  | {type: 'view_protocol'; study: string}
  | {type: 'add_protocol'; study: string; name: string; params: Protocol}
  | {type: 'remove_protocol'; study: string; name: string}

export async function operation(
  body: Operations
): Promise<{error: false; content: any} | {error: true; status: string; message: any}> {
  const req = await fetch('/operation', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return req.ok
    ? {error: false, content: await req.json()}
    : {error: true, status: req.status + ' (' + req.statusText + ')', message: await req.json()}
}
