const tools = [
  {
    type: 'function',
    function: {
      name: 'checkTimeSlots',
      say: 'Let me find some slots for you!',
      description: 'checks for available time slots on GCal.',
      parameters: {
        type: 'object',
        properties: {
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'evening'],
            description: 'time of day either morning or evening'
          },
        },
        required: [],
      },
      returns: {
        type: 'object',
        properties: {
          timeSlots: {
            type: 'string',
            description: 'the available time slots'
          }
        }
      }
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      say: 'All right, let me book it for you.',
      description: 'book appointment at selected time on calendar, by creating event and sending an invite to the user',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'selected time from available time slots (e.g., "1:00 PM")',
          },
          name: {
            type: 'string',
            description: 'name of client or user who is trying to book the appointment',
          },
          email: {
            type: 'string',
            description: 'email address of the client to send a calendar invite',
          },
        },
        required: ['time', 'name', 'email'],
      },
      returns: {
        type: 'object',
        properties: {
          timeSlots: {
            type: 'string',
            description: 'booking confirmation'
          }
        }
      }
    },
  },
];

module.exports = tools;