const { bookTimeSlot, getAvailableTimeSlots } = require('../services/calendar-service');

async function bookAppointment(functionArgs) {
  const { time, name, email } = functionArgs;
  console.log('GPT -> called bookAppointment function', { time, name, email });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (time && name && email && emailRegex.test(email)) {
    try {
      const slots = await getAvailableTimeSlots();
      console.log('Slots in bookAppointment:', slots);
      // Normalize time for matching (e.g., "5:00 PM" -> "05:00 PM")
      const normalizedTime = time.replace(/^(\d):/, '0$1:').toLowerCase();
      const selectedSlot = slots.find(slot => slot.startTime.toLowerCase() === normalizedTime);
      
      if (!selectedSlot) {
        return `Sorry, ${time} IST isn’t available. • Please pick a time from the available slots!`;
      }

      const event = await bookTimeSlot(selectedSlot.startTS, name, email);
      const meetingLink = event.htmlLink || 'link unavailable';
      // Debug: Log the booked time in IST
      const bookedDateTime = moment.tz(selectedSlot.startTS, 'Asia/Kolkata').format('YYYY-MM-DD hh:mm A');
      console.log(`Booking successful: ${meetingLink}, DateTime: ${bookedDateTime} IST`);
      return `Appointment confirmed for ${name} at ${time} IST on ${moment.tz(selectedSlot.startTS, 'Asia/Kolkata').format('YYYY-MM-DD')}. • It’s booked on my calendar! • Check ${email} for details.`;
    } catch (err) {
      console.error('Booking error:', err);
      return 'Oops, something went wrong booking your appointment. • Can we try again?';
    }
  } else {
    return 'I didn’t catch all the details. • Please provide your time, name, and a valid email again.';
  }
}

module.exports = bookAppointment;