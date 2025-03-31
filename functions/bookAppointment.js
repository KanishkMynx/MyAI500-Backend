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
  console.log('GPT -> called bookAppointment function');
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (time && name && email && emailRegex.test(email)) {
    const event = await bookTimeSlot(time, name, email); // Await the result
    return `Appointment confirmed for ${name} at ${time} IST. • I’ve booked it on my calendar. • Check your email (${email}) for details if you use Google Calendar!`;
  } else {
    return 'I didn’t catch all the details correctly. • Please provide your time, name, and a valid email again.';
  }
}

module.exports = bookAppointment;