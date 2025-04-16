const { getAvailableTimeSlots } = require('../services/calendar-service');

async function checkTimeSlots(functionArgs) {
  const { timeOfDay } = functionArgs;
  console.log('GPT -> called checkTimeSlots function');

  const slots = await getAvailableTimeSlots();
  if (!slots || slots.length === 0) {
    return 'No available slots right now. • Try again later!';
  }

  let filteredSlots = slots;
  if (timeOfDay?.toLowerCase() === 'morning') {
    filteredSlots = slots.filter(slot => parseInt(slot.startTime.split(':')[0]) < 12);
  } else if (timeOfDay?.toLowerCase() === 'evening') {
    filteredSlots = slots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      const isPM = slot.startTime.toLowerCase().includes('pm');
      return (isPM && hour >= 5 && hour <= 9) || (hour === 12 && isPM); // 5:00 PM to 9:00 PM IST
    });
  }

  if (filteredSlots.length === 0) {
    return `No ${timeOfDay} slots available today. • Check a different time of day?`;
  }

  const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
  return `Available ${timeOfDay || ''} slots: ${slotList}. • Which one works for you? (Please say the exact time, like "10:00 AM")`;
}

module.exports = checkTimeSlots;