import { Schema } from "../../amplify/data/resource"
import { V6Client } from '@aws-amplify/api-graphql'
import { ShareTemplate } from "../types"
import { queryOptions } from "@tanstack/react-query"

async function getAllShareTemplates(client: V6Client<Schema>): Promise<ShareTemplate[]> {
  console.log('api call')
  const response: ShareTemplate[] = (await client.models.ShareTemplates.list()).data.map((template) => {
    const mappedTemplate: ShareTemplate = {
      ...template,
      header: template.header ?? undefined,
      header2: template.header2 ?? undefined,
      body: template.body ?? undefined,
      footer: template.footer ?? undefined,
    }

    return mappedTemplate
  })

  return response
}

export interface ShareCollectionParams {
  emails: string[],
  header?: string,
  header2?: string,
  body?: string,
  footer?: string,
  coverPath: string,
  link?: string,
  name: string,
  options?: {
      logging: boolean
  }
}

export interface CreateShareTemplateParams {
  name: string,
  header?: string,
  header2?: string,
  body?: string,
  footer?: string,
  options?: {
    logging?: boolean
  }
}

export interface UpdateShareTemplateParams extends CreateShareTemplateParams {
  template: ShareTemplate
}

export interface DeleteShareTemplateParams {
  id: string
  options?: {
    logging?: boolean
  }
}

export class ShareService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async shareCollectionMutation(params: ShareCollectionParams){
    //TODO: implement link creation if dne
    const response = await this.client.queries.ShareCollection({
      email: params.emails,
      header: params.header,
      header2: params.header2,
      body: params.body,
      footer: params.footer,
      coverPath: params.coverPath,
      link: params.link ?? '',
      name: params.name,
    })
    if(params.options?.logging) console.log(response)
  }

  async createShareTemplateMutation(params: CreateShareTemplateParams) {
    if(!params.header && !params.header2 && !params.body && !params.footer) {
      return undefined
    }

    const response = await this.client.models.ShareTemplates.create({
      name: params.name,
      header: params.header,
      header2: params.header2,
      body: params.body,
      footer: params.footer,
    })

    if(params.options?.logging) console.log(response)

    return response.data?.id
  }


  async updateShareTemplateMutation(params: UpdateShareTemplateParams){
    if(params.template.header === params.header &&
      params.template.header2 === params.header2 &&
      params.template.body === params.body &&
      params.template.footer === params.footer &&
      params.template.name === params.template.name
    ) {
      return undefined
    }

    const response = await this.client.models.ShareTemplates.update({
      id: params.template.id,
      name: params.template.name,
      header: params.header,
      header2: params.header2,
      body: params.body,
      footer: params.footer,
    })

    if(params.options?.logging) console.log(response)
  }

  async deleteShareTemplateMutation(params: DeleteShareTemplateParams){
    const response = await this.client.models.ShareTemplates.delete({ id: params.id })
    if(params.options?.logging) console.log(response)
  }

  getAllShareTemplatesQueryOptions = () => queryOptions({
    queryKey: ['shareTemplates'],
    queryFn: () => getAllShareTemplates(this.client)
  })
}