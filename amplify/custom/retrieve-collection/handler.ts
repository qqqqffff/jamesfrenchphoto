import { APIGatewayProxyEventV2, Context } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import sizeOf from 'image-size'
import { createPublicKey } from 'crypto'

declare const awslambda: {
  streamifyResponse: (
    handler: (event: APIGatewayProxyEventV2, responseStream: NodeJS.WritableStream, context: Context) => Promise<void>
  ) => (event: APIGatewayProxyEventV2, responseStream: NodeJS.WritableStream, context: Context) => Promise<void>
  HttpResponseStream: {
    from: (responseStream: NodeJS.WritableStream, metadata: { statusCode: number; headers?: Record<string, string> }) => NodeJS.WritableStream
  }
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client()

const PHOTO_SET_TABLE = process.env.PHOTO_SET_TABLE!
const PHOTO_PATHS_TABLE = process.env.PHOTO_PATHS_TABLE!
const BUCKET_NAME = process.env.BUCKET_NAME!
// Amplify Gen 2 GSI naming: index('collectionId') → 'collectionId-index', index('setId').sortKeys(['order']) → 'setId-order-index'
const SETS_GSI = process.env.SETS_GSI ?? 'collectionId-index'
const PATHS_GSI = process.env.PATHS_GSI ?? 'setId-order-index'
const JWKS_URL = process.env.COGNITO_JWKS_URL!

interface JwksKey {
  kty: string
  kid: string
  n: string
  e: string
}

let cachedKeys: Map<string, JwksKey> | null = null

async function getJwksKeys(): Promise<Map<string, JwksKey>> {
  if (cachedKeys) return cachedKeys
  const resp = await fetch(JWKS_URL)
  const json = await resp.json() as { keys: JwksKey[] }
  cachedKeys = new Map(json.keys.map((k) => [k.kid, k]))
  return cachedKeys
}

async function isAdminToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as { kid?: string; alg?: string }
    if (!header.kid) return false

    const keys = await getJwksKeys()
    const jwk = keys.get(header.kid)
    if (!jwk) return false

    const pubKey = createPublicKey({ key: jwk as unknown as Parameters<typeof createPublicKey>[0], format: 'jwk' })
    const { verify } = await import('crypto')
    const sig = Buffer.from(parts[2], 'base64url')
    const data = `${parts[0]}.${parts[1]}`
    const valid = verify('RSA-SHA256', Buffer.from(data), pubKey, sig)
    if (!valid) return false

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { 'cognito:groups'?: string[] }
    return (payload['cognito:groups'] ?? []).includes('ADMINS')
  } catch {
    return false
  }
}

interface DynaSet {
  id: string
  name: string
  order: number
  collectionId: string
  items?: number
  watermarkPath?: string
}

interface DynaPath {
  id: string
  path: string
  order: number
  setId: string
  width?: number
  height?: number
}

async function queryAllSets(collectionId: string): Promise<DynaSet[]> {
  const sets: DynaSet[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const resp = await dynamo.send(new QueryCommand({
      TableName: PHOTO_SET_TABLE,
      IndexName: SETS_GSI,
      KeyConditionExpression: 'collectionId = :cid',
      ExpressionAttributeValues: { ':cid': collectionId },
      ExclusiveStartKey: lastKey,
    }))
    sets.push(...(resp.Items as DynaSet[] ?? []))
    lastKey = resp.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return sets
}

async function queryAllPaths(setId: string): Promise<DynaPath[]> {
  const paths: DynaPath[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const resp = await dynamo.send(new QueryCommand({
      TableName: PHOTO_PATHS_TABLE,
      IndexName: PATHS_GSI,
      KeyConditionExpression: 'setId = :sid',
      ExpressionAttributeValues: { ':sid': setId },
      ExclusiveStartKey: lastKey,
    }))
    paths.push(...(resp.Items as DynaPath[] ?? []))
    lastKey = resp.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return paths
}

async function listS3Objects(collectionId: string, setId: string): Promise<Map<string, string>> {
  const idToKey = new Map<string, string>()
  let continuationToken: string | undefined

  do {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `photo-collections/${collectionId}/${setId}/`,
      ContinuationToken: continuationToken,
    }))
    for (const obj of resp.Contents ?? []) {
      const key = obj.Key
      if (!key) continue
      const filename = key.substring(key.lastIndexOf('/') + 1)
      const underscoreIdx = filename.indexOf('_')
      if (underscoreIdx < 0) continue
      const pathId = filename.substring(0, underscoreIdx)
      idToKey.set(pathId, key)
    }
    continuationToken = resp.NextContinuationToken
  } while (continuationToken)

  return idToKey
}

