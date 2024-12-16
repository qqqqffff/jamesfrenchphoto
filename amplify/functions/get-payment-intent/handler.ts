import { Schema } from "../../data/resource";


export const handler: Schema['GetPaymentIntent']['functionHandler'] = async (event, context) => {
    console.log('EVENT: ', event, 'CONTEXT: ', context, 'CLIENT SECRET')

    return {
        objects: ['abc'],
        currency: 'usd',
        client_secret: '123',
    }
}