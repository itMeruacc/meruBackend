import mongoose, { SchemaTypes } from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    avatar: { type: String, default: null },
    type: { type: String, required: true },
    isUnRead: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
