import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Package, UserTag } from '../../../types'
import { FC, useState } from 'react'
import { Alert, Button, Modal } from 'flowbite-react'
import PDFViewer from '../../../components/common/PDFViewer'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useAuth } from '../../../auth'
import { useQueries } from '@tanstack/react-query'
import { getCoverPathFromCollectionQueryOptions } from '../../../services/collectionService'

interface PackagePDFModalProps {
    pdf: File,
    pack: Package,
    show: boolean,
    onClose: () => void
}

const PackagePDFModal: FC<PackagePDFModalProps> = ({ pdf, pack, show, onClose }) => {
    return (
      <Modal show={show} onClose={onClose} className="w-full" size="4xl">
        <Modal.Header className={`text-${pack.tag.color ?? 'black'}`}>{pack.name}</Modal.Header>
        <Modal.Body>
          <PDFViewer fileUrl={pdf} />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose}>Close</Button>
        </Modal.Footer>
      </Modal>
    )
}

export const Route = createFileRoute('/_auth/client/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const [activePackagePDF, setActivePackagePDF] = useState<File>()
  const [activePackage, setActivePackage] = useState<Package>()
  const [packagePDFModalVisible, setPackagePDFModalVisible] = useState(false)
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()

  const tags: UserTag[] = auth.user?.profile.activeParticipant?.userTags ?? []

  const collections = tags
        .map((tag) => tag.collections)
        .filter((collection) => collection !== undefined)
        .reduce((prev, cur) => {
            prev.push(...((cur).filter((collection) => (prev.find((prevColl) => prevColl.id !== collection.id)) === undefined)))
            return prev
        }, [])

  const collectionCovers = useQueries({
    queries: collections.map((collection) => 
      getCoverPathFromCollectionQueryOptions(collection))
  })

  

  return (
    <>
      {activePackage && activePackagePDF && (
        <PackagePDFModal 
          show={packagePDFModalVisible} 
          pack={activePackage} 
          pdf={activePackagePDF}
          onClose={() => {
            setActivePackage(undefined)
            setActivePackagePDF(undefined)
            setPackagePDFModalVisible(false)
          }} 
        />       
      )}
      <div className="grid grid-cols-6 mt-8 font-main">
        <div className="flex flex-col items-center justify-center col-start-2 col-span-4 gap-4 border-black border rounded-xl mb-4 overflow-auto">
          <div className="flex flex-col items-center justify-center my-4">
            {tags.length > 0 &&
              tags.map((tag, index) => {
                  if(tag.name === 'LAF Escort 2025'){
                      return (
                          <Alert color="gray" key={index}>Headshots will be taken prior to the announcement party on <strong>Thursday, December 19th</strong>. Please see your emailed photography packets for additional information.</Alert>
                      )
                  }
                  return undefined
              }).filter((element) => element !== undefined)
            }
          </div>
          
          <span className="text-3xl border-b border-b-gray-400 pb-2 px-4">Your Collections:</span>
          
          {collections.length > 0 ? 
            (
              <div className={`grid grid-cols-${dimensions.width > 700 ? 2 : 1} gap-10 mb-4`}>
              {collections.map((collection, index) => {
              return (
                <button 
                    className="flex flex-row justify-center items-center relative rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] hover:bg-gray-300 hover:text-gray-500"
                    onClick={() => {
                        navigate({ to: `/photo-collection/${collection.id}`})
                    }}
                    key={index}
                >
                  <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                    <p className={`font-thin opacity-90 text-2xl`}>{collection.name}</p>
                  </div>
                  <img src={collectionCovers.find((path) => path.data?.[0] === collection.id)?.data?.[1]} className="max-h-[238px] max-w-[360px]"/>
                </button>
              )
              })}
            </div>) :
            (<div className="text-xl text-gray-400 italic flex flex-col text-center mb-4">
              <span>Sorry, there are no viewable collections for you right now.</span>
              <span>You will receive a notification when your collection is ready!</span>
            </div>
            )
          }
          

          {/* <span className="text-3xl border-b border-b-gray-400 pb-2 px-4">Your Package{packages.length > 1 ? 's' : ''}</span>
          <div className="flex flex-col items-center border border-gray-300 rounded-lg p-4 mb-4">
              {packages.length > 0 ? (
                  packages.map((pack, index) => {
                      const packageClass = `flex flex-row items-center justify-between hover:bg-gray-100 rounded-lg py-2 px-4 border-black border ${activePackage?.id == pack.id ? 'bg-gray-200' : ''} text-${pack.tag.color ?? 'black'}`
                      return (
                          <button className={packageClass} key={index}
                              onClick={async () => {
                                  if(activePackage?.id !== pack.id){
                                      const result = await downloadData({
                                          path: pack.pdfPath,
                                      }).result
                                      const file = new File([await result.body.blob()], pack.pdfPath.substring(pack.pdfPath.indexOf('_') + 1), { type: result.contentType })
                                      
                                      setActivePackage(pack)
                                      setActivePackagePDF(file)
                                      setPackagePDFModalVisible(true)
                                  }
                                  else if(activePackage?.id === pack.id){
                                      setActivePackage(undefined)
                                      setActivePackagePDF(undefined)
                                  }
                              }}
                          >
                              <span>{pack.name}</span>
                          </button>
                      )
                  })
              ) : (
                  <div className="text-xl text-gray-400 italic flex flex-col text-center">
                      <span>Sorry, there are no viewable packages for you right now.</span>
                  </div>
              )}
          </div> */}
        </div>
    </div>
    </>
  )
}
