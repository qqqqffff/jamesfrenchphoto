import { Schema } from "../../data/resource";
import sgMail from '@sendgrid/mail'
import ics, { EventAttributes } from 'ics'
import { DateTime } from 'luxon'

export const handler: Schema['SendTimeslotConfirmation']['functionHandler'] = async (event) => {
    const email = event.arguments.email
    const start = new Date(event.arguments.start)
    const end = new Date(event.arguments.end)
    if(!process.env.SENDGRID_API_KEY) return JSON.stringify('Missing API Key')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const delta = new Date(end.getTime() - start.getTime())
    const startDateTime = DateTime.fromObject(
        { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate(), hour: start.getHours(), minute: start.getMinutes()},
        { zone: 'America/Chicago' }
    )
    const startUTC = startDateTime
    
    const calendarEvent: EventAttributes = {
        start: [startUTC.year, startUTC.month, startUTC.day, startUTC.hour, startUTC.minute],
        duration: { hours: delta.getHours(), minutes: delta.getMinutes() },
        title: 'LAF Photoshoot',
        description: 'Photoshoot for your participant',
        url: 'https://www.jamesfrenchphotography.com',
        geo: { lat: 32.813040, lon: -96.803810 },
        location: '3624 Oak Lawn Ave # 222, Dallas, TX 75219',
        status: 'CONFIRMED',
        categories: ['James French Photography', 'Photoshoot', 'La Fiesta'],
        busyStatus: 'BUSY',
        organizer: { name: 'James French Photography', email: 'no-reply@jamesfrenchphotography.com' },
        attendees: [
            { email: email, rsvp: true, role: 'REQ-PARTICIPANT' }
        ],
        alarms: [{action: 'display', trigger: { minutes: 30, before: true }}]
    }

    let calendarInvite: Buffer | undefined

    ics.createEvent(calendarEvent, async (error, value) => {
        if(error) {
            console.log(error)
            return
        }
        calendarInvite = Buffer.from(value, 'utf-8')
    })

    const message: sgMail.MailDataRequired = {
        to: email,
        from: 'no-reply@jamesfrenchphotography.com',
        subject: 'James French Photography Timeslot Confirmation',
        html: `
            <p>
                Your photoshoot timeslot has been confirmed to be on<strong>${' ' + start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' }) + ' '}</strong>from<strong>${' ' + start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' }) + " - " + end.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</strong>. If you wish to unregister from this timeslot please login and unregister by finding and clicking on the same timeslot. Please feel free to change your registration up until one day before your date.
            </p>`,
        attachments: calendarInvite !== undefined ? [
            {
                content: calendarInvite.toString('base64'),
                filename: 'jfphoto_calendar_invite.ics',
                type: 'text/calendar',
                disposition: 'attachment'
            }
        ] : undefined
    }

    const response = await sgMail.send(message)
    console.log(response)

    return JSON.stringify([calendarEvent, calendarInvite?.toString('base64')])
}