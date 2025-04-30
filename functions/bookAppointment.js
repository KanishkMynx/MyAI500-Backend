// const { bookTimeSlot, getAvailableTimeSlots } = require('../services/calendar-service');

// async function bookAppointment(functionArgs) {
//   const { time, name, email } = functionArgs;
//   console.log('GPT -> called bookAppointment function', { time, name, email });
  
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
//   if (time && name && email && emailRegex.test(email)) {
//     try {
//       const slots = await getAvailableTimeSlots();
//       console.log('Slots in bookAppointment:', slots);
//       // Normalize time for matching (e.g., "5:00 PM" -> "05:00 PM")
//       const normalizedTime = time.replace(/^(\d):/, '0$1:').toLowerCase();
//       const selectedSlot = slots.find(slot => slot.startTime.toLowerCase() === normalizedTime);
      
//       if (!selectedSlot) {
//         return `Sorry, ${time} IST isn’t available. • Please pick a time from the available slots!`;
//       }

//       const event = await bookTimeSlot(selectedSlot.startTS, name, email);
//       const meetingLink = event.htmlLink || 'link unavailable';
//       // Debug: Log the booked time in IST
//       const bookedDateTime = moment.tz(selectedSlot.startTS, 'Asia/Kolkata').format('YYYY-MM-DD hh:mm A');
//       console.log(`Booking successful: ${meetingLink}, DateTime: ${bookedDateTime} IST`);
//       return `Appointment confirmed for ${name} at ${time} IST on ${moment.tz(selectedSlot.startTS, 'Asia/Kolkata').format('YYYY-MM-DD')}. • It’s booked on my calendar! • Check ${email} for details.`;
//     } catch (err) {
//       console.error('Booking error:', err);
//       return 'Oops, something went wrong booking your appointment. • Can we try again?';
//     }
//   } else {
//     return 'I didn’t catch all the details. • Please provide your time, name, and a valid email again.';
//   }
// }

// module.exports = bookAppointment;



// bookAppointment.js
const { bookTimeSlot } = require('../services/calendar-service');
const moment = require('moment-timezone');

async function bookAppointment(functionArgs) {
  const { time, name, email } = functionArgs;
  console.log('GPT -> called bookAppointment function', { time, name, email });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (time && name && email && emailRegex.test(email)) {
    try {
      // Normalize time for matching (e.g., "5:00 PM" -> "05:00 PM")
      const normalizedTime = time.replace(/^(\d):/, '0$1:').toLowerCase();
      // Assume time is provided in IST and valid (validated by checkTimeSlots)
      const startDateTime = moment.tz("Asia/Kolkata").startOf("day");
      const timeParts = normalizedTime.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
      if (!timeParts) {
        return 'Invalid time format. • Please provide a time like "10:00 AM".';
      }
      let [_, timeStr, period] = timeParts;
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
      const appointmentStartTime = startDateTime.set({ hour: hours, minute: minutes });

      // Validate time is within allowed range (9-11 AM or 6-8 PM)
      const hour = appointmentStartTime.hour();
      if (!((hour >= 9 && hour <= 11) || (hour >= 18 && hour <= 20))) {
        return 'Sorry, we only have morning slots • 9 to 11 AM • or evening • 6 to 8 PM. • Please pick another time.';
      }

      const event = await bookTimeSlot(appointmentStartTime.toISOString(), name, email);
      const meetingLink = event.htmlLink || 'link unavailable';
      const bookedDateTime = appointmentStartTime.format('YYYY-MM-DD hh:mm A');
      console.log(`Booking successful: ${meetingLink}, DateTime: ${bookedDateTime} IST`);
      return `Appointment confirmed for ${name} at ${time} IST on ${appointmentStartTime.format('YYYY-MM-DD')}. • It’s booked on my calendar! • Check ${email} for details.`;
    } catch (err) {
      console.error('Booking error:', err);
      return 'Oops, something went wrong booking your appointment. • Can we try again?';
    }
  } else {
    return 'I didn’t catch all the details. • Please provide your time, name, and a valid email again.';
  }
}

module.exports = bookAppointment;