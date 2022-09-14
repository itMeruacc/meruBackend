import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
// Models
import Client from "../models/client.js";
import Project from "../models/project.js";
import User from "../models/user.js";
// Utils
import { AccessControl } from "accesscontrol";
import { grantsObject } from "../utils/permissions.js";
import capitalize from "../utils/capitalize.js";
import { uniqueFinder } from "../utils/uniqueEntry.js";

const ac = new AccessControl(grantsObject);

/* -------------------------------------------------------------------------- */

// @desc    Create a new client
// @route   POST /client
// @access  Private
const createClient = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    // check for unique entry
    const uni = await uniqueFinder(name, Client);
    if (!uni) {
      throw new Error(`Client already exists.`);
    }
    // Create client with given parameters
    const client = new Client({ name, createdBy: user._id, manager: null });
    if (!client) throw new Error("Error creating a new client");

    res.status(201).json({
      status: "Successfully Created Client",
      data: client,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get client
// @route   GET /client/
// @access  Private
const getClients = asyncHandler(async (req, res) => {
  try {
    // const user = req.user;
    // // let client;
    // // if (user.role !== "admin") {
    // //   client = await Client.find({ manager: req.user._id }).populate([
    // //     {
    // //       path: "projects",
    // //       match: {
    // //         _id: {
    // //           $in: user.projects,
    // //         },
    // //       },
    // //       populate: [
    // //         {
    // //           path: "employees",
    // //           select: [
    // //             "firstName",
    // //             "lastName",
    // //             "days",
    // //             "email",
    // //             "projects",
    // //             "role",
    // //           ],
    // //           populate: {
    // //             path: "projects",
    // //             model: "Project",
    // //             select: ["name", "budgetTime"],
    // //           },
    // //         },
    // //         {
    // //           path: "projectLeader",
    // //           select: ["firstName", "lastName", "email"],
    // //         },
    // //         { path: "createdBy", select: ["firstName", "lastName"] },
    // //       ],
    // //     },
    // //     { path: "createdBy", select: ["firstName", "lastName"] },
    // //   ]);
    // // }

    // // if (user.role === "projectLeader") {
    // //   let clientsList = await Project.aggregate([
    // //     {
    // //       $match: {
    // //         projectLeader: req.user._id,
    // //       },
    // //     },
    // //     {
    // //       $group: {
    // //         _id: null,
    // //         clients: {
    // //           $addToSet: "$client",
    // //         },
    // //       },
    // //     },
    // //   ]);
    // //   let clientsArr = clientsList[0] ? clientsList[0].clients : [];
    // //   client = await Client.find({
    // //     _id: { $in: clientsArr },
    // //   }).populate([
    // //     {
    // //       path: "projects",
    // //       match: { projectLeader: user._id },
    // //       populate: [
    // //         {
    // //           path: "employees",
    // //           select: ["firstName", "lastName", "email", "projects", "role"],
    // //           populate: {
    // //             path: "projects",
    // //             model: "Project",
    // //             select: ["name", "budgetTime"],
    // //           },
    // //         },
    // //         {
    // //           path: "projectLeader",
    // //           select: ["firstName", "lastName", "email"],
    // //         },
    // //         { path: "createdBy", select: ["firstName", "lastName"] },
    // //       ],
    // //     },
    // //     { path: "createdBy", select: ["firstName", "lastName"] },
    // //   ]);
    // // } else {
    // //   client = await Client.find({ manager: req.user._id }).populate([
    // //     {
    // //       path: "projects",
    // //       populate: [
    // //         {
    // //           path: "employees",
    // //           select: [
    // //             "firstName",
    // //             "lastName",
    // //             "days",
    // //             "email",
    // //             "projects",
    // //             "role",
    // //           ],
    // //           populate: {
    // //             path: "projects",
    // //             model: "Project",
    // //             select: ["name", "budgetTime"],
    // //           },
    // //         },
    // //         {
    // //           path: "projectLeader",
    // //           select: ["firstName", "lastName", "email"],
    // //         },
    // //         { path: "createdBy", select: ["firstName", "lastName"] },
    // //       ],
    // //     },
    // //     { path: "createdBy", select: ["firstName", "lastName"] },
    // //   ]);
    // // }

    const clients = await Client.aggregate([
      {
        $match: {},
      },
      {
        $lookup: {
          from: "projects",
          localField: "projects",
          foreignField: "_id",
          as: "projects",
        },
      },
      {
        $project: {
          name: 1,
          "projects._id": 1,
          "projects.name": 1,
        },
      },
    ]);

    // if (!clients) {
    //   res.status(404);
    //   throw new Error("No clients found");
    // }

    res.status(200).json({
      status: "Client fetched succesfully",
      data: clients,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get client by id
// @route   GET /client/:id
// @access  Private
const getClientById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $unwind: {
          path: "$createdBy",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          "createdBy.name": {
            $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
          },
          "createdBy._id": 1,
          createdAt: 1,
        },
      },
    ]);
    if (!client.length) {
      res.status(404);
      throw new Error("Client not found");
    }
    res.status(200).json({
      status: "Successfully fetched client",
      data: client[0],
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Edit client
// @route   PATCH /client/:id
// @access  Private
const editClientById = asyncHandler(async (req, res) => {
  try {
    const uni = await uniqueFinder(req.body.name, Client);
    if (!uni) {
      throw new Error("Client with same name exists.");
    }
    const client = await Client.findByIdAndUpdate(req.params.id, req.body);

    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }

    res.status(200).json({
      status: "Successfully Updated Client",
      data: client,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Delete client
// @route   DELETE /client/:id
// @access  Private
const deleteClientById = asyncHandler(async (req, res) => {
  try {
    const clientId = req.params.id;
    const client = await Client.findById(clientId);
    if (!client) {
      res.status(404);
      throw new Error("Client not found");
    }

    // set all client projects cliet = null ( no client )
    await Project.updateMany(
      { _id: { $in: client.projects } },
      { $set: { client: null } }
    );

    // delete the client
    await Client.findByIdAndRemove(clientId);

    res.status(202).json({
      status: "Successfully Deleted Client",
      data: client,
    });
  } catch (error) {
    throw new Error(error);
  }
});

export {
  createClient,
  getClients, //for projects page
  getClientById,
  editClientById,
  deleteClientById,
};
