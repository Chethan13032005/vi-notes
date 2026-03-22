import mongoose, { Document, Schema, Types } from "mongoose";

export type KeystrokeToken =
  | "CHAR"
  | "BACKSPACE"
  | "SPACE"
  | "ENTER"
  | "TAB"
  | "DELETE"
  | "ARROW";

export interface IKeystrokeEvent {
  token: KeystrokeToken;
  delayMs: number;
  time: Date;
}

export interface IPasteEvent {
  length: number;
  time: Date;
  start?: number;
  end?: number;
}

export interface IAnalysisSegment {
  start: number;
  end: number;
  label: "normal" | "ai_suspect" | "copied";
  reason: string;
}

export interface IAnalysis {
  score: number;
  reasons: string[];
  stats?: {
    avgDelay?: number;
    delayVariance?: number;
    textLength?: number;
    keystrokeCount?: number;
    pasteCount?: number;
    textToKeystrokeRatio?: number;
  };
  model?: {
    used?: boolean;
    provider?: string;
    fallback?: boolean;
  };
  segments?: IAnalysisSegment[];
}

export interface ISession extends Document {
  userId: Types.ObjectId;
  text: string;
  keystrokes: IKeystrokeEvent[];
  pasteEvents: IPasteEvent[];
  analysis?: IAnalysis;
  isPublic: boolean;
  certificateId?: string;
  score: number;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
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
  pasteEvents: {
    type: [
      {
        length: Number,
        time: Date,
        start: Number,
        end: Number
      }
    ],
    default: []
  },
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
        label: {
          type: String,
          enum: ["normal", "ai_suspect", "copied"]
        },
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

const Session = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

export default Session;
