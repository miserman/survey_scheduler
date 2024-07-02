import {DynamoDBClient, CreateTableCommand, DeleteTableCommand} from '@aws-sdk/client-dynamodb'
import {DeleteCommand, PutCommand, ScanCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'
import {StudyMetadata} from '@/lib/studies'
import {User} from './user'
import {Protocol} from './protocol'

const DDB = new DynamoDBClient({region: process.env.REGION})

export function createTable(TableName: string, AttributeName: string) {
  return DDB.send(
    new CreateTableCommand({
      TableName,
      AttributeDefinitions: [
        {
          AttributeName,
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName,
          KeyType: 'HASH',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      BillingMode: 'PROVISIONED',
    })
  )
}

export function deleteTable(TableName: string) {
  return DDB.send(new DeleteTableCommand({TableName}))
}

export function scanTable(TableName: string) {
  return DDB.send(new ScanCommand({TableName}))
}

export function updateTable(TableName: string, Item: StudyMetadata) {
  return DDB.send(new PutCommand({TableName, Item}))
}

export function updateStudyUser(study: string, userId: string, user: Partial<User>) {
  return DDB.send(
    new UpdateCommand({
      TableName: 'studies',
      Key: {study},
      UpdateExpression: 'SET #u.#n = :p',
      ExpressionAttributeNames: {'#u': 'users', '#n': userId},
      ExpressionAttributeValues: {':p': user},
    })
  )
}

export function removeStudyUser(study: string, userId: string) {
  return DDB.send(
    new UpdateCommand({
      TableName: 'studies',
      Key: {study},
      UpdateExpression: 'REMOVE #u.#n',
      ExpressionAttributeNames: {'#u': 'users', '#n': userId},
    })
  )
}

export function updateStudyProtocol(study: string, name: string, protocol: Partial<Protocol>) {
  return DDB.send(
    new UpdateCommand({
      TableName: 'studies',
      Key: {study},
      UpdateExpression: 'SET #p.#n = :p',
      ExpressionAttributeNames: {'#p': 'protocols', '#n': name},
      ExpressionAttributeValues: {':p': protocol},
    })
  )
}

export function removeStudyProtocol(study: string, name: string) {
  return DDB.send(
    new UpdateCommand({
      TableName: 'studies',
      Key: {study},
      UpdateExpression: 'REMOVE #p.#n',
      ExpressionAttributeNames: {'#p': 'protocols', '#n': name},
    })
  )
}

export function removeItem(TableName: string, Key: {[index: string]: string}) {
  return DDB.send(new DeleteCommand({TableName, Key}))
}
