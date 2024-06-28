import {User} from '@/lib/user'

export type Operations =
  | {type: 'list_studies'}
  | {type: 'add_study' | 'remove_study'; study: string}
  | {type: 'list_logs'; study: string; prefix: string}
  | {type: 'view_log'; study: string; file: string}
  | {type: 'list_users'; study: string}
  | {type: 'list_protocols'; study: string}
  | {type: 'add_user'; study: string; name: string; perms: User}
  | {type: 'remove_user'; study: string; name: string}

export async function operation(
  body: Operations
): Promise<{error: false; content: any} | {error: true; status: string}> {
  const req = await fetch('/operation', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return req.ok
    ? {error: false, content: await req.json()}
    : {error: true, status: req.status + ' (' + req.statusText + ')'}
}
