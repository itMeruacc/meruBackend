import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Activity" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);

export default Client;
