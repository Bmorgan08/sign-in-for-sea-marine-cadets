const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs").promises;

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

async function ensureFolderExists(date) {
  try {
    await fs.access(`./${date}`);
  } catch {
    await fs.mkdir(`./${date}`);
    await fs.copyFile("./Staff-Profiles.json", `./${date}/Staff-Profiles.json`);
    await fs.copyFile("./Blues-Profiles.json", `./${date}/Blues-Profiles.json`);
    await fs.copyFile("./Greens-Profiles.json", `./${date}/Greens-Profiles.json`);
    await fs.writeFile(`./${date}/Guests.txt`, "");
  }
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  const date = new Date().toISOString().split("T")[0];

  async function sendProfiles(type) {
    try {
      await ensureFolderExists(date);
      const data = JSON.parse(await fs.readFile(`./${date}/${type}-Profiles.json`, "utf8"));
      socket.emit(type, data);
    } catch (error) {
      console.error(`Error handling get-${type}:`, error);
    }
  }

  socket.on("get-Staff", () => sendProfiles("Staff"));
  socket.on("get-Blues", () => sendProfiles("Blues"));
  socket.on("get-Greens", () => sendProfiles("Greens"));

  socket.on("guest", async (guest) => {
    await ensureFolderExists(date);
    await fs.appendFile(`./${date}/Guests.txt`, `${guest}\n`);
  });

  async function createProfile(type, name) {
    try {
        await ensureFolderExists(date);

        const filePath = `./${date}/${type}-Profiles.json`;
        const templatePath = `./${type}-Profiles.json`;

        // Read current profiles from today's file
        const profilesData = await fs.readFile(filePath, "utf8");

        let profiles = [];

        // If the file is empty or contains invalid data, initialize it as an empty array
        if (!profilesData || profilesData.trim() === "{}") {
            console.log(`${type} profiles file is empty. Initializing as empty array.`);
            profiles = [];
        } else {
            try {
                profiles = JSON.parse(profilesData);
                if (!Array.isArray(profiles)) {
                    console.error(`Profiles for ${type} is not an array. Fixing the data.`);
                    profiles = [];
                }
            } catch (error) {
                console.error(`Error parsing profiles for ${type}:`, error);
                profiles = []; // Default to an empty array if parsing fails
            }
        }

        // Add the new profile
        profiles.push({ name, isSignedIn: false });

        // Read the template profiles
        const templateData = await fs.readFile(templatePath, "utf8");
        let templateProfiles = [];

        try {
            templateProfiles = JSON.parse(templateData);
            if (!Array.isArray(templateProfiles)) {
                console.error(`Template profiles for ${type} is not an array. Fixing the data.`);
                templateProfiles = [];
            }
        } catch (error) {
            console.error(`Error parsing template profiles for ${type}:`, error);
            templateProfiles = []; // Default to an empty array if parsing fails
        }

        // Add the new profile to the template profiles
        templateProfiles.push({ name, isSignedIn: false });

        // Write updated profiles back to both files
        await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
        await fs.writeFile(templatePath, JSON.stringify(templateProfiles, null, 2));

        // Emit updated profiles to frontend
        socket.emit(type, profiles);

    } catch (error) {
        console.error(`Error creating profile for ${type}:`, error);
    }
  }

  async function signIn(type, name) {
    try {
        const filePath = `./${date}/${type}-Profiles.json`;

        // Read the file and parse it
        const fileData = await fs.readFile(filePath, "utf8");
        const profiles = JSON.parse(fileData);

        console.log("Profiles:", profiles, name.name); // Log profiles to check the structure

        // Ensure name is a string and trim spaces
        const targetName = name.name

        // Find the profile by name
        const profile = profiles.find(p => p.name === targetName);

        // If profile exists, set isSignedIn to true
        if (profile) {
            profile.isSignedIn = true;

            // Write the updated profiles back to the file
            await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));

            console.log(`${targetName} has been signed in.`);
            sendProfiles(type)
        } else {
            console.log(`Profile for ${targetName} not found.`);
        }
    } catch (error) {
        console.error("Error signing in profile:", error);
    }
  }



  socket.on("new-staff", (name) => createProfile("Staff", name));
  socket.on("new-blue", (name) => createProfile("Blues", name));
  socket.on("new-green", (name) => createProfile("Greens", name));

  socket.on("staff-sign-in", (name) => signIn("Staff", name))
  socket.on("blue-sign-in", (name) => signIn("Blues", name))
  socket.on("green-sign-in", (name) => signIn("Greens", name))

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3939, () => console.log("Server running on port 3939"));
