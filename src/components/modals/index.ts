import { UploadImagesModal as uploadImages } from './UploadImages'
import { CreateUserModal as createUser } from './CreateUser';
import { ConfirmationModal as confirmation } from './Confirmation'
import { CreateTagModal as createTag } from './CreateTag'
import { CreateTimeslotModal as createTimeslot } from './CreateTimeslot';
import { TermsAndConditionsModal as termsAndConditions } from './TermsAndConditions';
import { UserColumnModal as userColumn } from './UserColumn';
import { CreateEventModal as createEvent } from './CreateEvent';
import { CreatePackageModal as createPackage } from './CreatePackage';


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
export const CreateEventModal = createEvent
export const CreatePackageModal = createPackage