import { UploadImagesModal as uploadImages } from './UploadImages/UploadImages'
import { CreateUserModal as createUser } from './CreateUser';
import { ConfirmationModal as confirmation } from './Confirmation'
import { CreateTagModal as createTag } from './CreateTag'
import { CreateTimeslotModal as createTimeslot } from './CreateTimeslot';
import { TermsAndConditionsModal as termsAndConditions } from './TermsAndConditions';
import { UserColumnModal as userColumn } from './UserColumn';
import { CreatePackageModal as createPackage } from './CreatePackage';
import { CreateCollectionModal as createCollection } from './CreateCollection';
import { EditTimeslotModal as editTimeslot } from './EditTimeslotModal';


export type ModalProps = {
    open: boolean;
    onClose: Function;
}

export const UploadImagesModal = uploadImages;
export const CreateUserModal = createUser
export const ConfirmationModal = confirmation
export const CreateTagModal = createTag
export const CreateTimeslotModal = createTimeslot
export const TermsAndConditionsModal = termsAndConditions
export const UserColumnModal = userColumn
export const CreatePackageModal = createPackage
export const CreateCollectionModal = createCollection
export const EditTimeslotModal = editTimeslot