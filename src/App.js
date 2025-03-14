import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://dnx817df-3939.uks1.devtunnels.ms/");

export default function App() {
    const [activePage, setActivePage] = useState("main");
    const [staffProfiles, setStaffProfiles] = useState([]);
    const [bluesProfiles, setBluesProfiles] = useState([]);
    const [greensProfiles, setGreensProfiles] = useState([]);
    const [guest, setGuest] = useState("");
    const [signedInData, setSignedInData] = useState(""); // New state to hold signed-in data

    useEffect(() => {
        const handleProfiles = (type, setter) => (data) => {
            if (Array.isArray(data)) {
                setter(data);
            } else {
                console.error(`${type} data is not an array`, data);
            }
        };

        socket.on("Staff", handleProfiles("Staff", setStaffProfiles));
        socket.on("Blues", handleProfiles("Blues", setBluesProfiles));
        socket.on("Greens", handleProfiles("Greens", setGreensProfiles));
        socket.on("all-signed-in", (data) => {
            setSignedInData(data); // Store the signed-in data from the server
        });

        return () => {
            socket.off("Staff", handleProfiles("Staff", setStaffProfiles));
            socket.off("Blues", handleProfiles("Blues", setBluesProfiles));
            socket.off("Greens", handleProfiles("Greens", setGreensProfiles));
            socket.off("all-signed-in", (data) => setSignedInData(data)); // Cleanup
        };
    }, []);

    const handleSignIn = (type, profile) => {
        socket.emit(`${type.toLowerCase()}-sign-in`, profile);
    };

    const handleCreateProfile = (type) => {
        const name = prompt(`Enter ${type} name:`);
        if (name) socket.emit(`new-${type.toLowerCase()}`, name);
    };

    const handleGuest = () => {
        if (guest) {
            socket.emit("guest", guest);
            setGuest(""); // Clear the input after submitting
        }
    };

    const handleShowAllSignedIn = () => {
        socket.emit("display-current-signed-in"); // Emit event to request signed-in data
    };

    const ProfileList = ({ type, profiles }) => (
        <>
            <div id="buttons">
                <button onClick={() => handleCreateProfile(type)}>Create {type} Profile</button>
                <button onClick={() => setActivePage("main")}>Back to Main</button>
            </div>
            <ul>
                {profiles.map((profile, index) => (
                    <li key={index}>
                        {profile.name}
                        {!profile.isSignedIn ? (
                            <button onClick={() => handleSignIn(type, profile)}>Sign in</button>
                        ) : (
                            <p>Signed in</p>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );

    return (
        <div>
            {activePage === "main" ? (
                <div id="mainPage">
                    <button onClick={() => { setActivePage("staff"); socket.emit("get-Staff"); }}>
                        Staff
                    </button>
                    <button onClick={() => { setActivePage("blues"); socket.emit("get-Blues"); }}>
                        Sea cadets
                    </button>
                    <button onClick={() => { setActivePage("greens"); socket.emit("get-Greens"); }}>
                        Marine cadets
                    </button>
                    <button onClick={() => { setActivePage("guests"); }}>
                        Guests
                    </button>
                    <button onClick={() => {handleShowAllSignedIn(); setActivePage("signed-in")}}>Show All Signed In</button>
                </div>
            ) : (
                <div>
                    {activePage === "staff" && <ProfileList type="Staff" profiles={staffProfiles} />}
                    {activePage === "blues" && <ProfileList type="Blues" profiles={bluesProfiles} />}
                    {activePage === "greens" && <ProfileList type="Greens" profiles={greensProfiles} />}
                    {activePage === "guests" && (
                        <>
                            <div id="buttons">
                                <button onClick={() => setActivePage("main")}>Back to Main</button>
                            </div>
                            <h2>Enter Guest Name:</h2>
                            <input
                                type="text"
                                value={guest}
                                onChange={(e) => setGuest(e.target.value)}
                                placeholder="Enter guest name"
                            />
                            <button onClick={handleGuest}>Submit</button>
                        </>
                    )}
                    {activePage === "signed-in" && signedInData && (
                        <div>
                            <h2>Signed-In Users:</h2>
                            <pre>{signedInData}</pre>
                            <button onClick={() => setActivePage("main")}>Back to Main</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
