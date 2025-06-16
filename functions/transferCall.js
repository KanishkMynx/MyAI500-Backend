require("dotenv").config();
const { memberModel } = require("../models/member");

const transferCall = async function (args) {
  console.log(`Transferring call with args: ${JSON.stringify(args)}`.cyan);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Validate environment variables
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing in .env");
  }

  // Validate inputs
  if (!args.callSid || !args.username) {
    throw new Error(`Missing required parameters: callSid=${args.callSid}, username=${args.username}`);
  }

  const client = require("twilio")(accountSid, authToken);

  try {
    // Case-insensitive search for the member by name
    const member = await memberModel.findOne({
      name: { $regex: `^${args.username}$`, $options: "i" },
    });

    if (!member) {
      return `No member found with the name "${args.username}". Please check the spelling and try again.`;
    }

    console.log(`Attempting to transfer call ${args.callSid} to ${member.phoneNumber}`.cyan);
    await client.calls(args.callSid).update({
      twiml: `<Response><Dial>${member.phoneNumber}</Dial></Response>`,
    });

    return `Call transferred successfully to ${member.name}. Goodbye!`;
  } catch (error) {
    console.error(`Error transferring call ${args.callSid}: ${error.message}`.red);
    return `Transfer failed. Please advise the customer to call back later.`;
  }
};

module.exports = transferCall;