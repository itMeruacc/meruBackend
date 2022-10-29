import mongoose from "mongoose";

const adminConfigSchema = new mongoose.Schema({
    autoPauseMinutes: { type: Number, default: 2 },
    screensConfig: {
        screenshotsPerHour: { type: Number, default: 6 },
        blurScreens: { type: Number, default: 0 }
    },
    disableOfflineTime: { type: Boolean, default: true },
    disableScreenshotNotification: { type: Boolean, default: false },
    disableActivityLevel: { type: Boolean, default: false },
    currency: { type: String, default: "Rs. " },
    weeklyLimit: { type: Number, default: 50 },
    weekStartDay: { type: Number, default: 1 },
    disableAppTracking: { type: Boolean, default: false },
    dateFormat: { type: mongoose.Schema.Types.Mixed, default: null }
});

const AdminConfig = mongoose.model("AdminConfig", adminConfigSchema);

export default AdminConfig;
