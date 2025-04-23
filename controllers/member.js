const { memberModel } = require("../models/member");

const getMembers = async (req, res) => {
  try {
    const members = await memberModel.find();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createMember = async (req, res) => {
  const member = new memberModel(req.body);
  try {
    const newMember = await member.save();
    res.status(201).json(newMember);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateMember = async (req, res) => {
  try {
    const member = await memberModel.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    const updatedMember = await memberModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedMember);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteMember = async (req, res) => {
  try {
    const member = await memberModel.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    await memberModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Member deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
};