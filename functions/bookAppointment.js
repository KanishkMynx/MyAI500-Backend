const { bookTimeSlot } = require('../services/calendar-service');
const moment = require('moment-timezone');

async function bookAppointment(functionArgs) {
  const { time, name, email, date = 'today' } = functionArgs;
  console.log('GPT -> called bookAppointment function', { time, name, email, date });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (time && name && email && emailRegex.test(email)) {
    try {
      // Normalize time and date
      const normalizedTime = time.replace(/^(\d):/, '0$1:').toLowerCase();
      let appointmentDate = moment.tz("Asia/Kolkata").startOf("day");
      if (date.toLowerCase() === 'tomorrow') {
        appointmentDate.add(1, 'days');
      } else if (date.toLowerCase().match(/^\d+\s+days\s+from\s+now$/i)) {
        const days = parseInt(date.match(/\d+/)[0]);
        appointmentDate.add(days, 'days');
      } else if (date.toLowerCase().match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = daysOfWeek.indexOf(date.toLowerCase());
        const currentDay = appointmentDate.day();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        appointmentDate.add(daysToAdd, 'days');
      } else if (date.toLowerCase() !== 'today') {
        const parsedDate = moment.tz(date, 'YYYY-MM-DD', 'Asia/Kolkata');
        if (!parsedDate.isValid()) {
          return `Invalid date format: ${date}. • Please provide a date like "tomorrow" or "2025-07-17".`;
        }
        appointmentDate = parsedDate.startOf('day');
      }

      // Validate date is not in the past
      const today = moment().tz('Asia/Kolkata').startOf('day');
      if (appointmentDate < today) {
        console.log(`Requested date ${date} is in the past`.yellow);
        return `Sorry, "${date}" is in the past. • Try tomorrow or another future date?`;
      }

      // Parse time
      const timeParts = normalizedTime.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
      if (!timeParts) {
        return 'Invalid time format. • Please provide a time like "10:00 AM".';
      }
      let [_, timeStr, period] = timeParts;
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
      const appointmentStartTime = appointmentDate.set({ hour: hours, minute: minutes });

      // Validate time is within allowed range (9-11 AM or 6-8 PM)
      const hour = appointmentStartTime.hour();
      if (!((hour >= 9 && hour <= 11) || (hour >= 18 && hour <= 20))) {
        return 'Sorry, we only have morning slots • 9 to 11 AM • or evening • 6 to 8 PM. • Please pick another time.';
      }

      // Check if time is in the past for today
      if (appointmentDate.isSame(today, 'day')) {
        const currentIST = moment().tz('Asia/Kolkata');
        if (appointmentStartTime < currentIST) {
          return `Sorry, ${time} is in the past today. • Try another time or tomorrow?`;
        }
      }

      const event = await bookTimeSlot(appointmentStartTime.toISOString(), name, email);
      const meetingLink = event.htmlLink || 'link unavailable';
      const bookedDateTime = appointmentStartTime.format('YYYY-MM-DD hh:mm A');
      console.log(`Booking successful: ${meetingLink}, DateTime: ${bookedDateTime} IST`.green);
      return `Appointment confirmed for ${name} at ${time} IST on ${appointmentStartTime.format('YYYY-MM-DD')}. • It’s booked on my calendar! • Check ${email} for details.`;
    } catch (err) {
      console.warn(`Booking warning: ${err.message}`.yellow);
      return 'Oops, something went wrong booking your appointment. • Can we try again?';
    }
  } else {
    return 'I didn’t catch all the details. • Please provide your time, name, and a valid email again.';
  }
}

module.exports = bookAppointment;