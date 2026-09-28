const express = require("express");
const router = express.Router();

const { registerAdmin, loginAdmin } = require("../controllers/auth.controller");


// ⚠️ Use only once (then comment/remove)
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

module.exports = router;