async function processSetReadOnly(set: DynaSet): Promise<object> {
  const paths = await queryAllPaths(set.id)
  return {
    id: set.id,
    name: set.name,
    order: set.order,
    collectionId: set.collectionId,
    watermarkPath: set.watermarkPath,
    items: set.items ?? paths.length,
    paths: paths.map((p) => ({ id: p.id, path: p.path, order: p.order, setId: p.setId, url: '', width: p.width ?? 0, height: p.height ?? 0 })),
  }
}

async function processSetValidate(collectionId: string, set: DynaSet): Promise<object> {
  const [s3Map, existingPaths] = await Promise.all([
    listS3Objects(collectionId, set.id),
    queryAllPaths(set.id),
  ])

  const existingPathMap = new Map(existingPaths.map((p) => [p.id, p]))

  // Delete DynamoDB paths whose S3 file no longer exists
  const deleteOps = existingPaths
    .filter((p) => !s3Map.has(p.id))
    .map((p) => dynamo.send(new DeleteCommand({ TableName: PHOTO_PATHS_TABLE, Key: { id: p.id } })))

  // Identify new S3 IDs not yet in DynamoDB
  const newS3Entries = Array.from(s3Map.entries())
    .filter(([id]) => !existingPathMap.has(id))
    .sort((a, b) => a[1].substring(a[1].indexOf('_') + 1).localeCompare(b[1].substring(b[1].indexOf('_') + 1)))

  // Create DynamoDB records for new S3 files
  const baseOrder = existingPaths.filter((p) => s3Map.has(p.id)).length
  const createOps = newS3Entries.map(async ([id, key], index) => {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    if (!obj.Body) return null
    const bytes = await obj.Body.transformToByteArray()
    const dims = sizeOf(bytes)
    const item: DynaPath = {
      id,
      path: key,
      order: baseOrder + index,
      setId: set.id,
      width: dims.width ?? 0,
      height: dims.height ?? 0,
    }
    await dynamo.send(new PutCommand({ TableName: PHOTO_PATHS_TABLE, Item: item }))
    return item
  })

  const [, createdResults] = await Promise.all([Promise.all(deleteOps), Promise.all(createOps)])

  const survivingPaths = existingPaths.filter((p) => s3Map.has(p.id))
  const createdPaths = createdResults.filter((p): p is DynaPath => p !== null)
  const finalPaths = [...survivingPaths, ...createdPaths]
  const itemCount = finalPaths.length

  await dynamo.send(new UpdateCommand({
    TableName: PHOTO_SET_TABLE,
    Key: { id: set.id },
    UpdateExpression: 'SET #items = :count',
    ExpressionAttributeNames: { '#items': 'items' },
    ExpressionAttributeValues: { ':count': itemCount },
  }))

  return {
    id: set.id,
    name: set.name,
    order: set.order,
    collectionId: set.collectionId,
    watermarkPath: set.watermarkPath,
    items: itemCount,
    paths: finalPaths.map((p) => ({ id: p.id, path: p.path, order: p.order, setId: p.setId, url: '', width: p.width ?? 0, height: p.height ?? 0 })),
  }
}

const rawHandler = async (
  event: APIGatewayProxyEventV2,
  responseStream: NodeJS.WritableStream,
  _context: Context
): Promise<void> => {
  const stream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })

  try {
    const body = JSON.parse(event.body ?? '{}') as { collectionId?: string; validate?: boolean; token?: string }
    const { collectionId, validate = false, token = '' } = body

    if (!collectionId) {
      stream.write(JSON.stringify({ error: 'collectionId required' }) + '\n')
      stream.end()
      return
    }

    const canValidate = validate && token ? await isAdminToken(token) : false
    const sets = await queryAllSets(collectionId)

    await Promise.all(
      sets.map(async (set) => {
        const result = canValidate
          ? await processSetValidate(collectionId, set)
          : await processSetReadOnly(set)
        stream.write(JSON.stringify(result) + '\n')
      })
    )
  } catch (err) {
    stream.write(JSON.stringify({ error: String(err) }) + '\n')
  }

  stream.end()
}

export const handler = awslambda.streamifyResponse(rawHandler)
