import Project from "../models/project.js";
const changeStream = Project.watch();

changeStream.on("change", async (next) => {
  //TODO: Budget change pr activity aggregate pipline se compare krna aur fir notif project leader ko
  //   console.log("id", next.documentKey);
  //   console.log(next.updateDescription.updatedFields);
  //   if (next.updateDescription.updatedFields.projectLeader) {
  //     //TODO: project leader ko bhejna
  //   }
  //   if (next.updateDescription.updatedFields.employees) {
  //     //TODO: employee change to sbko notif
  //   }
  //   if (next.updateDescription.updatedFields.activities) {
  //     // const doc = await Project.aggregate();
  //   }
});
