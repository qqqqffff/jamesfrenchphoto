import { Stripe } from 'stripe'
import { Schema } from "../../data/resource";

const stripe = new Stripe('sk_test_51LFMxh4ILV990wpfXpMg9Q4czvLN9tXYhtB1QDMNwitTgZT2EmtTB4Vt4dE5slJN6d3y8nImaMoI9Z738hu3eVZh00Vk8YVeMz')

export const handler: Schema['GetPaymentIntent']['functionHandler'] = async (event, context) => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount: 1,
        currency: 'usd',
    })

    console.log('EVENT: ', event, 'CONTEXT: ', context, 'CLIENT SECRET', paymentIntent.client_secret)

    return {
        objects: ['abc'],
        total: paymentIntent.amount,
        currency: 'usd',
        client_secret: '123',
    }
}