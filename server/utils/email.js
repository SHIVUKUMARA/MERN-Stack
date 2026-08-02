const nodemailer = require("nodemailer");
const config = require("../config/env");
const ApiError = require("./ApiError");

const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: Number(config.emailPort),
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const info = await transporter.sendMail({
      from: config.emailFrom,
      to,
      subject,
      html,
      text,
      attachments,
    });
    return info;
  } catch (error) {
    console.error("Mail Error:", error);

    throw new ApiError(500, "Failed to send email");
  }
};

module.exports = { sendEmail };
