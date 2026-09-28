const express = require("express");
const router = express.Router();

const {
  createContact,
  getAllContacts,
  replyContact,
  deleteContact
} = require("../controllers/contact.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

// User
router.post("/", createContact);

// Admin
router.get(
  "/",
  authMiddleware,
  adminMiddleware(),
  getAllContacts
);

router.put(
  "/reply/:id",
  authMiddleware,
  adminMiddleware(),
  replyContact
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware("canDelete"),
  deleteContact
);

module.exports = router;
