// const tools = [
//   {
//     type: "function",
//     function: {
//       name: "checkTimeSlots",
//       say: "Let me find some slots for you!",
//       description: "Checks for available time slots on GCal.",
//       parameters: {
//         type: "object",
//         properties: {
//           timeOfDay: {
//             type: "string",
//             enum: ["morning", "evening"],
//             description: "Time of day, either morning or evening",
//           },
//         },
//         required: [],
//       },
//       returns: {
//         type: "object",
//         properties: {
//           timeSlots: {
//             type: "string",
//             description: "The available time slots",
//           },
//         },
//       },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "bookAppointment",
//       say: "All right, let me book it for you.",
//       description:
//         "Books appointment at selected time on calendar, by creating event and sending an invite to the user",
//       parameters: {
//         type: "object",
//         properties: {
//           time: {
//             type: "string",
//             description: 'Selected time from available time slots (e.g., "1:00 PM")',
//           },
//           name: {
//             type: "string",
//             description: "Name of client or user who is trying to book the appointment",
//           },
//           email: {
//             type: "string",
//             description: "Email address of the client to send a calendar invite",
//           },
//         },
//         required: ["time", "name", "email"],
//       },
//       returns: {
//         type: "object",
//         properties: {
//           timeSlots: {
//             type: "string",
//             description: "Booking confirmation",
//           },
//         },
//       },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "transferCall",
//       say: "Sure, I’m transferring you to a human agent now.",
//       description: "Transfers the current call to a specified member of the organization via Twilio.",
//       parameters: {
//         type: "object",
//         properties: {
//           callSid: {
//             type: "string",
//             description: "The unique identifier of the call to be transferred",
//           },
//           username: {
//             type: "string",
//             description: "The name of the member to transfer the call to",
//           },
//         },
//         required: ["callSid", "username"],
//       },
//       returns: {
//         type: "string",
//         description: "Message indicating whether the call was transferred successfully or not",
//       },
//     },
//   },
// ];

// module.exports = tools;










const tools = [
  {
    type: "function",
    function: {
      name: "checkTimeSlots",
      say: "Let me find some slots for you!",
      description: "Checks for available time slots on GCal.",
      parameters: {
        type: "object",
        properties: {
          timeOfDay: {
            type: "string",
            description: "Time of day, either morning, evening, or a specific time (e.g., '10:00 AM')",
          },
          date: {
            type: "string",
            description: "Date for the appointment (e.g., 'today', 'tomorrow', 'Friday', '2025-07-17')",
          },
        },
        required: [],
      },
      returns: {
        type: "object",
        properties: {
          timeSlots: {
            type: "string",
            description: "The available time slots",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bookAppointment",
      say: "All right, let me book it for you.",
      description: "Books appointment at selected time and date on calendar, by creating event and sending an invite to the user",
      parameters: {
        type: "object",
        properties: {
          time: {
            type: "string",
            description: "Selected time from available time slots (e.g., '10:00 AM')",
          },
          name: {
            type: "string",
            description: "Name of client or user who is trying to book the appointment",
          },
          email: {
            type: "string",
            description: "Email address of the client to send a calendar invite",
          },
          date: {
            type: "string",
            description: "Date for the appointment (e.g., 'today', 'tomorrow', 'Friday', '2025-07-17')",
          },
        },
        required: ["time", "name", "email"],
      },
      returns: {
        type: "object",
        properties: {
          timeSlots: {
            type: "string",
            description: "Booking confirmation",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transferCall",
      say: "Sure, I’m transferring you to a human agent now.",
      description: "Transfers the current call to a specified member of the organization via Twilio.",
      parameters: {
        type: "object",
        properties: {
          callSid: {
            type: "string",
            description: "The unique identifier of the call to be transferred",
          },
          username: {
            type: "string",
            description: "The name of the member to transfer the call to",
          },
        },
        required: ["callSid", "username"],
      },
      returns: {
        type: "string",
        description: "Message indicating whether the call was transferred successfully or not",
      },
    },
  },
];

module.exports = tools;