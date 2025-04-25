// require('dotenv').config();

// const transferCall = async function (call) {

//   console.log('Transferring call', call.callSid);
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;
//   const client = require('twilio')(accountSid, authToken);

//   return await client.calls(call.callSid)
//     .update({twiml: `<Response><Dial>${process.env.TRANSFER_NUMBER}</Dial></Response>`})
//     .then(() => {
//       return 'The call was transferred successfully, say goodbye to the customer.';
//     })
//     .catch(() => {
//       return 'The call was not transferred successfully, advise customer to call back later.';
//     });
// };

// module.exports = transferCall;



// require("dotenv").config();
// const { memberModel } = require("../models/member");

// const transferCall = async function (args) {
//   console.log("Transferring call", args.callSid, "to", args.username);

//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;
//   const client = require("twilio")(accountSid, authToken);

//   try {
//     // Case-insensitive search for the member by name
//     const member = await memberModel.findOne({
//       name: { $regex: `^${args.username}$`, $options: "i" },
//     });

//     if (!member) {
//       return `No member is present in the organization with the name "${args.username}". Please check the spelling and try again.`;
//     }

//     // Update the call with the member's phone number
//     await client.calls(args.callSid).update({
//       twiml: `<Response><Dial>${member.phoneNumber}</Dial></Response>`,
//     });

//     return `The call was transferred successfully to ${member.name}. Say goodbye to the customer.`;
//   } catch (error) {
//     console.error("Error transferring call:", error);
//     return "The call was not transferred successfully. Please advise the customer to call back later.";
//   }
// };

// module.exports = transferCall;



// require("dotenv").config();
// const { memberModel } = require("../models/member");

// const transferCall = async function (args) {
//   console.log(`Transferring call ${args.callSid} to ${args.username}`);

//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;
//   const client = require("twilio")(accountSid, authToken);

//   try {
//     // Validate inputs
//     if (!args.callSid || !args.username) {
//       throw new Error(`Missing required parameters: callSid=${args.callSid}, username=${args.username}`);
//     }

//     // Case-insensitive search for the member by name
//     const member = await memberModel.findOne({
//       name: { $regex: `^${args.username}$`, $options: "i" },
//     });

//     if (!member) {
//       return `No member is present in the organization with the name "${args.username}". Please check the spelling and try again.`;
//     }

//     // Update the call with the member's phone number
//     console.log(`Attempting to transfer call ${args.callSid} to ${member.phoneNumber}`);
//     await client.calls(args.callSid).update({
//       twiml: `<Response><Dial>${member.phoneNumber}</Dial></Response>`,
//     });

//     return `The call was transferred successfully to ${member.name}. Say goodbye to the customer.`;
//   } catch (error) {
//     console.error(`Error transferring call ${args.callSid}: ${error.message}`.red);
//     return `The call was not transferred successfully. Please advise the customer to call back later.`;
//   }
// };

// module.exports = transferCall;






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