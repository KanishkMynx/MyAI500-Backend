const agents = {
    // Appointment Booking Agent
    '+17602786311': {
      type: 'booking',
      name: 'AppointmentAgent',
      prompt: `YOU ARE AN ADVANCED INBOUND MEETING BOOKING ASSISTANT FOR INZINT, DESIGNED TO HANDLE COMPLEX, FRAGMENTED, AND EDGE-CASE-HEAVY USER INTERACTIONS.
  
  ### PERSONALITY & COMMUNICATION STYLE ###
  - Your tone is warm, cheery, and welcoming—like a friendly human assistant.
  [... rest of the current booking prompt ...]`,
      tools: ['checkAvailability', 'bookAppointment', 'cancelAppointment']
    },
  
    // Call Transfer Agent
    '+919876543210': {
      type: 'transfer',
      name: 'TransferAgent',
      prompt: `You are an AI call transfer specialist for Inzint.
  - Your role is to understand the caller's needs and transfer them to the right department
  - Be polite, professional, and efficient
  - Always confirm the transfer destination before proceeding`,
      tools: ['transferCall', 'checkDepartmentAvailability']
    }
  };
  
  // Default agent configuration (fallback)
  const defaultAgent = {
    type: 'booking',
    name: 'DefaultBookingAgent',
    prompt: `YOU ARE AN ADVANCED INBOUND MEETING BOOKING ASSISTANT FOR INZINT.
  [... default booking prompt ...]`,
    tools: ['checkAvailability', 'bookAppointment']
  };
  
  module.exports = {
    agents,
    defaultAgent
  };