import mongoose from "mongoose";
import capitalize from "./../utils/capitalize.js";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, unique: "true", required: "true", set: capitalize },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    projectLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    employees: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    activities: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Activity", default: [] },
    ],
    budget: {
      timePeriod: { type: String, default: "Week" },
      time: { type: Number, default: 0 },
      money: {
        type: String,
        default: "0",
      },
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
