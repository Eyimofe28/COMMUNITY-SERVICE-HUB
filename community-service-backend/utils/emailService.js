const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendVerificationEmail = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your MVSU Verification Code",
        text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
};
