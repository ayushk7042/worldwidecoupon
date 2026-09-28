import type { z } from "zod";
import { env } from "../config/env.js";
import { ContactModel } from "../models/Contact.js";
import { CouponModel } from "../models/Coupon.js";
import { sendMail } from "../services/mail.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, sendCreated, sendOk } from "../utils/response.js";
import { sanitizePlain } from "../utils/sanitize.js";
import type { contactBody, contactReplyBody } from "../validators/auth.validator.js";

/** POST /api/contact */
export const submit = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof contactBody>;

  // The honeypot is a hidden field; a human never types in it, a bot always does.
  if (body.website) {
    // Answer as if it worked — telling a bot it was caught only helps it adapt.
    return sendCreated(res, { ok: true }, "Thanks — we will get back to you");
  }

  const message = await ContactModel.create({
    name: body.name,
    email: body.email,
    topic: body.topic,
    subject: body.subject,
    message: body.message,
    coupon: body.coupon ?? null,
    store: body.store ?? null,
  });

  // A "this code didn't work" report is a vote against the coupon too.
  if (body.topic === "broken-coupon" && body.coupon) {
    void CouponModel.updateOne(
      { _id: body.coupon },
      { $inc: { failVotes: 1 } }
    ).catch(() => undefined);
  }

  sendCreated(res, { id: String(message._id) }, "Thanks — we will get back to you");
});

/** GET /api/contact — admin inbox. */
export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const status = req.query.status ? String(req.query.status) : undefined;
  const topic = req.query.topic ? String(req.query.topic) : undefined;

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (topic && topic !== "all") filter.topic = topic;

  const [items, total, unread] = await Promise.all([
    ContactModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("coupon", "title slug")
      .populate("store", "name slug")
      .lean(),
    ContactModel.countDocuments(filter),
    ContactModel.countDocuments({ status: "new" }),
  ]);

  sendOk(res, items, {
    pagination: buildPagination(page, limit, total, items.length),
    meta: { unread },
  });
});

/** GET /api/contact/:id */
export const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const message = await ContactModel.findById(id)
    .populate("coupon", "title slug code")
    .populate("store", "name slug")
    .lean();

  if (!message) throw ApiError.notFound("Message not found");

  sendOk(res, message);
});

/**
 * POST /api/contact/:id/reply
 *
 * The reply is saved first and mailed second: a dropped SMTP connection must
 * not lose what the operator typed.
 */
export const reply = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { message } = req.body as z.infer<typeof contactReplyBody>;

  const contact = await ContactModel.findById(id);
  if (!contact) throw ApiError.notFound("Message not found");

  contact.reply = {
    message,
    repliedAt: new Date(),
    repliedBy: req.admin?._id,
  };
  contact.status = "replied";
  await contact.save();

  const result = await sendMail({
    to: contact.email,
    subject: `Re: ${contact.subject || "Your message to " + env.SITE_NAME}`,
    html: `<p>Hi ${sanitizePlain(contact.name)},</p><p>${sanitizePlain(message).replace(/\n/g, "<br>")}</p><p>— ${env.SITE_NAME}</p>`,
    text: message,
  });

  sendOk(res, { saved: true, emailed: result.sent }, {
    message: result.sent
      ? "Reply sent"
      : `Reply saved, but the email could not be sent (${result.reason})`,
  });
});

/** PATCH /api/contact/:id/status */
export const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const status = String((req.body as { status?: string }).status ?? "");

  if (!["new", "replied", "closed", "spam"].includes(status)) {
    throw ApiError.badRequest("Unknown status");
  }

  const message = await ContactModel.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  ).lean();

  if (!message) throw ApiError.notFound("Message not found");

  sendOk(res, message, { message: `Marked as ${status}` });
});

/** DELETE /api/contact/:id */
export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const message = await ContactModel.findByIdAndDelete(id);
  if (!message) throw ApiError.notFound("Message not found");

  sendOk(res, { id }, { message: "Message deleted" });
});
