import cron from "node-cron";
import schedule from "node-schedule";
import Activity from "../models/activity.js";
import Reports from "../models/reports.js";
import asyncHandler from "express-async-handler";
import User from "../models/user.js";
import mongoose from "mongoose";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import puppeteer from "puppeteer";
import sgMail from "@sendgrid/mail";

const dayNames = [
  0,
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// edit generate report function
// edit save report function
// fetch is called from the website so no need to edit the fetch option
// a funtion to generate pdf from url(puppeteer)
// a function to mail
// delete report function
// a function to combine these all

schedule.scheduleJob(`*/30 * * * * *`, async () => {
  // TODO: looking for reports every minute now, we only need to look once an hour to avoid multiple schedules.
  // match by schedule true
  // match by todays day, date.
  const currWeekDay = dayjs().day();
  const currHour = new Date().getHours();
  const currMonthDay = new Date().getDate();
  let schedules = await Reports.aggregate([
    {
      $match: {
        $and: [{ cronString: { $exists: true } }, { schedule: true }],
      },
    },
    // {
    //   $lookup: {
    //     from: "users",
    //     localField: "user",
    //     foreignField: "_id",
    //     as: "user",
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$user",
    //     includeArrayIndex: "string",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
  ]);

  // TODO: turn on filter
  // filter out schedules based on current hour to send emails
  // schedules = schedules.filter((schedule) => {
  //   const splitCron = schedule.cronString.split(" ");
  //   const hour = splitCron[1];
  //   const monthDay = splitCron[2];
  //   const weekDay = splitCron[4];

  //   if (splitCron[4] === "*" && splitCron[2] === "*") {
  //     // checking only for Daily
  //     return hour === currHour;
  //   }
  //   if (splitCron[4] === "*" && splitCron[2] !== "*") {
  //     // monthly
  //     return hour === currHour && monthDay === currMonthDay;
  //   }
  //   if (splitCron[4] !== "*" && splitCron[2] === "*") {
  //     // weekly
  //     return hour === currHour && weekDay === currWeekDay;
  //   }
  // });

  schedules.map(async (sched, i) => {
    try {
      if (i != 0) return;

      // generate reports
      let reports = await generateReport({
        body: { ...sched.options },
      });

      // TODO: check save reports once

      // save reports
      let saved = await saveReports({
        body: { ...sched, reports, userId: sched.user._id },
      });

      // TODO: setup download pdf
      // generate pdf
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();
      await page.goto(`http://localhost:3000/downloadReportPdf/${saved.url}`, {
        waitUntil: "networkidle0",
      });

      // pausing for 2 secs for full rendering of the react components
      new Promise((resolve) => setTimeout(resolve, 5000)).then(async () => {
        await page.setViewport({ width: 1680, height: 1050 });
        let uniquePdf = uuidv4();
        await page.pdf({
          path: `./pdf/${uniquePdf}.pdf`,
          format: "A4",
        });

        // mail the pdf
        browser.close().then(mail(uniquePdf, sched.scheduledMail));
        // mail("tempPdf", "it.meru02@gmail.com");
        console.log("sent");

        // TODO: check delete function
        // delete the saved report and pdf
        deleteReports(saved.url);
        deletePdf(uniquePdf);
      });
    } catch (error) {
      console.log(error);
    }
  });
});

const generateReport = asyncHandler(async (req, res) => {
  try {
    let { clientIds, projectIds, userIds, dateOne, dateTwo, groupBy } =
      req.body;

    // simply string ids to mongo ids
    if (projectIds) {
      projectIds = projectIds.map((id) => {
        return mongoose.Types.ObjectId(id._id);
      });
    }
    if (userIds) {
      userIds = userIds.map((id) => {
        return mongoose.Types.ObjectId(id._id);
      });
    }
    if (clientIds) {
      clientIds = clientIds.map((id) => {
        return mongoose.Types.ObjectId(id._id);
      });
    }
    // js dates, use new Date() in mongo to convert it to mongo dates
    if (!dateOne) dateOne = new Date(1970);
    if (!dateTwo) dateTwo = new Date();

    // To calculate the time difference of two dates
    const Difference_In_Time =
      new Date(dateTwo).getTime() - new Date(dateOne).getTime();

    // To calculate the no. of days between two dates
    const diffDays = Difference_In_Time / (1000 * 3600 * 24);
    let datePipelineId;
    // needed coz bar graph in frontend cant take object for x axis
    let datePipelineIdProject = {
      $concat: [{ $toString: "$_id.month" }, "/", { $toString: "$_id.year" }],
    };
    if (diffDays > 31 && diffDays <= 120) {
      // weekly
      datePipelineId = { $week: "$activityOn" };
      datePipelineIdProject = 1;
    } else if (diffDays > 120 && diffDays <= 365) {
      // monthly
      datePipelineId = {
        month: { $month: "$activityOn" },
        year: { $year: "$activityOn" },
      };
    } else if (diffDays > 365) {
      // yearly
      datePipelineId = {
        month: "month",
        year: { $year: "$activityOn" },
      };
    } else {
      // daily
      datePipelineId = {
        day: { $dayOfMonth: "$activityOn" },
        month: { $month: "$activityOn" },
        year: { $year: "$activityOn" },
      };
      datePipelineIdProject = {
        $concat: [
          { $toString: "$_id.day" },
          "/",
          { $toString: "$_id.month" },
          "/",
          { $toString: "$_id.year" },
        ],
      };
    }

    const activity = await Activity.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              {
                $cond: [
                  projectIds,
                  {
                    $in: ["$project", projectIds],
                  },
                  { $not: { $in: ["$project", []] } },
                ],
              },
              {
                $cond: [
                  clientIds,
                  {
                    $in: ["$client", clientIds],
                  },
                  { $not: { $in: ["$client", []] } },
                ],
              },
              {
                $cond: [
                  userIds,
                  {
                    $in: ["$employee", userIds],
                  },
                  { $not: { $in: ["$employee", []] } },
                ],
              },
              {
                $and: [
                  {
                    $gte: ["$activityOn", new Date(dateOne.toString())],
                  },
                  {
                    $lte: ["$activityOn", new Date(dateTwo.toString())],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          week: {
            $week: "$activityOn",
          },
          month: {
            $month: "$activityOn",
          },
          year: {
            $year: "$activityOn",
          },
          consumeTime: {
            $subtract: ["$endTime", "$startTime"],
          },
        },
      },
      {
        $facet: {
          byProjects: [
            {
              $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
              },
            },
            {
              $unwind: {
                path: "$project",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: {
                  name: "$project.name",
                  _id: "$project._id",
                },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                actCount: {
                  $sum: 1,
                },
                totalHours: {
                  $sum: "$consumeTime",
                },
                avgPerformanceData: {
                  $avg: "$performanceData",
                },
              },
            },
          ],
          byClients: [
            {
              $lookup: {
                from: "clients",
                localField: "client",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $unwind: {
                path: "$client",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: {
                  firstName: "$client.name",
                  _id: "$client._id",
                },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                actCount: {
                  $sum: 1,
                },
                totalHours: {
                  $sum: "$consumeTime",
                },
                avgPerformanceData: {
                  $avg: "$performanceData",
                },
              },
            },
          ],
          byEmployees: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: {
                  firstName: "$employee.firstName",
                  employee: "$employee._id",
                  lastName: "$employee.lastName",
                },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                actCount: {
                  $sum: 1,
                },
                totalHours: {
                  $sum: "$consumeTime",
                },
                avgPerformanceData: {
                  $avg: "$performanceData",
                },
              },
            },
          ],
          byScreenshots: [
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },
            {
              $unwind: {
                path: "$screenshots",
              },
            },
            {
              $group: {
                _id: "$screenshots.title",
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                actCount: {
                  $sum: 1,
                },
                totalHours: {
                  $sum: "$consumeTime",
                },
                avgPerformanceData: {
                  $avg: "$performanceData",
                },
              },
            },
          ],
          byEP: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $unwind: {
                path: "$screenshots",
              },
            },
            {
              $group: {
                _id: {
                  userId: "$employee._id",
                  firstName: "$employee.firstName",
                  lastName: "$employee.lastName",
                  project: "$project",
                  client: "$client",
                },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                payRate: { $first: "$employee.payRate" },
                actCount: { $sum: 1 },
                totalHours: { $sum: "$consumeTime" },
                avgPerformanceData: { $avg: "$performanceData" },
                screenshots: { $push: "$screenshots" },
              },
            },
            {
              $lookup: {
                from: "projects",
                localField: "_id.project",
                foreignField: "_id",
                as: "project",
              },
            },
            {
              $lookup: {
                from: "clients",
                localField: "_id.client",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },
            {
              $unwind: {
                path: "$client",
              },
            },
            {
              $unwind: {
                path: "$project",
              },
            },

            {
              $group: {
                _id: {
                  userId: "$_id.userId",
                  firstName: "$_id.firstName",
                  lastName: "$_id.lastName",
                },
                payRate: { $first: "$payRate" },
                projects: {
                  $push: {
                    internal: "$internal",
                    external: "$external",
                    client: "$client.name",
                    project: "$project.name",
                    count: "$actCount",
                    totalHours: "$totalHours",
                    avgPerformanceData: "$avgPerformanceData",
                    screenshots: "$screenshots",
                  },
                },
              },
            },
          ],
          byCE: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $unwind: {
                path: "$screenshots",
              },
            },
            {
              $group: {
                _id: {
                  userId: "$employee._id",
                  firstName: "$employee.firstName",
                  lastName: "$employee.lastName",
                  client: "$client",
                },
                screenshots: { $push: "$screenshots" },
                payRate: { $first: "$employee.payRate" },
                actCount: { $sum: 1 },
                totalHours: { $sum: "$consumeTime" },
                avgPerformanceData: { $avg: "$performanceData" },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
              },
            },
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },
            {
              $group: {
                _id: "$_id.client",

                users: {
                  $push: {
                    internal: "$internal",
                    external: "$external",
                    screenshots: "$screenshots",
                    payRate: "$payRate",
                    user: "$_id.userId",
                    firstName: "$_id.firstName",
                    lastName: "$_id.lastName",
                    count: "$actCount",
                    totalHours: "$totalHours",
                    avgPerformanceData: "$avgPerformanceData",
                  },
                },
              },
            },
            {
              $lookup: {
                from: "clients",
                localField: "_id",
                foreignField: "_id",
                as: "client",
              },
            },
          ],
          byDates: [
            {
              $group: {
                _id: datePipelineId,
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                actCount: { $sum: 1 },
                totalHours: { $sum: "$consumeTime" },
                avgPerformanceData: { $avg: "$performanceData" },
              },
            },
            {
              $project: {
                _id: 1,
                actCount: 1,
                internal: 1,
                external: 1,
                totalHours: 1,
                avgPerformanceData: 1,
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: datePipelineIdProject,
                actCount: 1,
                internal: 1,
                external: 1,
                totalHours: 1,
                avgPerformanceData: 1,
              },
            },
          ],
          byD: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $lookup: {
                from: "clients",
                localField: "client",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $unwind: {
                path: "$client",
              },
            },
            {
              $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
              },
            },
            {
              $unwind: {
                path: "$project",
              },
            },
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },
            {
              $project: {
                _id: 1,
                startTime: 1,
                endTime: 1,
                consumeTime: 1,
                performanceData: 1,
                activityOn: 1,
                screenshots: 1,
                "project.name": 1,
                "client.name": 1,
                "employee.firstName": 1,
                "employee.lastName": 1,
                "employee.payRate": 1,
              },
            },
          ],
          total: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $group: {
                _id: null,
                actCount: { $sum: 1 },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                totalHours: { $sum: "$consumeTime" },
                avgPayRate: { $avg: "$employee.payRate" },
                avgPerformanceData: { $avg: "$performanceData" },
              },
            },
          ],
          byA: [
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },

            {
              $unwind: {
                path: "$screenshots",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $group: {
                _id: {
                  ss: "$screenshots.title",
                  employee: "$employee._id",
                  firstName: "$employee.firstName",
                  lastName: "$employee.lastName",
                },
                actCount: { $sum: 1 },
                totalHours: { $sum: "$consumeTime" },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                avgPerformanceData: { $avg: "$performanceData" },
                screenshots: { $push: "$screenshots" },
              },
            },
            {
              $group: {
                _id: {
                  employee: "$_id.employee",
                  firstName: "$_id.firstName",
                  lastName: "$_id.lastName",
                },
                actCount: { $sum: 1 },
                screenshots: {
                  $push: {
                    screenshots: "$screenshots",
                    internal: "$internal",
                    external: "$external",
                    title: "$_id.ss",
                    actCount: { $sum: 1 },
                    totalHours: { $sum: "$consumeTime" },
                    avgPerformanceData: { $avg: "$avgPerformanceData" },
                  },
                },
              },
            },
          ],
          byPE: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
              },
            },
            {
              $unwind: {
                path: "$screenshots",
              },
            },
            {
              $group: {
                _id: {
                  userId: "$employee._id",
                  firstName: "$employee.firstName",
                  lastName: "$employee.lastName",
                  project: "$project",
                  client: "$client",
                },
                internal: {
                  $sum: { $cond: ["$isInternal", "$consumeTime", 0] },
                },
                external: {
                  $sum: { $cond: ["$isInternal", 0, "$consumeTime"] },
                },
                screenshots: { $push: "$screenshots" },
                payRate: { $first: "$employee.payRate" },
                actCount: { $sum: 1 },
                totalHours: { $sum: "$consumeTime" },
                avgPerformanceData: { $avg: "$performanceData" },
              },
            },

            {
              $group: {
                _id: { project: "$_id.project", client: "$_id.client" },
                users: {
                  $push: {
                    payRate: "$payRate",
                    screenshots: "$screenshots",
                    internal: "$internal",
                    external: "$external",
                    user: "$_id.userId",
                    firstName: "$_id.firstName",
                    lastName: "$_id.lastName",
                    count: "$actCount",
                    totalHours: "$totalHours",
                    avgPerformanceData: "$avgPerformanceData",
                  },
                },
              },
            },

            {
              $lookup: {
                from: "projects",
                localField: "_id.project",
                foreignField: "_id",
                as: "project",
              },
            },
            {
              $lookup: {
                from: "clients",
                localField: "_id.client",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $lookup: {
                from: "screenshots",
                localField: "screenshots",
                foreignField: "_id",
                as: "screenshots",
              },
            },
          ],
        },
      },
    ]);

    return activity;
  } catch (error) {
    throw new Error(error);
  }
});
const saveReports = asyncHandler(async (req, res) => {
  try {
    let {
      url,
      userId,
      cronString,
      scheduleEmail,
      schedule,
      scheduleType,
      share,
      reports,
      name,
      includeSS,
      includeAL,
      includePR,
      includeApps,
      options,
    } = req.body;

    // very inefficient coz not proper default values in frontend
    if (!scheduleType[1]) {
      if (scheduleType[0] === "Weekly") {
        scheduleType[1] = "Monday";
      }
      if (scheduleType[0] === "Monthly") {
        scheduleType[1] = 1;
      }
    }

    // change url for a new url to be generated
    url = uuidv4();
    reports = reports;

    if (!options.dateTwo) {
      options.dateTwo = dayjs().format("DD/MM/YYYY");
    }

    let { firstName, lastName } = await User.findById(userId);
    let fileName = userId + "-" + new Date().getTime();

    // STEP : Writing to a file
    fs.writeFileSync(
      `./saved reports/${fileName}.json`,
      JSON.stringify(reports)
    );

    // make a new document for reports schema
    const saved = await Reports.create({
      schedule: false,
      share: true,
      options,
      user: userId,
      url,
      includeSS,
      includeAL,
      includePR,
      includeApps,
      name: name === "" ? `${firstName} ${lastName}` : name,
      fileName,
    });

    return saved;
  } catch (error) {
    throw new Error(error);
  }
});

