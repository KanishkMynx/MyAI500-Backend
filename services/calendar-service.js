const { google } = require("googleapis");
const moment = require("moment-timezone"); // Use moment-timezone for better timezone handling

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const credentials = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: SCOPES,
});

const calendarId =
  "5e8e29a689c0ec7f93a3ed065f7ad6f21e25696863e8977f10fd6dc6cc8ef4cf@group.calendar.google.com";
const calendar = google.calendar({ version: "v3", auth });

const getAvailableTimeSlots = async () => {
  // Use moment-timezone to set the date in IST
  const now = moment.tz("Asia/Kolkata"); // Current time in IST
  const startDateTime = moment.tz("Asia/Kolkata").startOf("day"); // Today at 00:00 IST
  const endDateTime = moment.tz(startDateTime, "Asia/Kolkata").endOf("day"); // Today at 23:59 IST

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        timeZone: "Asia/Kolkata",
        items: [{ id: calendarId }],
      },
    });

    const busyTimes = response.data.calendars[calendarId].busy;
    const availableSlots = [];

    // Set the time range for slots (9:00 AM to 9:00 PM IST)
    let currentTime = moment
      .tz(startDateTime, "Asia/Kolkata")
      .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    // If current time is past 9:00 AM, start from the next available slot
    if (now.isAfter(currentTime)) {
      currentTime = now
        .startOf("hour")
        .add(now.minute() > 30 ? 1 : 0, "hours")
        .minute(now.minute() > 30 ? 0 : 30);
    }
    const endOfDayTime = moment
      .tz(startDateTime, "Asia/Kolkata")
      .set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

    while (currentTime < endOfDayTime) {
      const nextTime = moment(currentTime).add(30, "minutes");

      const isBusy = busyTimes.some((busyTime) => {
        const busyStart = moment(busyTime.start);
        const busyEnd = moment(busyTime.end);
        return (
          (currentTime >= busyStart && currentTime < busyEnd) ||
          (nextTime > busyStart && nextTime <= busyEnd)
        );
      });

      if (!isBusy) {
        availableSlots.push({
          startTS: currentTime.toISOString(),
          startTime: currentTime.format("hh:mm A"),
          endTS: nextTime.toISOString(),
          endTime: nextTime.format("hh:mm A"),
        });
      }

      currentTime = nextTime;
    }

    console.log(
      "Current IST time:",
      now.format("YYYY-MM-DD HH:mm:ss A"),
      "Available slots for today:",
      availableSlots
    );
    return availableSlots;
  } catch (err) {
    console.error("Error fetching available time slots:", err);
    return [];
  }
};

async function bookTimeSlot(startTS, name, clientEmail) {
  const appointmentStartTime = moment.tz(startTS, "Asia/Kolkata"); // Parse startTS as IST
  const appointmentEndTime = moment(appointmentStartTime).add(30, "minutes");

  // Debug log to verify the date and time
  console.log(
    "Booking appointment - startTS:",
    startTS,
    "Parsed IST:",
    appointmentStartTime.format("YYYY-MM-DD hh:mm A")
  );

  const event = {
    summary: `Appointment with Client ${name}`,
    location: "123 Main St, Anytown, USA",
    description: "Discuss project details and next steps.",
    start: {
      dateTime: appointmentStartTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: appointmentEndTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  if (clientEmail) {
    event.attendees = [{ email: clientEmail }];
    event.sendUpdates = "all";
  }

  try {
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendNotifications: !!clientEmail,
    });
    console.log("Event created: %s", response.data.htmlLink);
    return response.data;
  } catch (err) {
    console.error("Error creating event:", err);
    if (err.code === 403 || err.message.includes("delegation")) {
      console.log("Retrying without attendees due to permission error...");
      delete event.attendees;
      delete event.sendUpdates;
      const retryResponse = await calendar.events.insert({
        calendarId: calendarId,
        resource: event,
        sendNotifications: false,
      });
      console.log(
        "Event created without attendees: %s",
        retryResponse.data.htmlLink
      );
      return retryResponse.data;
    }
    throw err;
  }
}
module.exports = { getAvailableTimeSlots, bookTimeSlot };
