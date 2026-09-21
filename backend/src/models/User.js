import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 150
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },

        /*
         * Giữ required:false để các tài khoản cũ đang có phone:""
         * không bị lỗi khi đọc/cập nhật.
         * Đăng ký mới bắt buộc phone ở auth.validator.js.
         */
        phone: {
            type: String,
            required: false,
            default: "",
            trim: true,
            index: true
        },

        // Giữ nguyên field cũ để không phá dữ liệu/schema hiện có.
        // Mobile hiện tại không triển khai Google Login.
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            default: undefined
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
            select: false
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;
