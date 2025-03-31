// const { bookTimeSlot } = require('../services/calendar-service');

// async function bookAppointment(functionArgs) {
//   const { time, name, email } = functionArgs;
//   console.log('GPT -> called bookAppointment function');
  
//   // Simple email validation regex
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
//   if (time && name && email && emailRegex.test(email)) {
//     await bookTimeSlot(time, name, email);
//     return `Appointment confirmed for ${name} at ${time} IST. A calendar invite has been sent to ${email}.`;
//   } else {
//     return 'I didn’t catch all the details correctly. • Please provide your time, name, and a valid email again.';
//   }
// }

// module.exports = bookAppointment;
const { bookTimeSlot } = require('../services/calendar-service');

async function bookAppointment(functionArgs) {
  const { time, name, email } = functionArgs;
  console.log('GPT -> called bookAppointment function', { time, name, email });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (time && name && email && emailRegex.test(email)) {
    try {
      const event = await bookTimeSlot(time, name, email); // Await the booking
      const meetingLink = event.htmlLink || 'link unavailable'; // Fallback if htmlLink isn’t returned
      console.log(`Booking successful: ${meetingLink}`);
      return `Appointment confirmed for ${name} at ${time} IST. • It’s booked on my calendar! • If you use Google Calendar, check ${email} for details.`;
    } catch (err) {
      console.error('Booking error:', err);
      return 'Oops, something went wrong booking your appointment. • Can we try again?';
    }
  } else {
    return 'I didn’t catch all the details. • Please provide your time, name, and a valid email again.';
  }
}

module.exports = bookAppointment;