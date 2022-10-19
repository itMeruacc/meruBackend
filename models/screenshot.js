import mongoose from "mongoose";

const screenshotSchema = new mongoose.Schema({
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
    required: true,
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Activity",
    required: true,
  },
  task: {
    type: String,
    default: "",
  },
  consumeTime: {
    type: Number,
    default: 0,
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
  activityAt: {
    type: String,
  },
  takenAt: {
    type: String,
  },
  performanceData: {
    type: Number,
    default: 0,
  },
  title: {
    type: String,
    default: "No title",
  },
});

const Screenshot = mongoose.model("Screenshot", screenshotSchema);

export default Screenshot;
