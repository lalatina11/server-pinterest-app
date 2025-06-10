import type mongoose from "mongoose";
import type { Document } from "mongoose";

export interface UserType extends Document {
    username: string;
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CanvasOption {
    height: number;
    orientation: string;
    size: string;
    backgroundColor: string;
}

type TextOption = {
    text: string;
    fontSize: number;
    color: string;
    top: number;
    left: number;
}

export interface PinType extends Document {
    media: string;
    width: number;
    height: number;
    title: string;
    description: string;
    link?: string;
    board?: mongoose.Schema.Types.ObjectId;
    tags?: string[];
    user: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    canvasOption: string
    textOption: string
}

export interface BoardType extends Document {
    title: string;
    user: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommentType extends Document {
    description: string;
    pin: mongoose.Schema.Types.ObjectId;
    user: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}