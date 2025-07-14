// const { getAvailableTimeSlots } = require('../services/calendar-service');

// async function checkTimeSlots(functionArgs) {
//   console.log('Using mock slots for testing');
//   const slots = [
//     { startTS: "2025-04-30T09:00:00Z", startTime: "09:00 AM", endTS: "2025-04-30T09:30:00Z", endTime: "09:30 AM" },
//     { startTS: "2025-04-30T10:00:00Z", startTime: "10:00 AM", endTS: "2025-04-30T10:30:00Z", endTime: "10:30 AM" },
//   ];
//   const { timeOfDay } = functionArgs;
//   let filteredSlots = slots;
//   if (timeOfDay?.toLowerCase() === 'morning') {
//     filteredSlots = slots.filter(slot => parseInt(slot.startTime.split(':')[0]) < 12);
//   } else if (timeOfDay?.toLowerCase() === 'evening') {
//     filteredSlots = slots.filter(slot => parseInt(slot.startTime.split(':')[0]) >= 6);
//   }
//   if (filteredSlots.length === 0) {
//     return `No ${timeOfDay} slots available today. • Check a different time of day?`;
//   }
//   const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
//   return `Available ${timeOfDay || ''} slots: ${slotList}. • Which one works for you? (Please say the exact time, like "10:00 AM")`;
// }

// module.exports = checkTimeSlots;






const { getAvailableTimeSlots } = require('../services/calendar-service');

async function checkTimeSlots(functionArgs) {
  const { timeOfDay, day = 'today' } = functionArgs; // Add day parameter
  console.log(`Checking time slots for ${timeOfDay || 'any time'} on ${day}`.blue);

  try {
    const slots = await getAvailableTimeSlots(day);
    let filteredSlots = slots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      const period = slot.startTime.includes('PM') && hour !== 12 ? hour + 12 : hour;
      return (period >= 9 && period <= 11) || (period >= 18 && period <= 20);
    });

    if (timeOfDay?.toLowerCase() === 'morning') {
      filteredSlots = filteredSlots.filter(slot => parseInt(slot.startTime.split(':')[0]) < 12);
    } else if (timeOfDay?.toLowerCase() === 'evening') {
      filteredSlots = filteredSlots.filter(slot => parseInt(slot.startTime.split(':')[0]) >= 6);
    }

    if (filteredSlots.length === 0) {
      console.log(`No ${timeOfDay || ''} slots available on ${day}`.yellow);
      return `No ${timeOfDay || ''} slots available ${day === 'tomorrow' ? 'tomorrow' : 'today'}. • Check a different time of day?`;
    }

    const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
    console.log(`Available slots: ${slotList}`.green);
    return `Available ${timeOfDay || ''} slots ${day === 'tomorrow' ? 'tomorrow' : 'today'}: ${slotList}. • Which one works for you? (Please say the exact time, like "10:00 AM")`;
  } catch (err) {
    console.error(`Error checking time slots: ${err.message}`.red);
    return `Sorry, I couldn’t check available slots. • Can you try another time?`;
  }
}

module.exports = checkTimeSlots;