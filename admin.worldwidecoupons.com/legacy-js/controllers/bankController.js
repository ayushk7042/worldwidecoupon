import Bank from "../models/Bank.js";
import Card from "../models/Card.js";


export const getBanks = async (req, res) => {
  const banks = await Bank.find();
  res.json(banks);
};

export const createBank = async (req, res) => {
  const { name, website } = req.body;
  const logo = req.file ? req.file.path : null;
  const bank = await Bank.create({ name, logo, website });
  res.status(201).json(bank);
};


export const getBankById = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: "Bank not found" });

    // Optionally include all cards for this bank
    const cards = await Card.find({ bank: bank.name });
    res.json({ ...bank._doc, cards });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bank" });
  }
};