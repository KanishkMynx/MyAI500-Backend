const { bookTimeSlot, getAvailableTimeSlots } = require('../services/calendar-service');

async function bookAppointment(functionArgs) {
  try {
    const { time, name, email } = functionArgs;
    console.log('GPT -> called bookAppointment function', { time, name, email });
    
    if (!time || !name || !email) {
      return "I need the time, name, and email to book an appointment. Could you please provide all these details?";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please provide a valid email address.";
    }

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
  } catch (error) {
    console.error('Booking error:', error);
    return 'There was an error booking your appointment. Could you please try again with the details?';
  }
}

module.exports = bookAppointment;
