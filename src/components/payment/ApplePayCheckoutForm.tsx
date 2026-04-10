import { useEligibleMethods, usePayPal } from "@paypal/react-paypal-js/sdk-v6"
import { Dispatch, SetStateAction, useEffect, useRef } from "react"
import { APIMutationResponse, CollectPaymentIntent, PaymentType } from '../../types'
import { generateApplePaymentLabel } from "../../functions/paymentFunctions"
import { ConfirmSavePaymentInformationMutationParams, CreateShortNoticeCancelationOrderMutationParams, PaymentService, SavePaymentInformationMutationParams } from "../../services/paymentService"
import { useMutation } from "@tanstack/react-query"
import { AuthContext } from "../../auth"


interface ApplePayCheckoutFormProps {
  PaymentService: PaymentService
  auth: AuthContext
  formtype: PaymentType
  intent: CollectPaymentIntent
  existingDefault: boolean
  onSubmit: (status: APIMutationResponse) => void
  setOrderProcessing: Dispatch<SetStateAction<boolean>>
}

export const ApplePayCheckoutForm = (props: ApplePayCheckoutFormProps) => {
  const eligible = useEligibleMethods()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const paypal = usePayPal()

  useEffect(() => {
    if(
      eligible.eligiblePaymentMethods && 
      paypal.sdkInstance
    ) {
      const applePayEligible = eligible.eligiblePaymentMethods.isEligible('applepay')
      const applePayConfig = eligible.eligiblePaymentMethods.getDetails('applepay').config
      if(applePayEligible && containerRef.current) {
        containerRef.current.innerHTML = 
        `<apple-pay-button id="apple-pay-button" buttonstyle="black" type="buy" locale="en">`

        document.getElementById('apple-pay-button')?.addEventListener('click', () => {
          if(paypal.sdkInstance) {
            const session = paypal.sdkInstance.createApplePayOneTimePaymentSession()

            // @ts-ignore
            const paymentRequest: ApplePayJS.ApplePayPaymentRequest = {
              ...session.formatConfigForPaymentRequest(applePayConfig),
              countryCode: 'US',
              currencyCode: 'USD',
              requiredBillingContactFields: ['postalAddress', 'email'],
              total: {
                label: generateApplePaymentLabel(props.intent),
                amount: props.intent.amount.toFixed(2)
              }
            }

            // @ts-ignore
            const appleSdkSession = new ApplePaySession(14, paymentRequest)

            // @ts-ignore
            appleSdkSession.onvalidatemerchant = async (event) => {
              const payload = await session.validateMerchant({
                validationUrl: event.validationURL,
                displayName: 'James French Photography',
                domainName: window.location.href.includes('staging') ? 'staging.jamesfrenchphoto.com' : 'jamesfrenchphoto.com'
              })
              appleSdkSession.completeMerchantValidation(payload.merchantSession)
            }

            // @ts-ignore
            appleSdkSession.onpaymentauthorized = async (event) => {
              if(!props.auth.user) {
                appleSdkSession.completePayment({
                  // @ts-ignore
                  status: ApplePaySession.STATUS_FAILURE
                })
                props.onSubmit({
                  status: 'Fail',
                  error: 'No current authenticated user'
                })
                return
              }
              if(props.intent.captureShortnotice && !props.intent.vaultNoshow) {
                props.setOrderProcessing(true)
                useMutation({
                  mutationFn: (params: CreateShortNoticeCancelationOrderMutationParams) => props.PaymentService.createShortNoticeCancelationOrderMutation(params)
                }).mutateAsync({
                  timeslotId: props.intent.timeslotId,
                  userEmail: props.auth.user.profile.email
                }).then((response) => {
                  if(response.status === 'Success' && response.orderId !== undefined) {
                    session.confirmOrder({
                      orderId: response.orderId,
                      token: event.payment.token,
                      billingContact: event.payment.billingContact ?? '',
                    }).then((response) => {
                      console.log(response)
                      //TODO: handle different response types
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: ApplePaySession.STATUS_SUCCESS
                      })
                      props.onSubmit({
                        status: 'Success'
                      })
                      props.setOrderProcessing(false)
                    }).catch((err) => {
                      console.error(err)
                      props.onSubmit({
                        status: 'Fail',
                        error: (err as Error).message
                      })
                      props.setOrderProcessing(false)
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: ApplePaySession.STATUS_FAILURE
                      })
                    })
                  }
                }).catch((err) => {
                  console.error(err)
                  props.onSubmit({
                    status: 'Fail',
                    error: (err as Error).message
                  })
                  props.setOrderProcessing(false)
                  appleSdkSession.completePayment({
                    // @ts-ignore
                    status: ApplePaySession.STATUS_FAILURE
                  })
                })
              }
              else if(props.intent.vaultNoshow && !props.intent.captureShortnotice) {
                //When vaulting no show only saving payment method for future charge is required
                props.setOrderProcessing(true)
                useMutation({
                  mutationFn: (params: SavePaymentInformationMutationParams) => props.PaymentService.savePaymentInformationMutation(params)
                }).mutateAsync({
                  userEmail: props.auth.user.profile.email,
                  userId: props.auth.user.user.userId,
                  paymentType: 'APPLEPAY',
                  applePaymentToken: Buffer.from(JSON.stringify(event.payment.token)).toString('base64'),
                  billingAddress: {
                    id: '',
                    customerId: '',
                    userEmail: '',
                    saved: false,
                    default: !props.existingDefault,
                    addressLineOne: event.payment.billingContact?.addressLines?.[0] ?? '',
                    addressLineTwo: event.payment.billingContact?.addressLines?.[1],
                    adminAreaOne: event.payment.billingContact?.locality ?? '',
                    adminAreaTwo: event.payment.billingContact?.administrativeArea ?? '',
                    postalCode: event.payment.billingContact?.postalCode ?? '',
                    countryCode: event.payment.billingContact?.countryCode ?? 'US',
                    createdAt: new Date().toISOString()
                  }
                }).then((response) => {
                  if(response.status === 'Success' && props.auth.user) {
                    useMutation({
                      mutationFn: (params: ConfirmSavePaymentInformationMutationParams) => props.PaymentService.confirmSavePaymentInformationMutation(params)
                    }).mutateAsync({
                      userEmail: props.auth.user.profile.email,
                      paymentToken: response.setupTokenResponse,
                      customerId: response.customerId,
                      paymentType: "APPLEPAY",
                      default: !props.existingDefault
                    }).then((response) => {
                      props.onSubmit(response)
                      props.setOrderProcessing(false)
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: response.status === 'Success' ? ApplePaySession.STATUS_SUCCESS : ApplePaySession.STATUS_FAILURE
                      })
                    }).catch((err) => {
                      console.error(err)
                      props.onSubmit({
                        status: 'Fail',
                        error: (err as Error).message
                      })
                      props.setOrderProcessing(false)
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: ApplePaySession.STATUS_FAILURE
                      })
                    })
                  }
                  else {
                    props.onSubmit(response)
                    props.setOrderProcessing(false)
                    appleSdkSession.completePayment({
                      // @ts-ignore
                      status: ApplePaySession.STATUS_FAILURE
                    })
                  }
                }).catch((err) => {
                  console.error(err)
                  props.onSubmit({
                    status: 'Fail',
                    error: (err as Error).message
                  })
                  props.setOrderProcessing(false)
                  appleSdkSession.completePayment({
                    // @ts-ignore
                    status: ApplePaySession.STATUS_FAILURE
                  })
                })
              }
              else if(props.intent.vaultNoshow && props.intent.captureShortnotice) {
                props.setOrderProcessing(true)
                useMutation({
                  mutationFn: (params: CreateShortNoticeCancelationOrderMutationParams) => props.PaymentService.createShortNoticeCancelationOrderMutation(params)
                }).mutateAsync({
                  timeslotId: props.intent.timeslotId,
                  userEmail: props.auth.user.profile.email,
                  vaulting: {
                    paymentType: 'APPLEPAY'
                  }
                }).then((response) => {
                  if(response.status === 'Success' && response.orderId) {
                    session.confirmOrder({
                      orderId: response.orderId,
                      token: event.payment.token,
                      billingContact: event.payment.billingContact ?? ''
                    }).then((response) => {
                      console.log(response)
                      //TODO: handle different response types
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: ApplePaySession.STATUS_SUCCESS
                      })
                      props.onSubmit({
                        status: 'Success'
                      })
                      props.setOrderProcessing(false)
                    }).catch((err) => {
                      console.error(err)
                      appleSdkSession.completePayment({
                        // @ts-ignore
                        status: ApplePaySession.STATUS_FAILURE
                      })
                      props.onSubmit({
                        status: 'Fail',
                        error: (err as Error).message
                      })
                      props.setOrderProcessing(false)
                    })
                  }
                  else {
                    props.onSubmit(response)
                    props.setOrderProcessing(false)
                    appleSdkSession.completePayment({
                      // @ts-ignore
                      status: ApplePaySession.STATUS_FAILURE
                    })
                  }
                }).catch((err) => {
                  console.error(err)
                  props.onSubmit({
                    status: 'Fail',
                    error: (err as Error).message
                  })
                  props.setOrderProcessing(false)
                  appleSdkSession.completePayment({
                    // @ts-ignore
                    status: ApplePaySession.STATUS_FAILURE
                  })
                })
              }
            }

            appleSdkSession.begin()
          }
        })
      }
    }
  }, [eligible.eligiblePaymentMethods, paypal.sdkInstance])

  return (
    <div ref={containerRef}></div>
  )
}