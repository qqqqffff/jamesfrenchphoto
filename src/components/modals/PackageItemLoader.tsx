import { Modal } from "flowbite-react"
import { ModalProps } from "."
import { UseInfiniteQueryResult } from "@tanstack/react-query"
import { GetInfinitePackageItemsData } from "../../services/packageService"

interface PackageItemLoaderProps extends ModalProps {
  packageItems: UseInfiniteQueryResult<GetInfinitePackageItemsData | undefined, Error>
}

export const PackageItemLoader = () => {
  return (
    <Modal>

    </Modal>
  )
}