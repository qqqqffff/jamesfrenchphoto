import { Schema } from "../../data/resource";
import sgMail from '@sendgrid/mail'
import ics, { EventAttributes } from 'ics'

export const handler: Schema['SendTimeslotConfirmation']['functionHandler'] = async (event) => {
    const email = event.arguments.email
    const start = new Date(event.arguments.start)
    const end = new Date(event.arguments.end)
    if(!process.env.SENDGRID_API_KEY) return JSON.stringify('Missing API Key')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const delta = new Date(end.getTime() - start.getTime())
    const calendarEvent: EventAttributes = {
        start: [start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()],
        duration: { hours: delta.getHours(), minutes: delta.getMinutes() },
        title: 'LAF Photoshoot',
        description: 'Photoshoot for your participant',
        url: 'https://www.jamesfrenchphotography.com',
        status: 'CONFIRMED',
        categories: ['James French Photography', 'Photoshoot', 'La Fiesta'],
        busyStatus: 'BUSY',
        organizer: { name: 'James French Photography', email: 'no-reply@jamesfrenchphotography.com' },
        attendees: [
            { email: email, rsvp: true, role: 'REQ-PARTICIPANT' }
        ]
    }

    let calendarInvite: Buffer | undefined

    ics.createEvent(calendarEvent, async (error, value) => {
        if(error) {
            console.log(error)
            return
        }
        calendarInvite = Buffer.from(await new Blob([value], { type: 'text/calendar' }).text())
    })

    const message: sgMail.MailDataRequired = {
        to: email,
        from: 'no-reply@jamesfrenchphotography.com',
        subject: 'James French Photography Timeslot Confirmation',
        html: `
            <p>
                Your photoshoot timeslot has been confirmed to be on<strong>${' ' + start.toLocaleDateString() + ' '}</strong>from<strong>${' ' + start.toLocaleTimeString() + " - " + end.toLocaleTimeString()}</strong>. If you wish to unregister from this timeslot please login and unregister by finding and clicking on the same timeslot. Please feel free to change your registration up until one day before your date.
            </p>`,
        attachments: calendarInvite ? [
            {
                content: calendarInvite.toString('base64'),
                filename: '2025_laf_debutante_headshot.ics',
                type: 'text/calendar',
                disposition: 'headshot calendar'
            }
        ] : undefined
    }

    const response = await sgMail.send(message)

    return JSON.stringify([email, start, end, process.env.SENDGRID_API_KEY,  calendarEvent, response, calendarInvite?.toString('base64')])
}