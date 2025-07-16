const { getAvailableTimeSlots } = require('../services/calendar-service');
const moment = require('moment-timezone');

async function checkTimeSlots(functionArgs) {
  const { timeOfDay, date = 'today' } = functionArgs;
  console.log(`Checking time slots for ${timeOfDay || 'any time'} on ${date}`.blue);

  try {
    // Parse date input
    let targetDate = moment().tz('Asia/Kolkata').startOf('day');
    const today = moment().tz('Asia/Kolkata').startOf('day');

    if (date.toLowerCase() === 'tomorrow') {
      targetDate.add(1, 'days');
    } else if (date.toLowerCase().match(/^\d+\s+days\s+from\s+now$/i)) {
      const days = parseInt(date.match(/\d+/)[0]);
      targetDate.add(days, 'days');
    } else if (date.toLowerCase().match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = daysOfWeek.indexOf(date.toLowerCase());
      const currentDay = targetDate.day();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.add(daysToAdd, 'days');
    } else if (date.toLowerCase() !== 'today') {
      const parsedDate = moment.tz(date, 'YYYY-MM-DD', 'Asia/Kolkata');
      if (parsedDate.isValid()) {
        targetDate = parsedDate.startOf('day');
      } else {
        console.log(`Invalid date format: ${date}`.yellow);
        return `Sorry, I didn’t understand the date "${date}". • Try "tomorrow" or a day like "Friday"?`;
      }
    }

    // Validate date is not in the past
    if (targetDate < today) {
      console.log(`Requested date ${date} is in the past`.yellow);
      return `Sorry, "${date}" is in the past. • Try tomorrow or another future date?`;
    }

    // Fetch available slots
    const slots = await getAvailableTimeSlots(targetDate.format('YYYY-MM-DD'));
    let filteredSlots = slots.filter(slot => {
      const [hour, minute] = slot.startTime.split(':').map(part => parseInt(part));
      const period = slot.startTime.includes('PM') && hour !== 12 ? hour + 12 : hour;
      return (period >= 9 && period <= 11) || (period >= 18 && period <= 20);
    });

    // Handle specific time request
    if (timeOfDay && timeOfDay.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)) {
      const requestedTime = timeOfDay.toLowerCase().replace(/(\d{1,2})(am|pm)/i, '$1:00 $2');
      const [reqHour, reqMinute] = requestedTime.split(':').map(part => parseInt(part));
      const reqPeriod = requestedTime.includes('PM') && reqHour !== 12 ? reqHour + 12 : reqHour;

      // Validate time is within allowed slots
      if (!((reqPeriod >= 9 && reqPeriod <= 11) || (reqPeriod >= 18 && reqPeriod <= 20))) {
        console.log(`Requested time ${timeOfDay} is outside allowed slots`.yellow);
        const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
        return `Sorry, ${timeOfDay} isn’t available. • Available slots on ${date}: ${slotList || 'none'}. • Try morning (9–11 AM) or evening (6–8 PM)?`;
      }

      // Check if time is in the past for today
      if (targetDate.isSame(today, 'day')) {
        const currentIST = moment().tz('Asia/Kolkata');
        const requestedDateTime = moment(targetDate).set({ hour: reqPeriod, minute: parseInt(requestedTime.split(':')[1]) || 0 });
        if (requestedDateTime < currentIST) {
          console.log(`Requested time ${timeOfDay} is in the past`.yellow);
          return `Sorry, ${timeOfDay} is in the past today. • Try another time or tomorrow?`;
        }
      }

      // Filter for specific time
      filteredSlots = filteredSlots.filter(slot => slot.startTime.toLowerCase() === requestedTime);
      if (filteredSlots.length === 0) {
        console.log(`No slot available for ${timeOfDay} on ${date}`.yellow);
        const slotList = slots.map(slot => `${slot.startTime} IST`).join(', ');
        return `Sorry, ${timeOfDay} isn’t available on ${date}. • Available slots: ${slotList || 'none'}. • Try another time or day?`;
      }
      console.log(`Available slot: ${requestedTime} on ${date}`.green);
      return `Great! ${requestedTime} is available on ${date}. • Please provide your name and email.`;
    }

    // Handle morning/evening filtering
    if (timeOfDay?.toLowerCase() === 'morning') {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        const period = slot.startTime.includes('PM') && hour !== 12 ? hour + 12 : hour;
        return period >= 9 && period <= 11;
      });
    } else if (timeOfDay?.toLowerCase() === 'evening') {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        const period = slot.startTime.includes('PM') && hour !== 12 ? hour + 12 : hour;
        return period >= 18 && period <= 20;
      });
    }

    // Filter out past slots for today
    if (targetDate.isSame(today, 'day')) {
      const currentIST = moment().tz('Asia/Kolkata');
      filteredSlots = filteredSlots.filter(slot => {
        const [hour, minute] = slot.startTime.split(':').map(part => parseInt(part));
        const period = slot.startTime.includes('PM') && hour !== 12 ? hour + 12 : hour;
        const slotDateTime = moment(targetDate).set({ hour: period, minute: minute || 0 });
        return slotDateTime >= currentIST;
      });
    }

    // Handle no available slots
    if (filteredSlots.length === 0) {
      console.log(`No ${timeOfDay || 'any'} slots available on ${date}`.yellow);
      return `No ${timeOfDay || 'any'} slots available on ${date}. • Try ${date === 'today' ? 'tomorrow' : 'another day'}?`;
    }

    // Return available slots
    const slotList = filteredSlots.map(slot => `${slot.startTime} IST`).join(', ');
    console.log(`Available slots: ${slotList} on ${date}`.green);
    return `Available ${timeOfDay || ''} slots on ${date}: ${slotList}. • Which one works for you? (Please say the exact time, like "10:00 AM")`;
  } catch (err) {
    console.error(`Error checking time slots: ${err.message}`.red);
    return `Sorry, I couldn’t check available slots. • Can you try another time or day?`;
  }
}

module.exports = checkTimeSlots;