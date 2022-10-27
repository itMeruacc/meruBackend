import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    default: null,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    default: null,
  },
  activityOn: {
    type: Date,
    required: true,
  },
  task: {
    type: String,
    default: "",
  },
  startTime: {
    type: Number,
  },
  endTime: {
    type: Number,
  },
  consumeTime: {
    type: Number,
    default: 0,
  },
  isAccepted: {
    type: Boolean,
    default: true,
  },
  isInternal: { type: Boolean, default: false },
  performanceData: { type: Number, default: 0 },
  screenshots: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screenshot",
    },
  ],
});

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
