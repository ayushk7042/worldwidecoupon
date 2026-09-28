import mongoose, { type Types } from "mongoose";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * Deliberately returns a plain boolean, not a `value is string` predicate.
 *
 * As a type guard it narrows the *false* branch of `isObjectId(slug) ? … : …`
 * to `never` whenever the input is already known to be a string, which is
 * exactly the id-or-slug pattern every read route uses.
 */
export const isObjectId = (value: unknown): boolean =>
  OBJECT_ID.test(String(value ?? ""));

/** Accepts an id, a populated document or a raw ObjectId and returns the id. */
export const idOf = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === "object") {
    const candidate = (value as { _id?: unknown })._id ?? value;
    const text = String(candidate);
    return isObjectId(text) ? text : null;
  }

  const text = String(value);
  return isObjectId(text) ? text : null;
};

export const idsOf = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : [value];
  return list.map(idOf).filter((id): id is string => id !== null);
};

export const toObjectId = (value: unknown): Types.ObjectId | null => {
  const id = idOf(value);
  return id ? new mongoose.Types.ObjectId(id) : null;
};

export const sameId = (a: unknown, b: unknown): boolean => {
  const left = idOf(a);
  const right = idOf(b);
  return left !== null && left === right;
};
