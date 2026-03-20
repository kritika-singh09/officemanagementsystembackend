const nodemailer = require("nodemailer");

/**
 * Utility to send emails via Gmail SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @param {string} senderName - Name to display as sender
 */
const sendEmail = async ({ to, subject, text, html, senderName }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS in .env file");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: senderName ? `"${senderName}" <${process.env.EMAIL_USER}>` : process.env.EMAIL_USER,
    to,
    subject,
    text,
    html: html || `<div>${text.replace(/\n/g, '<br>')}</div>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Nodemailer Error Details:", error);
    throw error;
  }
};

module.exports = sendEmail;
