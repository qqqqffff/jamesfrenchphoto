import { UploadImagesModal as uploadImages } from './UploadImages'
import { CreateUserModal as createUser } from './CreateUser';

export type ModalProps = {
    open: boolean;
    onClose: Function;
}

export const UploadImagesModal = uploadImages;
export const CreateUserModal = createUser