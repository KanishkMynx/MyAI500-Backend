const { google } = require('googleapis');
const moment = require('moment');

// Load the service account key JSON file
const KEYFILEPATH = './keys.json';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Create a JWT client
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// Leaving calendar ID here it should give you a public view of calendar
const calendarId = '5e8e29a689c0ec7f93a3ed065f7ad6f21e25696863e8977f10fd6dc6cc8ef4cf@group.calendar.google.com';

const calendar = google.calendar({ version: 'v3', auth });

const getAvailableTimeSlots = async () => {
  const startDateTime = new Date();
  const endDateTime = new Date();
  endDateTime.setDate(startDateTime.getDate() + 1); // Check availability for the next day

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        items: [{ id: calendarId }], // Replace 'primary' with specific calendar ID if needed
      },
    });

    const busyTimes = response.data.calendars[calendarId].busy;
    const availableSlots = [];

    // Set initial time to 9:00 AM today
    let currentTime = new Date(startDateTime);
    currentTime.setHours(
      currentTime.getHours() > 9 ? currentTime.getHours() + 1 : 9,
      0,
      0,
      0
    ); // 9:00 AM

    // Set end time to 9:00 PM today
    const endOfDayTime = new Date(startDateTime);
    endOfDayTime.setHours(21, 0, 0, 0); // 09:00 PM

    while (currentTime < endOfDayTime) {
      const nextTime = new Date(currentTime);
      nextTime.setMinutes(currentTime.getMinutes() + 30); // Check 30-minute slots

      const isBusy = busyTimes.some((busyTime) => {
        const busyStart = new Date(busyTime.start);
        const busyEnd = new Date(busyTime.end);
        return (
          (currentTime >= busyStart && currentTime < busyEnd) ||
          (nextTime > busyStart && nextTime <= busyEnd)
        );
      });

      if (!isBusy) {
        availableSlots.push({
          startTS: moment(currentTime).toISOString(),
          startTime: moment(currentTime).format('hh:mm A'),
          endTS: moment(nextTime).toISOString(),
          endTime: moment(nextTime).format('hh:mm A'),
        });
      }

      currentTime = nextTime;
    }

    return availableSlots;
  } catch (err) {
    console.error('Error fetching available time slots:', err);
  }
};

function bookTimeSlot(time, name, email) { // Added 'email' parameter
  let [hour, _minute] = time.split(':');
  let [minute, timeOfDay] = _minute.split(' ');
  const calendar = google.calendar({ version: 'v3', auth });
  
  hour = timeOfDay.includes('AM') ? hour : parseInt(hour) + 12;
  minute = minute.split(' ')[0];

  console.log(hour, minute);

  const appointmentStartTime = moment()
    .set({ hour, minute })
    .toDate();
  const appointmentEndTime = moment(appointmentStartTime)
    .add(30, 'minutes')
    .toDate();

  const event = {
    summary: `Appointment with Client ${name}`,
    location: '123 Main St, Anytown, USA',
    description: 'Discuss project details and next steps.',
    start: {
      dateTime: appointmentStartTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: appointmentEndTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    attendees: email ? [{ email }] : [], // Add user as attendee if email is provided
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 10 }, // 10 minutes before
      ],
    },
    sendUpdates: 'all', // Ensures the user gets an email notification
  };

  calendar.events.insert(
    {
      calendarId: calendarId,
      resource: event,
    },
    (err, event) => {
      if (err) {
        console.error('There was an error contacting the Calendar service:', err);
        return;
      }
      console.log('Event created: %s', event.data.htmlLink);
    }
  );

  return event;
}

// Update the export to reflect the new function signature


module.exports = { getAvailableTimeSlots, bookTimeSlot };
