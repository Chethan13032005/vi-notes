const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  text: {
    type: String,
    default: ""
  },
  keystrokes: {
    type: [
      {
        token: {
          type: String,
          enum: ["CHAR", "BACKSPACE", "SPACE", "ENTER", "TAB", "DELETE", "ARROW"],
          required: true
        },
        delayMs: {
          type: Number,
          min: 0,
          required: true
        },
        time: {
          type: Date,
          required: true
        }
      }
    ],
    default: []
  },
  pasteEvents: [
    {
      length: Number,
      time: Date,
      start: Number,
      end: Number
    }
  ],
  analysis: {
    score: {
      type: Number,
      default: 0
    },
    reasons: {
      type: [String],
      default: []
    },
    stats: {
      avgDelay: Number,
      delayVariance: Number,
      textLength: Number,
      keystrokeCount: Number,
      pasteCount: Number,
      textToKeystrokeRatio: Number
    },
    model: {
      used: {
        type: Boolean,
        default: false
      },
      provider: {
        type: String,
        default: "tensorflow-js-placeholder"
      },
      fallback: {
        type: Boolean,
        default: true
      }
    },
    segments: [
      {
        start: Number,
        end: Number,
        label: String,
        reason: String
      }
    ]
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  certificateId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  score: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Session", SessionSchema);
