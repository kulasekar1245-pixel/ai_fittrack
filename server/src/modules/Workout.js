const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
    {
        workoutName: {
            type: String,
            required: [true, 'Please enter a workout name'],
            trim: true,
    },
        category: {
            type: String,
            required: [true, 'Please enter a category'],
            enum:{
                values: ['Strength', 'Cardio', 'yoga', 'Pilates', 'CrossFit', 'HIIT', 'Other'],
                message: 'Please select a valid category',
            },
    },
    duration: {
        type: Number,
        required: [true, 'Please enter a duration in minutes'],
        min: [1, 'Please enter a duration greater than 0'],
    },
    caloriesBurned: {
        type: Number,
        required: [true, 'Please enter the number of calories burned'],
        min: [0, 'Please enter a value greater than 0'],
    },
    workoutDate: {
        type: Date,
        default: Date.now,
},
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
},
{
    timestamps: true,
}
);

module.exports = mongoose.model('Workout', workoutSchema);