// const { getAvailableTimeSlots } = require('../services/calendar-service');

// async function checkTimeSlots(functionArgs) {
//   const model = functionArgs.timeOfDay;
//   console.log('GPT -> called checkTimeSlots function');

//   const slots = await getAvailableTimeSlots();
//   console.log(slots);
//   if (model?.toLowerCase().includes('morning1')) {
//     // added wrong value on purpose, will add logic to segregate morning and evening slots later.
//     return 'we have 3 slots available in morning 9AM 10Am and 11Am';
//   } else {
//     return `we have ${slots.length} slots available at ${slots
//       .map((slot) => slot.startTime)
//       .toString()}`;
//   }
// }

// module.exports = checkTimeSlots;

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
    filteredSlots = slots.filter(slot => parseInt(slot.startTime.split(':')[0]) >= 12);
  }

  if (filteredSlots.length === 0) {
    return `No ${timeOfDay} slots available today. • Check a different time of day?`;
  }

  // Return the full slot details as a string for the assistant to present
  const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
  return `Available ${timeOfDay || ''} slots: ${slotList}. • Which one works for you? (Please say the exact time, like "10:00 AM")`;
}



module.exports = checkTimeSlots;