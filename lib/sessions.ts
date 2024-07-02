import {MS_HOUR} from '@/utils/times'
import {CognitoJwtVerifier} from 'aws-jwt-verify'
import type {CognitoJwtVerifierSingleUserPool} from 'aws-jwt-verify/cognito-verifier'
import type {CognitoAccessTokenPayload} from 'aws-jwt-verify/jwt-model'

type Tokens = {access_token: string}
class Session {
  verified = false
  expires = 0
  tokens?: Tokens
  payload?: CognitoAccessTokenPayload | {username: string}
  verifier?: CognitoJwtVerifierSingleUserPool<{
    userPoolId: string
    tokenUse: 'access'
    clientId: string
  }>
  constructor() {
    const {USERPOOL, CLIENT} = process.env
    if (USERPOOL && CLIENT) {
      this.verifier = CognitoJwtVerifier.create({
        userPoolId: USERPOOL,
        tokenUse: 'access',
        clientId: CLIENT,
      })
    }
    this.refresh()
  }
  refresh() {
    this.expires = Date.now() + MS_HOUR
  }
  async verify() {
    if (this.verifier && this.tokens) {
      try {
        this.payload = await this.verifier.verify(this.tokens.access_token)
        this.verified = true
        return true
      } catch {}
    }
    return false
  }
}

export class Sessions {
  sessions: {[index: string]: Session} = {}
  expiry: {[index: string]: NodeJS.Timeout} = {}
  initialized = false
  instanceId = Math.random()
  init() {
    if (!this.initialized) {
      console.log('establishing sessions container')
      this.sessions = {}
      this.expiry = {}
      this.initialized = true
    }
  }
  create(id: string) {
    this.init()
    const session = new Session()
    this.sessions[id] = session
    this.expiry[id] = setInterval(() => {
      if (id in this.sessions && this.sessions[id].expires < Date.now()) {
        delete this.sessions[id]
        delete this.expiry[id]
      }
    }, MS_HOUR)
    return session
  }
  get(id: string) {
    this.init()
    console.log('sessions id: ' + this.instanceId)
    const session = this.sessions[id]
    if (session) {
      if (session.expires > Date.now()) {
        return session
      } else {
        delete this.sessions[id]
      }
    }
  }
  delete(id: string) {
    delete this.sessions[id]
    if (id in this.expiry) {
      clearInterval(this.expiry[id])
      delete this.expiry[id]
    }
  }
}

export type SessionStatus = {signedin: boolean; expires: number}
