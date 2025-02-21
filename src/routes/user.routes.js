import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").post(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/c/history").get(verifyJWT, getWatchHistory);




// Subscribe to a channel
router.post('/subscribe', async (req, res) => {
  const { subscriberId, subscribedChannelId } = req.body;

  try {
    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
      subscriberId,
      subscribedChannelId,
    });

    if (existingSubscription) {
      return res.status(400).json({ message: 'Already subscribed' });
    }

    // Create a new subscription
    const newSubscription = new Subscription({
      subscriberId,
      subscribedChannelId,
    });

    await newSubscription.save();
    return res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error subscribing', error });
  }
});

// Unsubscribe from a channel

router.delete('/unsubscribe', async (req, res) => {
  const { subscriberId, subscribedChannelId } = req.body;

  try {
    const result = await Subscription.deleteOne({
      subscriberId,
      subscribedChannelId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    return res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error unsubscribing', error });
  }
});

// Get all subscriptions of a user

router.get('/subscriptions/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const subscriptions = await Subscription.find({ subscriberId: userId })
      .populate('subscribedChannelId'); // Populate the subscribed channel details

    return res.status(200).json(subscriptions);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching subscriptions', error });
  }
});


//another way to subscribe to a channel and push teh subscribed channel id to the subscriber's subscriptions array


// // Subscribe to a channel
// router.post('/subscribe', asyncHandler(async (req, res) => {
//   const { channelId } = req.body; // The ID of the channel to subscribe to

//   if (!channelId) {
//     throw new ApiError(400, "Channel ID is required");
//   }

//   // Check if the channel exists
//   const channel = await User.findById(channelId);
//   if (!channel) {
//     throw new ApiError(404, "Channel does not exist");
//   }

//   // Check if the user is already subscribed
//   const existingSubscription = await Subscription.findOne({
//     subscriber: req.user._id, // The current user
//     channel: channelId, // The channel to subscribe to
//   });

//   if (existingSubscription) {
//     throw new ApiError(400, "You are already subscribed to this channel");
//   }

//   // Create a new subscription
//   const newSubscription = new Subscription({
//     subscriber: req.user._id, // The current user
//     channel: channelId, // The channel being subscribed to
//   });

//   await newSubscription.save();

//   // Push the subscription ID into the user's subscribedTo array
//   await User.findByIdAndUpdate(req.user._id, {
//     $push: { subscribedTo: newSubscription._id }, // Add to the current user's subscribedTo array
//   });

//   // Push the subscription ID into the channel's subscribers array
//   await User.findByIdAndUpdate(channelId, {
//     $push: { subscribers: newSubscription._id }, // Add to the channel's subscribers array
//   });

//   return res.status(201).json(
//     new ApiResponse(201, { message: "Subscribed successfully" }, "Subscription created")
//   );
// }));

module.exports = router;



export default router;
