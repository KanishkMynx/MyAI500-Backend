// // import agentModel

// const { agentModel } = require("../models/agent");

// // get agent
// const getAgent = async (req, res) => {
//   try {
//     const agent = await agentModel.find();
//     res.status(200).json(agent);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// // create agent
// const createAgent = async (req, res) => {
//   const agent = new agentModel(req.body);
//   try {
//     const newAgent = await agent.save();
//     res.status(201).json(newAgent);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
// // update agent
// const updateAgent = async (req, res) => {
//   const agent = await agentModel.findById(req.params.id);
//   if (!agent) {
//     return res.status(404).json({ message: "Agent not found" });
//   }
//   try {
//     const updatedAgent = await agentModel.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     res.status(200).json(updatedAgent);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
// // delete agent
// const deleteAgent = async (req, res) => {
//   const agent = await agentModel.findById(req.params.id);
//   if (!agent) {
//     return res.status(404).json({ message: "Agent not found" });
//   }
//   try {
//     await agentModel.findByIdAndDelete(req.params.id);
//     res.status(200).json({ message: "Agent deleted" });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// //export agent controller
// module.exports = {
//   getAgent,
//   createAgent,
//   updateAgent,
//   deleteAgent,
// };

const { agentModel } = require("../models/agent");

const getAgent = async (req, res) => {
  try {
    const agents = await agentModel.find();
    res.status(200).json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAgent = async (req, res) => {
  const agent = new agentModel(req.body);
  try {
    const newAgent = await agent.save();
    res.status(201).json(newAgent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateAgent = async (req, res) => {
  try {
    const agent = await agentModel.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }
    const updatedAgent = await agentModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedAgent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const agent = await agentModel.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }
    await agentModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Agent deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
};