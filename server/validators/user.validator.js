const { z } = require("zod");

const roles = ["admin", "staff", "student"];

const firstNameSchema = z
  .string()
  .trim()
  .min(2, "First name must be at least 2 characters long")
  .max(50, "First name cannot exceed 50 characters");

const lastNameSchema = z
  .string()
  .trim()
  .min(2, "Last name must be at least 2 characters long")
  .max(50, "Last name cannot exceed 50 characters");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(50, "Password cannot exceed 50 characters");

const roleSchema = z.enum(roles);

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

module.exports = {
  roles,
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  passwordSchema,
  roleSchema,
  objectIdSchema,
};
