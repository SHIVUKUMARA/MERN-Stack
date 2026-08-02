const { sendEmail } = require("./utils/email");

(async () => {
  await sendEmail({
    to: "test@example.com",
    subject: "Mailtrap Test",
    html: "<h1>Hello from MERN Backend</h1>",
    text: "Hello from MERN Backend",
  });

  console.log("Email sent successfully");
})();
