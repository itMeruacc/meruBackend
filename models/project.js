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
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Activity" }],
    budget: {
      time: { type: String, default: "0W" },
      money: {
        type: String,
        default: "0$",
      },
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
