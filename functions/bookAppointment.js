const { bookTimeSlot } = require('../services/calendar-service');

async function bookAppointment(functionArgs) {
  const { time, name, email } = functionArgs; // Destructured to include email
  console.log('GPT -> called bookAppointment function');
  
  if (time && name && email) { // Added email to the condition
    await bookTimeSlot(time, name, email); // Pass email to bookTimeSlot
    return `Appointment confirmed for ${name} at ${time} IST. A calendar invite has been sent to ${email}.`;
  } else {
    return 'I didn’t catch all the details. Please provide your time, name, and email again.';
  }
}

module.exports = bookAppointment;