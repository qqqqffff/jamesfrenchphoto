import { UploadImagesModal as uploadImages } from './UploadImages'

export type ModalProps = {
    open: boolean;
    onClose: Function;
}

export const UploadImagesModal = uploadImages;