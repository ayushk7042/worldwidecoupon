const Contact = require("../models/Contact");

exports.createContact = async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAllContacts = async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });
  res.json(contacts);
};

exports.replyContact = async (req, res) => {
  const { message } = req.body;

  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: "Not found" });

  contact.reply = {
    message,
    repliedAt: new Date(),
    repliedBy: req.admin.id
  };
  contact.status = "replied";

  await contact.save();
  res.json(contact);
};

exports.deleteContact = async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};
