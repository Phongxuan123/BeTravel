import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const required = [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD"
    ];

    const missing = required.filter(
        (key) => !process.env[key]
    );

    if (missing.length > 0) {
        throw new Error(
            `SMTP_CONFIG_MISSING:${missing.join(",")}`
        );
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure:
            process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    return transporter;
};

export const sendPasswordResetOtpEmail = async ({
    to,
    otp,
    expiresMinutes = 5,
    fullName = "Bạn"
}) => {
    if (!to) {
        throw new Error("EMAIL_RECIPIENT_MISSING");
    }

    if (!otp) {
        throw new Error("OTP_MISSING");
    }

    const mailer = getTransporter();

    await mailer.sendMail({
        from:
            `"BeTravel" <${process.env.SMTP_USER}>`,
        to,
        subject:
            "Mã OTP khôi phục mật khẩu - BeTravel",
        text: [
            `Xin chào ${fullName},`,
            "",
            "Bạn vừa yêu cầu khôi phục mật khẩu tài khoản BeTravel.",
            "",
            `Mã OTP của bạn là: ${otp}`,
            "",
            `Mã OTP có hiệu lực trong ${expiresMinutes} phút.`,
            "Vui lòng không cung cấp mã này cho bất kỳ ai.",
            "",
            "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.",
            "",
            "BeTravel"
        ].join("\n"),
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#243447">
                <h2>Khôi phục mật khẩu BeTravel</h2>
                <p>Xin chào <strong>${fullName}</strong>,</p>
                <p>Mã OTP của bạn là:</p>
                <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:12px 18px;background:#f3f6f9;display:inline-block;border-radius:8px">${otp}</div>
                <p>Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
            </div>
        `
    });
};
