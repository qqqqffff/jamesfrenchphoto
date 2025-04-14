import { useMutation } from "@tanstack/react-query";
import { PhotoCollection, ShareTemplate } from "../../../types";
import { 
  createShareTemplateMutation, 
  CreateShareTemplateParams, 
  shareCollectionMutation, 
  ShareCollectionParams, 
  updateShareTemplateMutation, 
  UpdateShareTemplateParams 
} from "../../../services/shareService";
import { Badge, Button, Checkbox, Dropdown, TextInput } from "flowbite-react";
import { SharePreview } from "./SharePreview";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { textInputTheme } from "../../../utils";
import { HiOutlineX } from 'react-icons/hi'
import { HiOutlineCheckBadge, HiOutlineExclamationTriangle } from "react-icons/hi2";
import validator from 'validator'
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea";
import { createAccessTokenMutation, CreateAccessTokenMutationParams } from "../../../services/userService";

interface SharePanelProps {
  collection: PhotoCollection,
  selectedTemplate?: ShareTemplate,
  updateParentSelectedTemplate: Dispatch<SetStateAction<ShareTemplate | undefined>>
  updateParentTemplates: Dispatch<SetStateAction<ShareTemplate[]>>
}

export const SharePanel = (props: SharePanelProps) => {
  const [mode, setMode] = useState<'header' | 'header2' | 'body' | 'footer'>('header')
  const [header, setHeader] = useState<string | undefined>(props.selectedTemplate?.header)
  const [header2, setHeader2] = useState<string | undefined>(props.selectedTemplate?.header2)
  const [body, setBody] = useState<string | undefined>(props.selectedTemplate?.body)
  const [footer, setFooter] = useState<string | undefined>(props.selectedTemplate?.footer)
  const [emails, setEmails] = useState<string[]>([])
  const [email, setEmail] = useState<string>()
  const [name, setName] = useState<string | undefined>(props.selectedTemplate?.name)
  const [emailError, setEmailError] = useState<string>()
  const [allowPublicUsers, setAllowPublicUsers] = useState(false)

  const link = window.location.href
    .replace(new RegExp(/admin.*/g), 'photo-collection')
    + `/${props.collection.id}`

  useEffect(() => {
    if(props.selectedTemplate){
      setHeader((prev) => (
        prev !== props.selectedTemplate?.header ? (
          props.selectedTemplate?.header
        ) : (
          prev
        )
      ))
      setHeader2((prev) => (
        prev !== props.selectedTemplate?.header2 ? (
          props.selectedTemplate?.header2
        ) : (
          prev
        )
      ))
      setBody((prev) => (
        prev !== props.selectedTemplate?.body ? (
          props.selectedTemplate?.body
        ) : (
          prev
        )
      ))
      setFooter((prev) => (
        prev !== props.selectedTemplate?.footer ? (
          props.selectedTemplate?.footer
        ) : (
          prev
        )
      ))
      setName((prev) => (
        prev !== props.selectedTemplate?.name ? (
          props.selectedTemplate?.name
        ) : (
          prev
        )
      ))
    }
  }, [props.selectedTemplate])

  const share = useMutation({
    mutationFn: (params: ShareCollectionParams) => shareCollectionMutation(params)
  })

  const save = useMutation({
    mutationFn: (params: CreateShareTemplateParams) => createShareTemplateMutation(params),
    onSuccess: (data) => {
        if(data){
          let finalizedCollection: ShareTemplate | undefined
          props.updateParentTemplates((prev) => {
            return prev.map((template) => {
              if(template.id === 'temp'){
                finalizedCollection = {
                  ...template,
                  id: data
                }
                return {
                  ...template,
                  id: data,
                }
              }
              return template
            })
          })
          props.updateParentSelectedTemplate(finalizedCollection)
        }
    },
  })

  const update = useMutation({
    mutationFn: (params: UpdateShareTemplateParams) => updateShareTemplateMutation(params)
  })

  const createAccessToken = useMutation({
    mutationFn: (params: CreateAccessTokenMutationParams) => createAccessTokenMutation(params),
    onSuccess: (data) => {
      if(data){
        const finalLink = link + `?temporaryToken=${data}`
        share.mutate({
          emails: emails,
          header: header ? formatString(header) : undefined,
          header2: header2 ? formatString(header2) : undefined,
          body: body ? formatString(body) : undefined,
          footer: footer ? formatString(footer) : undefined,
          coverPath: props.collection.publicCoverPath ?? '',
          link: finalLink,
          name: props.collection.name,
          options: {
            logging: true
          }
        })
      }
    }
  })

  const formatMode = (mode: string) => {
    const temp = mode.substring(0, 1).toLocaleUpperCase()
    const temp2 = mode.substring(1)

    return temp + temp2
  }

  const getCurrentValue = (mode: string) => {
    switch(mode){
      case 'header':
        return header ?? ''
      case 'header2':
        return header2 ?? ''
      case 'body':
        return body ?? ''
      case 'footer':
        return footer ?? ''
      default:
        return ''
    }
  }

  const resolveError = (() => {
    let returnString = !props.collection.coverPath ? 'No Cover' : ''
    returnString += !props.collection.publicCoverPath ? (
      returnString.length > 0 ? 
      ', Missing Public Cover Photo (Republish collection and wait)' : 'Missing Public Cover Photo (Republish collection and wait)'
    ) : ''
    returnString += !props.collection.published ? (
      returnString.length > 0 ? 
        ', Collection is not published.' : 'Collection is not published.'
    ) : (
      returnString.length > 0 ? 
      '.' : ''
    )
    return returnString
  })()

  function formatString(value: string){
    return value.replace(/\n/g, '<br />')
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-center">
            <div className="flex flex-col w-full">
              <TextInput 
                theme={textInputTheme} 
                sizing="md" 
                className="w-full" 
                color={`${emailError ? 'failure' : ''}`}
                helperText={emailError}
                placeholder="Enter Email Here..." 
                onKeyDown={(event) => {
                  if(event.key === 'Enter'){
                    if(!email){
                      setEmailError('Email Required')
                      return
                    }
                    if(!validator.isEmail(email)){
                      setEmailError('Invalid Email Address')
                      return
                    }
                    if(emails.some((value) => value.toLocaleLowerCase() === email.toLocaleLowerCase())){
                      setEmailError('Email Already Entered')
                      return
                    }
                    if(email){
                      setEmails([...emails, email])
                      setEmail('')
                    }
                  }
                }}
                onChange={(event) => {
                  if(emailError) {
                    setEmailError(undefined)
                    setEmail(event.target.value)
                    return
                  }
                  setEmail(event.target.value)
                }}
                value={email}
              />
            </div>
            <Button className="self-start"
              onClick={() => {
                if(!email){
                  setEmailError('Email Required')
                  return
                }
                if(!validator.isEmail(email)){
                  setEmailError('Invalid Email Address')
                  return
                }
                if(emails.some((value) => value.toLocaleLowerCase() === email.toLocaleLowerCase())){
                  setEmailError('Email Already Entered')
                  return
                }
                if(email){
                  setEmails([...emails, email])
                  setEmail('')
                }
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-row gap-4 flex-wrap">
            {emails.map((email, index) => {
              return (
                <Badge 
                  key={index}
                  className="hover:bg-gray-200 hover:cursor-pointer px-4 text-wrap"
                  onClick={() => {
                    setEmails(emails.filter((e) => e !== email))
                  }}
                  icon={HiOutlineX}
                  color="gray"
                >
                  {email}
                </Badge>
              )
            })}
          </div>
          <Dropdown
            label={<span>{formatMode(String(mode))}</span>}
          >
            <Dropdown.Item onClick={() => setMode('header')}>Header</Dropdown.Item>
            <Dropdown.Item onClick={() => setMode('header2')}>Header 2</Dropdown.Item>
            <Dropdown.Item onClick={() => setMode('body')}>Body</Dropdown.Item>
            <Dropdown.Item onClick={() => setMode('footer')}>Footer</Dropdown.Item>
          </Dropdown>
          <AutoExpandTextarea 
            placeholder={`Enter ${formatMode(mode)} Here....`}
            stateUpdate={(value) => {
              switch(mode){
                case 'header':
                  setHeader(value)
                  return
                case 'header2':
                  setHeader2(value)
                  return
                case 'body':
                  setBody(value)
                  return
                case 'footer':
                  setFooter(value)
                  return
              }
            }}          
            parentValue={getCurrentValue(mode)}
          />
          <div className="flex flex-row gap-4 items-center w-full">
            <TextInput 
              theme={textInputTheme} 
              sizing="md" 
              className="w-full" 
              placeholder="Enter Template Name Here..." 
              onChange={(event) => {
                setName(event.target.value)
              }}
              value={name}
            />
            <Button className=" whitespace-nowrap"
              onClick={() => {
                if(name){
                  if(!props.selectedTemplate){
                    save.mutate({
                      name: name,
                      header: header,
                      header2: header2,
                      body: body,
                      footer: footer
                    })
                    props.updateParentTemplates((prev) => {
                      const temp = [...prev, {
                        id: 'temp',
                        name: name,
                        header: header,
                        header2: header2,
                        body: body,
                        footer: footer
                      }]
                      return temp
                    })
                  }
                  else {
                    update.mutate({
                      template: props.selectedTemplate,
                      name: name,
                      header: header,
                      header2: header2,
                      body: body,
                      footer: footer
                    })
                    props.updateParentSelectedTemplate({
                      id: props.selectedTemplate.id,
                      name: name,
                      header: header,
                      header2: header2,
                      body: body,
                      footer: footer
                    })
                    props.updateParentTemplates((prev) => {
                      return prev.map((template) => {
                        if(props.selectedTemplate?.id === template.id){
                          return {
                            id: template.id,
                            name: name,
                            header: header,
                            header2: header2,
                            body: body,
                            footer: footer
                          }
                        }
                        return template
                      })
                    })
                  }
                }
              }}
            >
              {!props.selectedTemplate ? 'Save Template' : 'Update Template'}
            </Button>
          </div>
          {props.selectedTemplate && (
            <Button
              className="whitespace-nowrap self-end"
              onClick={() => {
                if(name){
                  save.mutate({
                    name: name,
                    header: header,
                    header2: header2,
                    body: body,
                    footer: footer
                  })
                  props.updateParentTemplates((prev) => {
                    const temp = [...prev, {
                      id: 'temp',
                      name: name,
                      header: header,
                      header2: header2,
                      body: body,
                      footer: footer
                    }]
                    return temp
                  })
                }
              }}
            >
              Save New Template
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <SharePreview 
            collection={props.collection}
            header={header}
            header2={header2}
            body={body}
            footer={footer}
          />
          <div className="flex flex-col gap-2 items-start">
            <div className="flex flex-row items-center gap-2">
              <Button
                disabled={!props.collection.published || !props.collection.coverPath || !props.collection.publicCoverPath}
                className="w-fit me-4"
                isProcessing={share.isPending || createAccessToken.isPending}
                onClick={() => {
                  if(allowPublicUsers){
                    createAccessToken.mutate({
                      collectionId: props.collection.id,
                    })
                  } else {
                    share.mutate({
                      emails: emails,
                      header: header ? formatString(header) : undefined,
                      header2: header2 ? formatString(header2) : undefined,
                      body: body ? formatString(body) : undefined,
                      footer: footer ? formatString(footer) : undefined,
                      coverPath: props.collection.publicCoverPath ?? '',
                      link: link,
                      name: props.collection.name,
                      options: {
                        logging: true
                      }
                    })
                  }
                }}
              >
                Share
              </Button>
              <button className="flex flex-row gap-2 items-center" onClick={() => setAllowPublicUsers(!allowPublicUsers)}>
                <Checkbox readOnly checked={allowPublicUsers}/>
                <span>Allow public users</span>
              </button>
            </div>
            {(!props.collection.published || !props.collection.coverPath || !props.collection.publicCoverPath) && (
              <>
                <HiOutlineExclamationTriangle className="text-yellow-400" size={28} />
                <span className="">{resolveError}</span>
              </>
            )}
            {share.isSuccess && !share.isPending && !createAccessToken.isPending && (
              <>
                <HiOutlineCheckBadge className="text-green-400" size={28} />
                <span>Shared Successfully</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}