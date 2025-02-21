import mongoose, {Schema} from "mongoose";


//.  This is the correct and standard way to model a many-to-many relationship like subscriptions
//here one user can have multiple subscriptions and one subscription can have multiple users so we have to create a new model for the subscription
//one to many relationship
//one user can have multiple subscriptions
//one subscription can have multiple users
//so we have to create a new model for the subscription

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, //one who is subscribing id
        ref: "User"
    },
    channel: {  //here chan
        type: Schema.Types.ObjectId, //one to whom 'subscriber' is subscribing id
        ref: "User"
    },


},
{
    timestamps: true
})


export const Subscription = mongoose.model("Subscription", subscriptionSchema)