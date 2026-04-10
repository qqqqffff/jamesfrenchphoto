import { AuthContext } from "../../auth";
import { PaymentService } from "../../services/paymentService";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CollectionPaymentStatus, CollectPaymentIntent, ComponentNotification } from "../../types";
import { PaymentForm } from "../payment/PaymentForm";
import { Alert } from "flowbite-react";

interface CollectPaymentScreenProps {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: CollectPaymentIntent,
  successPaymentMethodCapture: (
    vaultId: string,
    options: {
      savePaymentSuccess?: boolean
    }
  ) => void
}


export const CollectPaymentScreen = (props: CollectPaymentScreenProps) => {
  const [paymentMethod, setPaymentMethod] = useState<CollectionPaymentStatus>()
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [paymentNotifications, setPaymentNotifications] = useState<ComponentNotification[]>([])

  const userBillingAddressesQuery = useQuery(props.PaymentService.getUserBillingAddressesQueryOptions({
    userEmail: props.auth.user?.profile.email
  }))

  const userSavedPaymentMethodsQuery = useQuery(props.PaymentService.getUserSavedPaymentMethodsQueryOptions({
    userEmail: props.auth.user?.profile.email,
    role: 'OWNER'
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex justify-center -top-4 z-20">
        {paymentNotifications
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .filter((_, index) => index < 3)
        .reverse()
        .map((notification, index) => {
          return (
            <Alert
              key={notification.id}
              color={notification.status === 'Error' ? 'red' : 'green'}
              onDismiss={() => {
                if(notification.autoClose !== null) {
                  clearTimeout(notification.autoClose)
                }
                setPaymentNotifications(prev => prev.filter((noti) => noti.id !== notification.id))
              }}
              className={`absolute w-[70%] opacity-80 border transition-opacity ${index > 0 ? '-mt-12' : ''}`}
            >
              {notification.message}
            </Alert>
          )
        })}
      </div>
      <div className={`${orderProcessing ? 'hidden' : ''}`}>
        <PaymentForm 
          intent={props.intent}
          PaymentService={props.PaymentService}
          auth={props.auth}
          customerSavedPaymentMethods={userSavedPaymentMethodsQuery.data ?? []}
          billingAddresses={userBillingAddressesQuery.data ?? []}
          savedPaymentMethodsQuery={userSavedPaymentMethodsQuery}
          billingAddressQuery={userBillingAddressesQuery}
          collectionPaymentStatus={paymentMethod}
          setCollectionPaymentStatus={setPaymentMethod}
          setOrderProcessing={setOrderProcessing}
          setPaymentNotifications={setPaymentNotifications}
        />
      </div>
      {/* TODO: display order processing spinner and completion before redirecting */}
    </div>
  )
}