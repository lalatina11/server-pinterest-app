import type { Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { compareSync, hashSync } from "bcrypt-ts";
import * as dotenv from "dotenv";
import { google } from "googleapis";
import { otp, otpStore, transporter } from "../libs";
import { authorizationUrl, oAuth2Client } from "../libs/googleOauth";
import asyncHandler from "../middlewares/asyncHandler";
import User from "../models/user";
import type { UserType } from "../types";
import { userRepository } from "../repository/user";
import Follow from "../models/follow";
dotenv.config()

const userController = {
    register: asyncHandler(async (req: Request, res: Response) => {
        const { username, email, password, name } = req.body as UserType
        const usernameRegex = /^[a-zA-Z0-9]{6,}$/
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/

        if (!usernameRegex.test(username)) {
            throw new Error('username harus minimal 6 karakter dan hanya mengandung huruf dan angka')
        }
        if (!emailRegex.test(email)) {
            throw new Error('email tidak valid')
        }

        if (!password) throw new Error("Password diperlukan")
        if (password.length < 6) {
            throw new Error('password harus minimal 6 karakter')
        }
        if (name.length < 6) {
            throw new Error('nama harus minimal 6 karakter')
        }
        const existingUsername = await User.findOne({ username })

        if (existingUsername) throw new Error("Username sudah digunakan")

        const existingEmail = await User.findOne({ email })

        if (existingEmail) throw new Error("Email sudah digunakan")

        const hashedPassword = hashSync(password, 12)

        const user = await User.create({ username, email, name, password: hashedPassword });

        user.save()

        if (user) {
            otpStore.set(user.email, otp);

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Kode OTP untuk Candra Pin",
                text: `Kode verifikasi anda adalah: ${otp}`,
            });
        }


        res.status(201).json({ message: "Pendaftaran berhasil, kami telah mengirimkan kode verifikasi, cek kotak pesan email atau spam dan verifikasi", error: false })
    }),
    login: asyncHandler(async (req, res) => {
        const identifier = req.body.identifier as UserType['username'] | UserType["email"]
        const password = req.body.password as UserType["password"]

        if (!identifier) throw new Error("Silahkan masukkan Password")
        if (!password) throw new Error("Silahkan masukkan Password")

        const existingUser = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] })
        if (!existingUser) throw new Error("User tidak ditemukan")

        if (!existingUser.password) throw new Error("Sepertinya anda mendaftar dengan platform google atau github, silahkan login dengan platform tersebut")

        const validPassword = compareSync(password, existingUser.password)

        if (!validPassword) throw new Error("Password yang anda masukkan tidak valid")

        if (!existingUser.isAuthenticated) {
            otpStore.set(existingUser.email, otp);

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: existingUser.email,
                subject: "Kode OTP untuk Candra Pin",
                text: `Kode verifikasi anda adalah: ${otp}`,
            });
            return res.status(400).json({ message: "Akun anda belum terverifikasi, silahkan verifikasi terlebih dahulu, kami sudah mengirimkan kode verifikasi, cek kotak pesan email atau spam", isVerified: false, error: true })
        }

        const token = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY || "".toString(), {
            expiresIn: "1h",
        });

        res.cookie('token', token, {
            path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000
        }).status(200).send({ message: "Login berhasil!", user: existingUser.toObject(), error: false })
    }),
    verifyOtp: asyncHandler(async (req, res) => {
        const { identifier, otp } = req.body

        if (!identifier || !otp) {
            throw new Error("Email atau Username dan OTP diperlukan");
        }

        const existingUser = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] })
        if (!existingUser) throw new Error("User tidak ditemukan")

        const storedOtp = otpStore.get(existingUser.email);
        if (!storedOtp || storedOtp !== otp) {
            throw new Error("OTP Tidak valid");
        }

        const updatedUser = await User.updateOne({ $or: [{ username: identifier }, { email: identifier }] }, { $set: { isAuthenticated: true } })

        if (!updatedUser) throw new Error("Terjadi kesalahan, silahkan cobalagi")

        res.status(200).send({ message: "Verifikasi berhasil, Anda sekarang dapat login!", error: false })

    }),
    logout: asyncHandler(async (_, res) => {
        res.clearCookie("token")
        res.status(200).json({ message: "Logout Berhasil", error: false })
    }),
    getLoggedInUser: asyncHandler(async (req, res) => {
        const token = req.cookies.token

        const { user } = await userRepository.getUserByToken(token)

        const { password, ...allUserInfoWithoutPassword } = user
        res.status(200).send({ message: "ok", user: allUserInfoWithoutPassword, error: false })
    }),
    loginGithub: asyncHandler(async (_, res) => {
        res.redirect(
            `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}`
        );
    }),
    githubCallback: asyncHandler(async (req, res) => {
        const code = req.query.code
        if (!code) throw new Error("Code are required")

        // Exchange code for access token
        const tokenRes = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                }),
            }
        );

        const tokenData = await tokenRes.json() as { access_token: string };
        const accessToken = tokenData.access_token;

        if (!accessToken) throw new Error("Failed to get access token");

        // Get GitHub user data
        const userRes = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userFromGithub = await userRes.json() as { login: string, email: string, avatar_url: string };

        if (!userFromGithub) throw new Error("Failed to fetch user");

        const { login: username, email, avatar_url } = userFromGithub;

        if (!email || !username) {
            throw new Error("");
        }


        let user = await User.findOne({ email })

        const body = { username, email, name: username, avatar: avatar_url };

        if (!user) {
            user = await User.create({ ...body, isAuthenticated: true })
        }

        const { _id: userIdFromDB } = user.toObject();

        // Generate JWT token
        const token = jwt.sign(
            { id: userIdFromDB },
            process.env.SECRET_KEY || "".toString(),
            {
                expiresIn: "30m",
            }
        );
        // Set JWT cookie
        res.cookie('token', token, {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax"
        })

        const referer = req.headers.referer || req.headers.origin
        const frontendUrl = referer
            ? new URL(referer).origin
            : process.env.FRONTEND_URL || "http://localhost:5173";

        res.redirect(frontendUrl);

    }),
    loginGoogle: asyncHandler(async (_, res) => {
        res.redirect(authorizationUrl)
    }),
    googleCallback: asyncHandler(async (req, res) => {
        const { code } = req.query; // Directly get query parameter
        if (!code || code === "") {
            throw new Error("Code are required!");
        }
        const { tokens } = await oAuth2Client.getToken(code.toString() || "");
        oAuth2Client.setCredentials(tokens);
        const OAuth2 = google.oauth2({
            auth: oAuth2Client,
            version: "v2",
        });
        const { data } = await OAuth2.userinfo.get();

        if (!data) {
            throw new Error("Cannot getting user data!");
        }

        const { email, name } = data;

        if (!email || !name) {
            throw new Error("Email dan Username tidak didapatkan");
        }
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create(
                { email, username: name, isAuthenticated: true },
            );
        }

        const { id } = user;

        if (!user.isAuthenticated) {
            User.findByIdAndUpdate(id, { isAuthenticated: true })
        }

        const token = jwt.sign({ id }, process.env.SECRET_KEY || "".toString(), {
            expiresIn: "30m",
        });
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
            secure: !!process.env.NODE_ENV,
        });

        const referer = req.headers.referer || req.headers.origin;
        const frontendUrl = referer
            ? new URL(referer).origin
            : process.env.FRONTEND_URL || "http://localhost:5173";

        res.redirect(frontendUrl);
    }),
    getUserByUsername: asyncHandler(async (req, res) => {
        const { username } = req.params
        if (!username || username === "") throw new Error("Username are required!")
        const findUser = await User.findOne({ username })
        if (!findUser) throw new Error("User tidak ditemukan")
        const { password, ...userInfoWithoutPassword } = findUser.toObject()
        const followerCount = await Follow.countDocuments({ following: userInfoWithoutPassword._id })
        const followingCount = await Follow.countDocuments({ follower: userInfoWithoutPassword._id })
        const { token } = req.cookies
        if (!token) {
            return res.status(200).json({ message: "OK", user: userInfoWithoutPassword, followerCount, followingCount, isFollowing: false, error: false })
        }
        const { id, user } = await userRepository.getUserByToken(token)
        if (username === user.username) {
            return res.status(200).json({ message: "OK", user: userInfoWithoutPassword, followerCount, followingCount, isFollowing: false, error: false })
        }
        const isExist = await Follow.exists({ follower: id, following: userInfoWithoutPassword._id })
        res.status(200).json({ message: "OK", user: userInfoWithoutPassword, followerCount, followingCount, isFollowing: isExist ? true : false, error: false })
    }),
    followUser: asyncHandler(async (req, res) => {
        const { username } = req.params
        const { token } = req.cookies
        const user = await User.findOne({ username })
        const { id, user: currentUser } = await userRepository.getUserByToken(token)
        if (user?.username === currentUser.username) {
            throw new Error("You can not follow or following your self")
        }
        const isFollowing = await Follow.exists({
            follower: id,
            following: user?._id
        })
        if (isFollowing) {
            await Follow.deleteOne({
                follower: id,
                following: user?.id
            })
        } else {
            await Follow.create({
                follower: id,
                following: user?.id
            })
        }
        res.status(201).json({ message: "Successfull" })
    })
}
export default userController