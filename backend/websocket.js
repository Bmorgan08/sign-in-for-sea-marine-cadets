const express = require("express");
const fs = require("fs").promises;
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: 'https://bmorgan08.github.io',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.options('*', cors());



const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "https://bmorgan08.github.io",
    methods: ["GET", "POST"],
    credentials: true
  },
});



async function ensureFolderExists(date) {
  try {
    await fs.access(`./${date}`);
  } catch {
    await fs.mkdir(`./${date}`);
    await fs.copyFile("./Staff-Profiles.json", `./${date}/Staff-Profiles.json`);
    await fs.copyFile("./Blues-Profiles.json", `./${date}/Blues-Profiles.json`);
    await fs.copyFile("./Greens-Profiles.json", `./${date}/Greens-Profiles.json`);
    await fs.copyFile("./Juniors-Profiles.json", `./${date}/Juniors-Profiles.json`);
    await fs.writeFile(`./${date}/Guests.txt`, "");
  }
}

async function sendProfiles(type, socket) {
  try {
    const date = new Date().toISOString().split("T")[0]; // Get today's date
    await ensureFolderExists(date);
    const data = JSON.parse(await fs.readFile(`./${date}/${type}-Profiles.json`, "utf8"));
    socket.emit(type, data);
  } catch (error) {
    console.error(`Error handling get-${type}:`, error);
  }
}

async function createProfile(type, name, socket) {
  try {
      const date = new Date().toISOString().split("T")[0]; // Ensure the date is correctly defined

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


async function signIn(type, name, socket) {
  try {
    const date = new Date().toISOString().split("T")[0];
    const filePath = `./${date}/${type}-Profiles.json`;

    const fileData = await fs.readFile(filePath, "utf8");
    const profiles = JSON.parse(fileData);

    const targetName = name.name;
    const profile = profiles.find(p => p.name === targetName);

    if (profile) {
      profile.isSignedIn = true;
      await fs.writeFile(filePath, JSON.stringify(profiles, null, 2));
      sendProfiles(type, socket);
    } else {
      console.log(`Profile for ${targetName} not found.`);
    }
  } catch (error) {
    console.error("Error signing in profile:", error);
  }
}

async function displayCurrentSignedIn(socket) {
  const date = new Date().toISOString().split("T")[0]; // Get today's date

  try {
    const [staffProfiles, bluesProfiles, greensProfiles, juniorsProfiles, guests] = await Promise.all([
      fs.readFile(`./${date}/Staff-Profiles.json`, "utf8"),
      fs.readFile(`./${date}/Blues-Profiles.json`, "utf8"),
      fs.readFile(`./${date}/Greens-Profiles.json`, "utf8"),
      fs.readFile(`./${date}/Juniors-Profiles.json`, "utf8"),
      fs.readFile(`./${date}/Guests.txt`, "utf8")
    ]);

    const Staff = JSON.parse(staffProfiles);
    const Blues = JSON.parse(bluesProfiles);
    const Greens = JSON.parse(greensProfiles);
    const Juniors = JSON.parse(juniorsProfiles);

    let signedInStaff = "Staff:\n", signedInBlues = "Blues:\n", signedInGreens = "Marines:\n" , signedInJuniors = "Juniors:\n";

    // Iterate over profiles to get signed-in individuals
    Staff.forEach(person => {
      if (person.isSignedIn) {
        signedInStaff += `${person.name}\n`;
      }
    });

    Blues.forEach(person => {
      if (person.isSignedIn) {
        signedInBlues += `${person.name}\n`;
      }
    });

    Greens.forEach(person => {
      if (person.isSignedIn) {
        signedInGreens += `${person.name}\n`;
      }
    });

    Juniors.forEach(person => {
      if (person.isSignedIn) {
        signedInJuniors += `${person.name}\n`;
      }
    });

    let signedInGuests = `Guests:\n${guests}`;
    let allSignedIn = `${signedInStaff}\n${signedInBlues}\n${signedInGreens}\n${signedInJuniors}\n${signedInGuests}`;

    socket.emit("all-signed-in", allSignedIn);

  } catch (error) {
    console.error("Error fetching profiles or guests:", error);
  }
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("get-Staff", () => sendProfiles("Staff", socket));
  socket.on("get-Blues", () => sendProfiles("Blues", socket));
  socket.on("get-Greens", () => sendProfiles("Greens", socket));
  socket.on("get-Juniors", () => sendProfiles("Juniors", socket));

  socket.on("new-staff", (name) => createProfile("Staff", name, socket));
  socket.on("new-blues", (name) => createProfile("Blues", name, socket));
  socket.on("new-greens", (name) => createProfile("Greens", name, socket));
  socket.on("new-juniors", (name) => createProfile("Juniors", name, socket));

  socket.on("staff-sign-in", (name) => signIn("Staff", name, socket));
  socket.on("blues-sign-in", (name) => signIn("Blues", name, socket));
  socket.on("greens-sign-in", (name) => signIn("Greens", name, socket));
  socket.on("juniors-sign-in", (name) => signIn("Juniors", name, socket));

  socket.on("display-current-signed-in", () => displayCurrentSignedIn(socket));

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3939;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));