const deleteReports = asyncHandler(async (url, res) => {
  try {
    const report = await Reports.find({ url: url });

    fs.stat(
      `./saved reports/${report[0].fileName}.json`,
      function (err, stats) {
        if (err) {
          return console.error(err);
        }

        // Delete a file
        let filename = `./saved reports/${report[0].fileName}.json`;
        let tempFile = fs.openSync(filename, "r");
        // try commenting out the following line to see the different behavior
        fs.closeSync(tempFile);
        fs.unlinkSync(filename);
      }
    );

    // Delete from database
    if (report) {
      // _id = report[0]._id;
      await Reports.deleteOne({ _id: report[0]._id });
    }
  } catch (error) {
    throw new Error(error);
  }
});

const deletePdf = (name) => {
  fs.stat(`./pdf/${name}.pdf`, function (err, stats) {
    if (err) {
      return console.error(err);
    }

    // Delete a file
    let filename = `./pdf/${name}.pdf`;
    let tempFile = fs.openSync(filename, "r");
    // try commenting out the following line to see the different behavior
    fs.closeSync(tempFile);
    fs.unlinkSync(filename);
  });
};

const mail = (uniquePdf, email) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  let pathToAttachment = `./pdf/${uniquePdf}.pdf`;
  let attachment = fs.readFileSync(pathToAttachment).toString("base64");

  const msg = {
    to: "it.meru02@gmail.com",
    from: "it.meru02@gmail.com",
    subject: "Sending with SendGrid is Fun",
    text: "and easy to do anywhere, even with Node.js",
    attachments: [
      {
        content: attachment,
        filename: "attachment.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  };

  sgMail.send(msg).catch((err) => {
    console.log(err);
  });
};

// async function test() {
//   const schedules = await Reports.aggregate([
//     {
//       $match: {
//         url: "71b44beb-a189-42ce-b904-5cffeabbc797",
//       },
//     },
//     // {
//     //   $lookup: {
//     //     from: "users",
//     //     localField: "user",
//     //     foreignField: "_id",
//     //     as: "user",
//     //   },
//     // },
//     {
//       $unwind: {
//         path: "$user",
//         includeArrayIndex: "string",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $limit: 1,
//     },
//   ]);
//   schedules.map(async (schedule) => {
//     //   generate report from the scheduled report to save the json file
//     let reports = await generateReport({ body: { ...schedule.options } });

//     //   save the report with appropriate url
//     let saved = await saveReports({
//       body: { ...schedule, reports, userId: schedule.user },
//     });
//     console.log(saved.url);
//     // generate pdf
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.goto(`http://localhost:3000/downloadReportPdf/${saved.url}`, {
//       waitUntil: "networkidle2",
//     });
//     await page.setViewport({ width: 1680, height: 1050 });
//     let uniquePdf = uuidv4();
//     await page.pdf({
//       path: `./pdf/${uniquePdf}.pdf`,
//       format: "A4",
//     });
//     // mail the pdf
//     browser.close().then(mail(uniquePdf));

//     // delete the saved report and pdf
//     deleteReports(saved.url);
//     deletePdf(uniquePdf);
//   });
// }
// // test();
