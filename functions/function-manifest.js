// // // create metadata for all the available functions to pass to completions API
// // const tools = [
// //   {
// //     type: 'function',
// //     function: {
// //       name: 'checkTimeSlots',
// //       say: 'All right, let me check the available time slots on calendar.',
// //       description: 'checks for available time slots on GCal.',
// //       parameters: {
// //         type: 'object',
// //         properties: {
// //           timeOfDay: {
// //             type: 'string',
// //             enum: ['morning', 'evening'],
// //             description: 'time of day either morning or evening',
// //           },
// //         },
// //         required: [], // No change: timeOfDay is optional
// //       },
// //       returns: {
// //         type: 'object',
// //         properties: {
// //           timeSlots: {
// //             type: 'string',
// //             description: 'the available time slots'
// //           }
// //         }
// //       }
// //     },
// //   },
// //   {
// //     type: 'function',
// //     function: {
// //       name: 'bookAppointment',
// //       say: 'All right, let me book it for you.',
// //       description: 'book appointment at selected time on calendar, by creating event and sending an invite to the user',
// //       parameters: {
// //         type: 'object',
// //         properties: {
// //           time: {
// //             type: 'string',
// //             description: 'selected time from available time slots (e.g., "1:00 PM")',
// //           },
// //           name: {
// //             type: 'string',
// //             description: 'name of client or user who is trying to book the appointment',
// //           },
// //           email: {
// //             type: 'string',
// //             description: 'email address of the client to send a calendar invite',
// //           },
// //         },
// //         required: ['time', 'name', 'email'], // Updated: email is now required
// //       },
// //       returns: {
// //         type: 'object',
// //         properties: {
// //           timeSlots: { // Note: Should probably be renamed to 'confirmation' for clarity
// //             type: 'string',
// //             description: 'booking confirmation'
// //           }
// //         }
// //       }
// //     },
// //   },
// // ];

// // module.exports = tools;
// const tools = [
//   {
//     type: 'function',
//     function: {
//       name: 'checkTimeSlots',
//       say: 'All right, let me check the available time slots on calendar.',
//       description: 'checks for available time slots on GCal.',
//       parameters: {
//         type: 'object',
//         properties: {
//           timeOfDay: {
//             type: 'string',
//             enum: ['morning', 'evening'],
//             description: 'time of day either morning or evening'
//           },
//         },
//         required: [],
//       },
//       returns: {
//         type: 'object',
//         properties: {
//           timeSlots: {
//             type: 'string',
//             description: 'the available time slots'
//           }
//         }
//       }
//     },
//   },
//   {
//     type: 'function',
//     function: {
//       name: 'bookAppointment',
//       say: 'All right, let me book it for you.',
//       description: 'book appointment at selected time on calendar, by creating event and sending an invite to the user',
//       parameters: {
//         type: 'object',
//         properties: {
//           time: {
//             type: 'string',
//             description: 'selected time from available time slots (e.g., "1:00 PM")',
//           },
//           name: {
//             type: 'string',
//             description: 'name of client or user who is trying to book the appointment',
//           },
//           email: {
//             type: 'string',
//             description: 'email address of the client to send a calendar invite',
//           },
//         },
//         required: ['time', 'name', 'email'],
//       },
//       returns: {
//         type: 'object',
//         properties: {
//           timeSlots: {
//             type: 'string',
//             description: 'booking confirmation'
//           }
//         }
//       }
//     },
//   },
// ];

// module.exports = tools;
const tools = [
  {
    type: 'function',
    function: {
      name: 'checkTimeSlots',
      say: 'Let me find some slots for you!',
      description: 'Checks for available time slots on Google Calendar.',
      parameters: {
        type: 'object',
        properties: {
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'evening'],
            description: 'Time of day either morning or evening. If omitted, all available slots will be returned.',
          },
          date: {
            type: 'string',
            description: 'Date for which to check availability. Can be "today", "tomorrow", or a specific date in "YYYY-MM-DD" format.',
          },
        },
        required: ['date'], // Ensures the user provides a date
      },
      returns: {
        type: 'object',
        properties: {
          timeSlots: {
            type: 'string',
            description: 'A list of available time slots in IST.',
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
      description: 'Books an appointment at the selected time on the calendar by creating an event and sending an invite to the user.',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'Selected time from available time slots (e.g., "10:30 AM").',
          },
          date: {
            type: 'string',
            description: 'Date for the appointment. Can be "today", "tomorrow", or a specific date in "YYYY-MM-DD" format.',
          },
          name: {
            type: 'string',
            description: 'Name of the client or user who is trying to book the appointment.',
          },
          email: {
            type: 'string',
            description: 'Email address of the client to send a calendar invite.',
          },
        },
        required: ['time', 'date', 'name', 'email'], // Ensures a complete booking request
      },
      returns: {
        type: 'object',
        properties: {
          confirmation: {  // Renamed from timeSlots for clarity
            type: 'string',
            description: 'Booking confirmation message.',
          }
        }
      }
    },
  },
];

module.exports = tools;
