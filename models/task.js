import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },

  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subTasks: [subtaskSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
