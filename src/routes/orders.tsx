import { createFileRoute } from '@tanstack/react-router'

interface OrdersParams {
  type: 'no-show' | 'unkown',
  status: 'success' | 'cancel' | 'failed'
}

export const Route = createFileRoute('/orders')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): OrdersParams => ({
    type: (search.type as OrdersParams['type']) || 'unkown',
    status: (search.status as OrdersParams['status']) || 'failed'
  }),
})

//TODO: do styling and investigate if orderid can be utilized during the order collection flow
//TODO: potentially redirect from this screen to login to view more information about the order
// or if an active user session is detected then automatically redirect 
function RouteComponent() {
  const search = Route.useSearch()

  return (
    <div>
      {search.type === 'unkown' && (
        <span>Unkown Order</span>
      )}
      {search.type === 'no-show' && (
        <span>No show fee</span>
      )}
      {search.status === 'success' && (
        <span>Successfully Captured</span>
      )} 
      {search.status === 'cancel' && (
        <span>Order Cancelled</span>
      )}
      {search.status === 'failed' && (
        <span>Order Failed</span>
      )}
    </div>
  )
}
